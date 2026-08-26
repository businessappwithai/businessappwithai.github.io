/**
 * Product analytics — one file, one vendored library, one funnel.
 *
 * The thing worth measuring on this site is not page views. It is how far a
 * visitor gets along a path that happens entirely in their own browser:
 *
 *     try_it_viewed → prompt_copied → model_uploaded → checker_passed
 *                   → generate_succeeded → app_ready → app_interaction
 *
 * Every one of those steps is a real function in `run-in-browser.js` or
 * `validator.js`, so the events are recorded where the step actually happens
 * rather than inferred from a click. Those two files are vendored from
 * `businessappwithai/app-with-ai-tanstack`, so their instrumentation is one
 * greppable line each — `window.awTrack?.(…)` — and every decision about what
 * that line means lives here, in a file this repository owns.
 *
 * `window.awTrack` is defined synchronously, before PostHog has loaded and
 * whether or not it ever does. It queues, and it is a no-op when analytics are
 * off. A caller never has to know which.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * SETUP — the one thing that has to be filled in
 *
 *   1. Create a project at https://posthog.com (or self-host).
 *   2. Project settings → Project API key. Paste it into `POSTHOG.key` below.
 *   3. If the project is in the EU cloud, change `POSTHOG.host` to
 *      https://eu.i.posthog.com.
 *
 * A project API key is a write-only, publish-safe credential — it is meant to
 * appear in client-side source, and PostHog documents it that way. Nothing else
 * here is a secret. Until the key is set, this file collects nothing at all.
 * ────────────────────────────────────────────────────────────────────────────
 */

