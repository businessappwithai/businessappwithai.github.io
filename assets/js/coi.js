/**
 * Ask the browser for cross-origin isolation, then get out of the way.
 *
 * Loaded first on chapter 10 and nowhere else. It registers `guide/coi-sw.js`,
 * which puts the two isolation headers on this document, and reloads once so the
 * page comes back through the worker. On the second visit the worker is already
 * in control, `crossOriginIsolated` is true on arrival, and this file does
 * nothing at all.
 *
 * A classic script rather than a module, and first in the head, so the reload
 * happens before the megabyte of generator behind it is worth downloading.
 *
 * Every failure here is survivable. If the worker cannot be registered — a
 * private window in some browsers, an enterprise policy, an old engine — the
 * page still loads, still reads and checks a model, and says plainly on arrival
 * that the boot step needs isolation it did not get. That is why the reload is
 * counted: a page that cannot be isolated must fail once and stop, not reload
 * forever trying.
 */
(function () {
  "use strict";

  var KEY = "appwithai:coi-reloads";

  if (window.crossOriginIsolated) return;
  if (!window.isSecureContext || !("serviceWorker" in navigator)) return;

  var reloads = 0;
  try {
    reloads = parseInt(sessionStorage.getItem(KEY) || "0", 10) || 0;
  } catch (error) {
    // Storage is blocked in some privacy modes. Without a counter the safe
    // choice is not to reload at all.
    return;
  }
  if (reloads >= 2) return;

  navigator.serviceWorker
    .register("coi-sw.js", { scope: "./" })
    .then(function (registration) {
      // Already registered from an earlier visit but not yet controlling this
      // load: one reload puts it in charge.
      if (registration.active && !navigator.serviceWorker.controller) return reload();

      var pending = registration.installing || registration.waiting;
      if (!pending) return;
      pending.addEventListener("statechange", function () {
        if (pending.state === "activated") reload();
      });
    })
    .catch(function () {
      // Registration refused. The page's own environment check explains it.
    });

  function reload() {
    try {
      sessionStorage.setItem(KEY, String(reloads + 1));
    } catch (error) {
      return;
    }
    window.location.reload();
  }
})();
