/**
 * The model assistant — change an .eml.mmd with your own API key.
 *
 * This site is static. There is no backend here, so there is no CopilotKit
 * runtime and no Mastra server to talk to: both are servers, and GitHub Pages
 * runs none. What this page does instead is the one shape that *is* available
 * to a static site — the visitor supplies a key, and the browser calls the
 * model provider directly.
 *
 * That is a deliberate trade and the page says so out loud. The key never
 * reaches this origin: it is held in localStorage and attached to a request
 * that goes straight to api.anthropic.com or api.openai.com. Nothing here
 * proxies it, logs it, or sends it anywhere else — and `analytics.js` is
 * configured never to record a key, a model, or a prompt (see privacy.html).
 *
 * The loop is the same one `llmtextenhancement.txt` describes, run here rather
 * than pasted into somebody else's chat window:
 *
 *   1. the published enhancement protocol becomes the system prompt
 *   2. the visitor's current .mmd and their instruction become the user turn
 *   3. the reply is stripped to its Mermaid and checked with `guide/checker.js`
 *   4. a download is offered only when that check finds no errors
 *
 * Step 4 is the point. Any chat window can hand back a model; the thing this
 * site has that they do not is the real checker, so a result that would not
 * generate is caught here rather than three steps later.
 */

import { check, formatReport, LANGUAGE_VERSION } from "../../guide/checker.js";
import { checkAndFix } from "../../guide/fixer.js";

/* ------------------------------------------------------------------ *
 * Providers
 *
 * Two wire formats, one shape. Each entry owns its endpoint, its headers
 * and how it reads a streamed delta, so adding a third provider is one
 * object rather than a branch in four places.
 *
 * `browserHeader` is Anthropic's `anthropic-dangerous-direct-browser-access`.
 * The name is the warning: it opts out of the CORS block that normally stops
 * a browser sending an API key to that endpoint. It is correct here — the
 * visitor is spending their own key, knowingly, on a page that says so — and
 * it would be wrong in anything that handled somebody else's key.
 * ------------------------------------------------------------------ */

const PROVIDERS = {
  claude: {
    label: "Claude",
    /* "Get a OpenAI key" read as a typo in the one place the page asks
       somebody to go and fetch a credential. */
    article: "a",
    keyPrefix: "sk-ant-",
    keyHint: "starts sk-ant-",
    endpoint: "https://api.anthropic.com/v1/messages",
    console: "https://console.anthropic.com/settings/keys",
    /* The exact model id. Not a date-suffixed variant — those are a different
       thing and this one is complete as written. */
    model: "claude-opus-5",
    modelLabel: "Claude Opus 5",
    headers: (key) => ({
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    }),
    body: (system, user) => ({
      model: "claude-opus-5",
      max_tokens: 64000,
      stream: true,
      /* Thinking is on by default on this model; `adaptive` is explicit about
         it. A whole-model rewrite is exactly the kind of work it helps. */
      thinking: { type: "adaptive" },
      /* The protocol is ~34K tokens and identical on every request, so it is
         the stable prefix: cached, it costs a tenth as much to re-send. The
         volatile half — the visitor's model and instruction — sits after it,
         which is the only ordering that lets the cache hit. */
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    }),
    /* Anthropic streams text as `content_block_delta` with a `text_delta`.
       Thinking blocks arrive on the same channel with a different delta type,
       and are deliberately ignored: this page wants the model, not the
       reasoning about it. */
    readDelta: (event) =>
      event.type === "content_block_delta" && event.delta?.type === "text_delta"
        ? event.delta.text
        : "",
    readError: (event) => (event.type === "error" ? event.error?.message : null),
    readUsage: (event) => (event.type === "message_start" ? event.message?.usage : null),
    /* A refusal arrives as a 200 with a stop_reason, not as an HTTP error, so
       nothing throws and the loop would otherwise end with empty output. */
    readStop: (event) =>
      event.type === "message_delta" ? event.delta?.stop_reason : null,
  },

  openai: {
    label: "OpenAI",
    article: "an",
    keyPrefix: "sk-",
    keyHint: "starts sk-",
    endpoint: "https://api.openai.com/v1/chat/completions",
    console: "https://platform.openai.com/api-keys",
    model: "gpt-4o",
    modelLabel: "GPT-4o",
    headers: (key) => ({
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    }),
    body: (system, user) => ({
      model: "gpt-4o",
      max_tokens: 16000,
      stream: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    readDelta: (event) => event.choices?.[0]?.delta?.content ?? "",
    readError: (event) => event.error?.message ?? null,
    readUsage: () => null,
    readStop: (event) => event.choices?.[0]?.finish_reason ?? null,
  },
};

/* The protocol document this page runs. `llmtextenhancement.txt` is the
   enhancement edition — start from a model that exists, change what was asked,
   keep everything else, and prove it — which is precisely this page's job. The
   authoring edition would rewrite the visitor's model instead, which is the
   failure that edition exists to prevent. Same origin, so no egress to fetch it. */
const PROTOCOL_URL = "llmtextenhancement.txt";

const KEY_STORAGE = "awai.assistant.key";
const PROVIDER_STORAGE = "awai.assistant.provider";

const state = {
  provider: "claude",
  source: "",
  label: "your model",
  result: "",
  protocol: null,
  busy: false,
  abort: null,
};

const $ = (id) => document.getElementById(id);

/* localStorage throws in a private window and in a browser with site data
   blocked, and returns null where nothing was stored. Neither is an error
   worth showing anybody — the page works without it, the key just is not
   remembered — so every access goes through these. */
const store = {
  get(k) {
    try {
      return window.localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      window.localStorage.setItem(k, v);
      return true;
    } catch {
      return false;
    }
  },
  remove(k) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* nothing to do: it was never stored */
    }
  },
};

