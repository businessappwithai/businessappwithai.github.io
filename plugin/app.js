/**
 * The AppWithAI panel: open an .mmd, check it, audit it, repair it, save it —
 * all in this page. Used standalone at https://www.appwithai.org/plugin/ and as
 * the ChatGPT app's panel.
 *
 * THE RULE: the model never leaves the user's ChatGPT environment. This file
 * makes exactly one network request — a GET of a download URL ChatGPT itself
 * issued for a file the user picked — and talks to nothing else but its host
 * window (ChatGPT) through postMessage. Nothing here sends a model, a file name,
 * an entity name or a diagnostic to AppWithAI. scripts/check-plugin.mjs fails
 * CI if that stops being true.
 *
 * Three ways a model arrives, every one feature-detected, never assumed:
 *  1. ChatGPT opens a .mmd with this app (file entrypoint): the MCP Apps bridge
 *     delivers `ui/notifications/tool-input` with `{ file: { name, resourceUri } }`
 *     and the panel reads it with `resources/read`, which ChatGPT answers itself;
 *     saving goes back through `openai/resources/write`.
 *  2. ChatGPT's file library: window.openai.selectFiles() → [{ fileId, fileName }],
 *     getFileDownloadUrl({ fileId }) → { downloadUrl }, uploadFile(file, { library }).
 *  3. Anywhere: Open .mmd…, drop a file, or paste.
 */
import { analyze, LANGUAGE_VERSION } from "./appwithai-eml.js";
import { MANIFEST } from "./manifest.js";

const $ = (id) => document.getElementById(id);
const oa = window.openai;
let current = { name: "model.mmd", source: "", result: null, resource: null };

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const status = (text) => { $("status").textContent = text; };

/* ── The MCP Apps bridge to ChatGPT (postMessage JSON-RPC to the host) ── */

const inFrame = window.parent && window.parent !== window;
const pending = new Map();
let nextId = 1;
let hostCapabilities = {};

function request(method, params) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
    setTimeout(() => { if (pending.delete(id)) reject(new Error(`${method}: no answer from the host`)); }, 15000);
  });
}
const notify = (method, params) => window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");

window.addEventListener("message", (event) => {
  if (!inFrame || event.source !== window.parent) return; // only our host may talk to us
  const msg = event.data;
  if (!msg || msg.jsonrpc !== "2.0") return;
  if (msg.id !== undefined && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message ?? "host error")) : resolve(msg.result);
    return;
  }
  if (msg.method === "ui/notifications/tool-input") {
    const file = msg.params?.arguments?.file;
    if (file?.resourceUri) openHostResource(file).catch((e) => status(`Could not open ${file.name ?? "the file"}: ${e.message}`));
  }
});

async function connectToHost() {
  if (!inFrame) return;
  try {
    const result = await request("ui/initialize", {
      protocolVersion: "2025-06-18",
      appInfo: { name: "appwithai", version: MANIFEST.languageVersion },
      appCapabilities: {},
    });
    hostCapabilities = result?.hostCapabilities ?? {};
    notify("ui/notifications/initialized", {});
  } catch {
    /* Not an MCP Apps host (or an older one): the window.openai paths and the
       local ones below still work. */
  }
}

async function openHostResource(file) {
  const result = await request("resources/read", { uri: file.resourceUri });
  const content = result?.contents?.[0] ?? {};
  const text = typeof content.text === "string" ? content.text
    : typeof content.blob === "string" ? new TextDecoder().decode(Uint8Array.from(atob(content.blob), (c) => c.charCodeAt(0)))
    : null;
  if (text === null) throw new Error("the host returned no text");
  current.resource = { uri: file.resourceUri, etag: content._meta?.etag ?? content._meta?.["openai/etag"] };
  run(file.name ?? "model.mmd", text, current.resource);
}

/* ── Checking ─────────────────────────────────────────────────────── */

function render() {
  const r = current.result;
  $("result").hidden = !r;
  if (!r) return;
  const s = r.summary.stats ?? {};
  $("model-name").textContent = r.summary.name ?? current.name;
  $("figures").innerHTML = [
    ["Entities", s.entities], ["Columns", s.fields], ["Relationships", s.relationships],
    ["Enums", s.enums], ["Rules", s.rules], ["State machines", s.stateMachines],
  ].map(([k, v]) => `<div><span>${esc(k)}</span><strong>${v ?? "—"}</strong></div>`).join("");
  const row = (label, c) => `<tr><th>${label}</th><td class="e">${c.errors}</td><td class="w">${c.warnings}</td><td class="i">${c.infos}</td></tr>`;
  $("counts").innerHTML = `<tr><th></th><th>Errors</th><th>Warnings</th><th>Notes</th></tr>` +
    row("As written", r.original.counts) + (r.repaired.changed ? row("After safe repairs", r.repaired.counts) : "");
  $("verdict").textContent = r.repaired.verdict;
  $("verdict").className = r.ok ? "verdict ok" : "verdict bad";

  const a = r.audit;
  $("audit-score").textContent = a.score;
  $("audit-score").className = a.ok ? "verdict ok" : "verdict bad";
  $("audit").innerHTML = a.failed.map((l) => `<li class="error"><code>FAIL</code> ${esc(l)}</li>`).join("") +
    a.passed.map((l) => `<li class="info"><code>PASS</code> ${esc(l)}</li>`).join("");
  $("audit-notes").innerHTML = a.notes.length
    ? `<p class="hint">${a.notes.length} ${a.notes.length === 1 ? "entity looks" : "entities look"} like a line item and declare${a.notes.length === 1 ? "s" : ""} no parent — declare each or decide against it:</p><ul>${a.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`
    : "";

  const shown = r.repaired.issues.slice(0, 300);
  $("problems").innerHTML = shown.map((i) =>
    `<li class="${esc(i.severity)}"><code>${esc(i.code)}</code> <span class="ln">${i.line ? "line " + i.line : ""}</span> ${esc(i.message)}` +
    (i.lineText ? `<pre>${esc(i.lineText)}</pre>` : "") + (i.hint ? `<p class="hint">${esc(i.hint)}</p>` : "") + `</li>`).join("");
  $("problems-more").textContent = r.repaired.issues.length > shown.length ? `…and ${r.repaired.issues.length - shown.length} more.` : "";
  $("save").textContent = current.resource ? (r.repaired.changed ? "Save the repairs to this file" : "Save to this file")
    : r.repaired.changed ? "Save the repaired .mmd" : "Save the .mmd";
}