(function () {
  "use strict";

  const POSTHOG = {
    /* ← paste the Project API key here (starts `phc_`) */
    key: "",
    host: "https://us.i.posthog.com",
  };

  /**
   * Where the vendored library is.
   *
   * Resolved against this script's own URL rather than the page's, because the
   * guide chapters sit one directory down and a fork sits at a different root
   * entirely. `document.currentScript` is exact while the script is executing,
   * which is now.
   */
  const SELF = document.currentScript && document.currentScript.src;
  const BUNDLE = SELF
    ? new URL("../vendor/posthog/array.full.no-external.js", SELF).href
    : null;

  /* --------------------------------------------------------------- surface */

  /**
   * Which page this is, in the vocabulary of the funnel rather than of the
   * filesystem. Registered as a super property, so every event carries it and
   * "how many people who copied the prompt on the home page finished a run"
   * is a question the data can answer without a join.
   */
  const SURFACES = [
    [/\/guide\/run-in-browser\.html$/, "demo"],
    [/\/guide\/run-real-stack\.html$/, "real-stack"],
    [/\/guide\/11-check-a-model\.html$/, "checker"],
    [/\/guide\//, "guide"],
    [/\/try-it-yourself\.html$/, "try-it-yourself"],
    [/\/contact\.html$/, "contact"],
    [/\/pricing\.html$/, "pricing"],
    [/(\/|\/index\.html)$/, "home"],
  ];

  function surfaceOf(pathname) {
    for (const [pattern, name] of SURFACES) if (pattern.test(pathname)) return name;
    return "other";
  }

  const SURFACE = surfaceOf(window.location.pathname);

  /**
   * Session replay is deliberately not on every page.
   *
   * The free allowance is five thousand recordings a month, and the home page
   * would spend it on people who bounced. These four are the pages where
   * something happens that a recording explains — a reader stuck at the
   * dropzone, or watching a checker report they do not understand, is exactly
   * what this is for. Widening the list means budgeting for it.
   */
  const REPLAY_SURFACES = ["try-it-yourself", "demo", "checker", "real-stack"];

  /* ---------------------------------------------------------------- opt-out */

  /**
   * Three ways to not be measured, in the order they are checked.
   *
   *   1. `?analytics=off` in the URL, remembered afterwards (`…=on` forgets it).
   *   2. Global Privacy Control, which is a legal signal in several
   *      jurisdictions and is honoured here without qualification.
   *   3. Do Not Track — handed to PostHog as `respect_dnt` as well, but checked
   *      here too so that the library is never even fetched.
   *
   * A visitor who has opted out costs one localStorage read and no network.
   */
  const STORAGE_KEY = "appwithai:analytics";

  function optedOut() {
    let stored = null;
    try {
      const asked = new URLSearchParams(window.location.search).get("analytics");
      if (asked === "off") window.localStorage.setItem(STORAGE_KEY, "off");
      if (asked === "on") window.localStorage.removeItem(STORAGE_KEY);
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      /* Private windows refuse storage. That is not a reason to track someone. */
    }
    if (stored === "off") return true;
    if (navigator.globalPrivacyControl) return true;
    if (navigator.doNotTrack === "1" || window.doNotTrack === "1") return true;
    return false;
  }

  const ENABLED = Boolean(POSTHOG.key) && Boolean(BUNDLE) && !optedOut();

  /* ------------------------------------------------------------------ track */

  const queue = [];
  let loaded = false;

  /**
   * Record one step of the funnel.
   *
   * Safe to call before the library has loaded, after it has failed to load,
   * and when analytics are off — which is why the vendored files can call it
   * unconditionally. Nothing here throws: an analytics failure must never be
   * the reason a reader's application did not generate.
   */
  function track(event, properties) {
    const props = Object.assign({ surface: SURFACE }, properties || {});

    /* app_interaction is timed from the moment the application answered. */
    if (event === "app_ready") armFrameWatch();

    if (!ENABLED) return;
    try {
      if (loaded && window.posthog) window.posthog.capture(event, props);
      else queue.push([event, props]);
    } catch (error) {
      /* ignored, deliberately — see above */
    }
  }

  window.awTrack = track;

  /* ------------------------------------------------------------------- load */

  function init() {
    const posthog = window.posthog;
    if (!posthog) return;

    posthog.init(POSTHOG.key, {
      api_host: POSTHOG.host,
      /*
       * The library is served from this origin, and this stops it fetching any
       * further executable code — the replay recorder, surveys, the toolbar —
       * from PostHog's CDN. It is not the same as making no request: on init
       * the library still asks `us-assets.i.posthog.com` for this project's
       * configuration, and `api_host` for feature flags. Measured, not assumed.
       */
      disable_external_dependency_loading: true,
      /* A person record only once someone identifies — anonymous readers are
         counted as events, which is what the funnel needs and is far cheaper. */
      person_profiles: "identified_only",
      respect_dnt: true,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: !REPLAY_SURFACES.includes(SURFACE),
      session_recording: {
        /*
         * A reader pastes their own business model into this site — entity
         * names, field names, the shape of their company. A replay that
         * recorded it would be collecting someone else's proprietary data as
         * a side effect of measuring a funnel. Every input is masked, and
         * anything carrying `ph-no-capture` (the model editor, the preview,
         * the generated application's frame) is blanked out entirely.
         */
        maskAllInputs: true,
        maskTextSelector: ".ph-no-capture, .model-editor, pre, code, textarea",
        blockSelector: "iframe",
      },
      loaded: function () {
        posthog.register({ surface: SURFACE, site_version: "1" });
        loaded = true;
        for (const [event, props] of queue) posthog.capture(event, props);
        queue.length = 0;
      },
    });
  }

  if (ENABLED) {
    const script = document.createElement("script");
    script.src = BUNDLE;
    script.async = true;
    script.onload = init;
    script.onerror = function () {
      /* Blocked by an extension, or a fork that did not copy assets/vendor.
         Either way the queue is dropped and the page is untouched. */
      queue.length = 0;
    };
    document.head.appendChild(script);
  }

  /* ------------------------------------------------- events this file owns */

  /**
   * The rest of the funnel is recorded inside `run-in-browser.js` and
   * `validator.js`, where the work happens. What is left is what can be
   * observed from any page without touching anything: arriving, copying the
   * prompt, leaving for GitHub or the guide, and — on the demo page — actually
   * putting a cursor into the generated application.
   */
  document.addEventListener("DOMContentLoaded", function () {
    /* try_it_viewed — the top of the funnel, wherever the reader met it. */
    if (SURFACE === "try-it-yourself" || SURFACE === "demo") {
      track("try_it_viewed", { placement: SURFACE === "demo" ? "demo_page" : "page" });
    } else {
      /* On the home page the section is far below the fold, so arriving at the
         page is not the same as having seen it. Fired when it is on screen. */
      const section = document.getElementById("try-it-yourself");
      if (section && "IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
          function (entries) {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              observer.disconnect();
              track("try_it_viewed", { placement: "home_section" });
            }
          },
          { threshold: 0.25 }
        );
        observer.observe(section);
      }
    }

    watchFrame();
  });

  /*
   * Delegated, so nothing has to be re-bound and no other file has to know.
   * `main.js` keeps its own [data-copy] handler — that one does the copying,
   * this one only notices it happened.
   */
  document.addEventListener("click", function (event) {
    const copy = event.target.closest && event.target.closest("[data-copy]");
    if (copy) {
      track("prompt_copied", { target: copy.dataset.copy });
      return;
    }

    const link = event.target.closest && event.target.closest("a[href]");
    if (!link) return;

    const href = link.getAttribute("href") || "";
    if (/github\.com/.test(href)) {
      track("github_clicked", { href: href, text: (link.textContent || "").trim().slice(0, 80) });
      return;
    }
    /* The guide is the other thing a reader leaves the funnel for, and the one
       we would rather they left for. Chapter 09 is the demo, not the guide. */
    if (/(^|\/)guide\//.test(href) && !/run-in-browser/.test(href)) {
      track("guide_clicked", { href: href });
    }
  });

  document.addEventListener("submit", function (event) {
    if (event.target && event.target.id === "contactForm") track("contact_submitted");
  });

  /* --------------------------------------------------- app_interaction */

  /**
   * Did the reader actually use the application they generated?
   *
   * That is the last step of the funnel and the only one that cannot be
   * instrumented directly: the generated app is served by a Service Worker
   * into an iframe, and adding tracking to it would mean shipping analytics
   * inside every application this site generates — which is not this site's to
   * do, and would follow the download onto someone else's server.
   *
   * So it is inferred, once per run, from the one thing a parent document can
   * legitimately observe: the window losing focus while the frame is the
   * active element. That means a click or a keystroke landed inside. It cannot
   * see what was clicked, and is not meant to.
   */
  let frameReadyAt = 0;
  let frameSeen = true;

  function armFrameWatch() {
    frameReadyAt = Date.now();
    frameSeen = false;
  }

  function watchFrame() {
    if (!document.getElementById("frame")) return;
    window.addEventListener("blur", function () {
      /* A tick, so `document.activeElement` has settled on the frame. */
      window.setTimeout(function () {
        if (frameSeen) return;
        if (document.activeElement !== document.getElementById("frame")) return;
        frameSeen = true;
        track("app_interaction", { time_to_interaction_ms: Date.now() - frameReadyAt });
      }, 0);
    });
  }
})();