const escapeHtml = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

/* ------------------------------------------------------------------ *
 * The reply is prose around a model, and only the model is wanted.
 *
 * The protocol asks for the whole file and nothing else, and a good reply
 * obeys. A reply that does not is still usually recoverable: the model sits in
 * a fenced block. Preferring the fence, then falling back to the first `%%` or
 * diagram keyword, recovers both shapes without ever *inventing* content —
 * if neither matches, this returns the text unchanged and the checker reports
 * what it really is (EML004, prose rather than a model), which is the honest
 * outcome and the one chapter 11 already explains.
 * ------------------------------------------------------------------ */
function extractModel(reply) {
  const fenced = reply.match(/```(?:mermaid|mmd|eml)?\s*\n([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();

  const start = reply.search(/^\s*(%%|erDiagram|flowchart|stateDiagram-v2)/m);
  return start === -1 ? reply.trim() : reply.slice(start).trim();
}

/* ------------------------------------------------------------------ *
 * Streaming
 *
 * Both providers speak SSE over `fetch`, so one reader serves both. The
 * buffering matters: a chunk boundary can land mid-event, so lines are only
 * consumed up to the last newline and the remainder is carried forward. Doing
 * it per-chunk instead drops a delta every few hundred tokens, which reads as
 * a model that silently mangles long files.
 * ------------------------------------------------------------------ */
async function streamCompletion(provider, key, system, user, onText) {
  const controller = new AbortController();
  state.abort = controller;

  let response;
  try {
    response = await fetch(provider.endpoint, {
      method: "POST",
      headers: provider.headers(key),
      body: JSON.stringify(provider.body(system, user)),
      signal: controller.signal,
    });
  } catch (error) {
    /* A CORS refusal, a blocked request and a dropped connection are all a
       TypeError here with no status to read. Say which of those it might be
       rather than printing "Failed to fetch", which tells nobody anything. */
    throw new Error(
      `Could not reach ${provider.label}. The request never got a response — ` +
        `that is a network, proxy or extension refusal rather than a bad key. ` +
        `(${error.message})`
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    let detail = body.slice(0, 400);
    try {
      detail = JSON.parse(body).error?.message ?? detail;
    } catch {
      /* not JSON; the raw body is what there is */
    }
    if (response.status === 401) {
      throw new Error(`${provider.label} rejected the key (401). ${detail}`);
    }
    if (response.status === 429) {
      throw new Error(
        `${provider.label} is rate-limiting this key (429). Wait and try again. ${detail}`
      );
    }
    throw new Error(`${provider.label} answered ${response.status}. ${detail}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let usage = null;
  let stop = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const cut = buffer.lastIndexOf("\n");
    if (cut === -1) continue;

    const lines = buffer.slice(0, cut).split("\n");
    buffer = buffer.slice(cut + 1);

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      let event;
      try {
        event = JSON.parse(payload);
      } catch {
        continue; /* a keep-alive or a partial frame; the next read completes it */
      }

      const failed = provider.readError(event);
      if (failed) throw new Error(`${provider.label}: ${failed}`);

      usage = provider.readUsage(event) ?? usage;
      stop = provider.readStop(event) ?? stop;

      const delta = provider.readDelta(event);
      if (delta) {
        text += delta;
        onText(text);
      }
    }
  }

  state.abort = null;
  return { text, usage, stop };
}