function run(name, source, resource = null) {
  current = { name: name || "model.mmd", source, result: null, resource };
  status("Checking…");
  setTimeout(() => {
    try {
      current.result = analyze(source, current.name);
      status(`Checked on this device with EML ${LANGUAGE_VERSION}. Nothing was sent to AppWithAI.`);
    } catch (e) {
      status(`The checker could not run: ${e?.message ?? e}`);
    }
    render();
  }, 0);
}

/* ── Getting a model in ───────────────────────────────────────────── */

$("file").addEventListener("change", async (ev) => {
  const f = ev.target.files?.[0];
  if (f) run(f.name, await f.text());
});
$("paste-run").addEventListener("click", () => run("model.mmd", $("paste").value));
document.addEventListener("dragover", (e) => e.preventDefault());
document.addEventListener("drop", async (e) => {
  e.preventDefault();
  const f = e.dataTransfer?.files?.[0];
  if (f) run(f.name, await f.text());
});

async function openLibraryFile(meta) {
  const answer = await oa.getFileDownloadUrl({ fileId: meta.fileId });
  const url = answer?.downloadUrl ?? answer?.url ?? (typeof answer === "string" ? answer : null);
  if (!url) throw new Error("ChatGPT returned no download URL");
  // The one network request in this file: a GET of ChatGPT's own authorised URL.
  const text = await (await fetch(url, { method: "GET", credentials: "omit" })).text();
  run(meta.fileName ?? "model.mmd", text);
}

if (typeof oa?.selectFiles === "function" && typeof oa?.getFileDownloadUrl === "function") {
  $("host-pick").hidden = false;
  $("host-pick").addEventListener("click", async () => {
    try {
      const files = await oa.selectFiles();
      const meta = (files ?? []).find((f) => /\.mmd$/i.test(f.fileName ?? "")) ?? files?.[0];
      if (meta) await openLibraryFile(meta);
    } catch (e) { status(`Could not open the file: ${e?.message ?? e}`); }
  });
}

/* ── Getting the result out ───────────────────────────────────────── */

$("save").addEventListener("click", async () => {
  const r = current.result;
  if (!r) return;
  const text = r.repaired.source;

  // Opened from a file in ChatGPT: write it back to that file, through ChatGPT.
  if (current.resource) {
    try {
      const params = { uri: current.resource.uri, text };
      if (current.resource.etag) params.ifMatch = current.resource.etag;
      const answer = await request("openai/resources/write", params);
      if (answer?.outcome === "saved") { current.resource.etag = answer.etag; status("Saved to the file in this chat."); return; }
      status(answer?.outcome === "conflict" ? "The file changed in the chat since it was opened; reopen it and check again."
        : `ChatGPT did not save it (${answer?.outcome ?? "no answer"}); downloading instead.`);
      if (answer?.outcome === "conflict") return;
    } catch (e) { status(`Saving to the file failed (${e.message}); downloading instead.`); }
  }

  const name = current.name.endsWith(".mmd") ? current.name : `${current.name}.mmd`;
  const file = new File([text], name, { type: "text/plain;charset=utf-8" });
  if (typeof oa?.uploadFile === "function") {
    try { await oa.uploadFile(file, { library: true }); status(`Saved ${name} to this chat.`); return; }
    catch (e) { status(`Saving to the chat failed (${e?.message ?? e}); downloading instead.`); }
  }
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(file), download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
$("copy").addEventListener("click", async () => {
  if (!current.result) return;
  try { await navigator.clipboard.writeText(current.result.repaired.source); status("Copied."); }
  catch { status("Copy was refused by the browser."); }
});

/* ── Engine identity ──────────────────────────────────────────────── */

$("engine").innerHTML = `EML ${esc(MANIFEST.languageVersion)} · ` +
  MANIFEST.files.map((f) => `${esc(f.path)} <code title="SHA-256">${esc(f.sha256.slice(0, 12))}</code>`).join(" · ");

await connectToHost();