/* ------------------------------------------------------------------ *
 * The run
 * ------------------------------------------------------------------ */

function setBusy(busy, note) {
  state.busy = busy;
  $("aia-run").disabled = busy;
  $("aia-stop").hidden = !busy;
  $("aia-status").textContent = note ?? "";
  $("aia-status").className = busy ? "aia-status aia-status-busy" : "aia-status";
}

function report(message, kind = "error") {
  const box = $("aia-message");
  box.hidden = false;
  box.className = `aia-message aia-message-${kind}`;
  box.innerHTML = escapeHtml(message);
}

function clearReport() {
  $("aia-message").hidden = true;
}

async function loadProtocol() {
  if (state.protocol) return state.protocol;
  const response = await fetch(PROTOCOL_URL);
  if (!response.ok) {
    throw new Error(
      `Could not load ${PROTOCOL_URL} from this site (${response.status}). ` +
        `That is this page's own file, so this is a problem here rather than with your key.`
    );
  }
  state.protocol = await response.text();
  return state.protocol;
}

async function run() {
  clearReport();

  const provider = PROVIDERS[state.provider];
  const key = $("aia-key").value.trim();
  const instruction = $("aia-instruction").value.trim();

  if (!key) return report("Add your API key first — it stays in this browser.");
  if (!state.source.trim()) return report("Load or paste the .mmd model you want changed.");
  if (!instruction) return report("Say what you want changed.");

  setBusy(true, "Reading the enhancement protocol…");

  try {
    const protocol = await loadProtocol();

    setBusy(true, `Asking ${provider.modelLabel} to make the change…`);
    window.awTrack?.("assistant_started", {
      provider: state.provider,
      model_bytes: state.source.length,
    });

    const user =
      `Here is my current EML model. Apply the change I describe and hand back ` +
      `the whole file, exactly as the protocol above requires.\n\n` +
      `## The change I want\n\n${instruction}\n\n` +
      `## My current model\n\n\`\`\`mermaid\n${state.source}\n\`\`\``;

    const started = Date.now();
    const { text, usage, stop } = await streamCompletion(
      provider,
      key,
      protocol,
      user,
      (partial) => {
        $("aia-output").textContent = partial;
        $("aia-output-wrap").hidden = false;
      }
    );

    if (stop === "refusal") {
      throw new Error(
        `${provider.label} declined this request. Nothing was changed — ` +
          `rephrase the instruction and try again.`
      );
    }
    if (!text.trim()) {
      throw new Error(`${provider.label} returned nothing. Try again.`);
    }

    state.result = extractModel(text);
    $("aia-output").textContent = state.result;

    /* The reason this page exists rather than a chat window: the result is put
       through the real checker before anybody is offered it. */
    setBusy(true, "Checking the result…");
    const verdict = check(state.result);
    renderVerdict(verdict, usage, Date.now() - started);

    window.awTrack?.("assistant_completed", {
      provider: state.provider,
      duration_ms: Date.now() - started,
      errors: verdict.counts.errors,
      warnings: verdict.counts.warnings,
    });
  } catch (error) {
    report(error.message);
    window.awTrack?.("assistant_failed", { provider: state.provider });
  } finally {
    setBusy(false);
  }
}

function renderVerdict(verdict, usage, ms) {
  /* `check` returns { ok, counts: { errors, warnings, infos }, issues, ... } —
     the counts are nested, and `ok` is already the "would the generator take
     this" verdict, so read those rather than inventing a second reading of the
     same fact. */
  const { errors, warnings } = verdict.counts;
  const clean = verdict.ok;
  const lines = [];

  lines.push(
    `<p class="aia-verdict ${clean ? "aia-verdict-ok" : "aia-verdict-bad"}">` +
      `${errors === 0 ? "No errors" : `${errors} error${errors === 1 ? "" : "s"}`} · ` +
      `${warnings} warning${warnings === 1 ? "" : "s"} · EML ${LANGUAGE_VERSION}</p>`
  );

  if (!clean) {
    lines.push(
      `<p class="text-sm">The model that came back would not generate. The report is below; ` +
        `<strong>Repair what can be repaired</strong> applies the auto-fixable codes, and ` +
        `anything left is for you or another round of instructions.</p>`
    );
  }

  lines.push(
    `<pre class="aia-report"><code>${escapeHtml(formatReport(verdict))}</code></pre>`
  );

  if (usage) {
    const cached = usage.cache_read_input_tokens ?? 0;
    lines.push(
      `<p class="text-sm text-muted">` +
        `${usage.input_tokens ?? 0} input tokens` +
        (cached ? ` (${cached} read from cache)` : "") +
        ` · ${Math.round(ms / 100) / 10}s</p>`
    );
  }

  $("aia-verdict-box").innerHTML = lines.join("\n");
  $("aia-verdict-box").hidden = false;
  $("aia-download").hidden = !clean;
  $("aia-repair").hidden = clean;
}

/* Chapter 11's rule, applied here: a download is offered only for a model the
   generator would accept. Handing somebody a file that fails is the failure
   this page exists to catch. */
function download() {
  const name =
    (state.result.match(/^\s*%%meta\s+name:\s*(.+)$/m)?.[1] ?? "model")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "model";

  const blob = new Blob([state.result], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.eml.mmd`;
  a.click();
  URL.revokeObjectURL(url);
  window.awTrack?.("assistant_downloaded", { provider: state.provider });
}

function repair() {
  const fixed = checkAndFix(state.result);
  state.result = fixed.source;
  $("aia-output").textContent = state.result;
  renderVerdict(check(state.result), null, 0);
}

/* ------------------------------------------------------------------ *
 * Wiring
 * ------------------------------------------------------------------ */

function selectProvider(name) {
  state.provider = name;
  const provider = PROVIDERS[name];
  store.set(PROVIDER_STORAGE, name);

  for (const button of document.querySelectorAll("[data-provider]")) {
    const active = button.dataset.provider === name;
    button.classList.toggle("aia-provider-active", active);
    button.setAttribute("aria-pressed", String(active));
  }

  $("aia-key").placeholder = provider.keyHint;
  $("aia-key-console").href = provider.console;
  $("aia-key-console").textContent = `Get ${provider.article} ${provider.label} key`;
  $("aia-model-name").textContent = provider.modelLabel;
}

function setSource(text, label) {
  state.source = text;
  state.label = label;
  $("aia-source").value = text;
  $("aia-source-label").textContent = `${label} · ${text.split("\n").length} lines`;
}

export function init() {
  selectProvider(store.get(PROVIDER_STORAGE) ?? "claude");

  const saved = store.get(KEY_STORAGE);
  if (saved) {
    $("aia-key").value = saved;
    $("aia-key-remember").checked = true;
    $("aia-key-saved").hidden = false;
  }

  for (const button of document.querySelectorAll("[data-provider]")) {
    button.addEventListener("click", () => selectProvider(button.dataset.provider));
  }

  /* Remembering has to follow the field, not only the moment the box is ticked.
     Ticking first and pasting after is the obvious order, and it used to store
     the empty string the field held at that instant — then say "Stored in this
     browser only" and hand back nothing on the next visit. A page that makes a
     false claim about a credential is worse than one that never offered to
     keep it. */
  const rememberKey = () => {
    if (!$("aia-key-remember").checked) return;
    const ok = store.set(KEY_STORAGE, $("aia-key").value.trim());
    $("aia-key-saved").hidden = !ok;
    if (!ok) {
      $("aia-key-remember").checked = false;
      report(
        "This browser will not let the page store anything — a private window, " +
          "or site data blocked. The key still works for this visit; it just will " +
          "not be here next time.",
        "note"
      );
    }
  };

  $("aia-key").addEventListener("input", rememberKey);

  $("aia-key-remember").addEventListener("change", (event) => {
    if (event.target.checked) {
      rememberKey();
    } else {
      store.remove(KEY_STORAGE);
      $("aia-key-saved").hidden = true;
    }
  });

  $("aia-key-forget").addEventListener("click", () => {
    store.remove(KEY_STORAGE);
    $("aia-key").value = "";
    $("aia-key-remember").checked = false;
    $("aia-key-saved").hidden = true;
    report("The key is gone from this browser.", "note");
  });

  $("aia-source").addEventListener("input", (event) =>
    setSource(event.target.value, "your model")
  );

  $("aia-file").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSource(await file.text(), file.name);
  });

  for (const button of document.querySelectorAll("[data-example]")) {
    button.addEventListener("click", async () => {
      const key = button.dataset.example;
      setBusy(true, "Loading…");
      try {
        const response = await fetch(`guide/models/${key}.eml.mmd`);
        if (!response.ok) throw new Error(`${key} did not load (${response.status})`);
        setSource(await response.text(), `${key}.eml.mmd`);
        clearReport();
      } catch (error) {
        report(error.message);
      } finally {
        setBusy(false);
      }
    });
  }

  $("aia-run").addEventListener("click", run);
  $("aia-stop").addEventListener("click", () => state.abort?.abort());
  $("aia-download").addEventListener("click", download);
  $("aia-repair").addEventListener("click", repair);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
