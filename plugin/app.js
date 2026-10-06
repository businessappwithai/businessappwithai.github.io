/**
 * The AppWithAI panel: open an .mmd, check it, repair it, save it — all in this
 * page. Used standalone at https://www.appwithai.org/plugin/ and as the widget
 * the ChatGPT app registers.
 *
 * THE RULE: the model never leaves the device. There is exactly one network
 * call in this file, and it is a GET of a file the ChatGPT host has authorised
 * (its own download URL) — content flowing *in*. Nothing here sends a model, a
 * file name, an entity name or a diagnostic anywhere. scripts/check-plugin.mjs
 * fails CI if that stops being true.
 *
 * ChatGPT's widget API (window.openai) is feature-detected, never assumed: every
 * path below also works with a file picked from disk or text pasted in.
 */
import { analyze, LANGUAGE_VERSION } from "./appwithai-eml.js";
import { MANIFEST } from "./manifest.js";

const $ = (id) => document.getElementById(id);
const oa = typeof window !== "undefined" ? window.openai : undefined;
let current = { name: "model.mmd", source: "", result: null };

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const status = (text) => { $("status").textContent = text; };

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
  const shown = r.repaired.issues.slice(0, 300);
  $("problems").innerHTML = shown.map((i) =>
    `<li class="${esc(i.severity)}"><code>${esc(i.code)}</code> <span class="ln">${i.line ? "line " + i.line : ""}</span> ${esc(i.message)}` +
    (i.lineText ? `<pre>${esc(i.lineText)}</pre>` : "") + (i.hint ? `<p class="hint">${esc(i.hint)}</p>` : "") + `</li>`).join("");
  $("problems-more").textContent = r.repaired.issues.length > shown.length ? `…and ${r.repaired.issues.length - shown.length} more.` : "";
  $("save").disabled = !r.repaired.changed && !r.ok;
  $("save").textContent = r.repaired.changed ? "Save the repaired .mmd" : "Save the .mmd";
}

function run(name, source) {
  current = { name: name || "model.mmd", source, result: null };
  status("Checking…");
  setTimeout(() => {
    try {
      current.result = analyze(source);
      status(`Checked locally with EML ${LANGUAGE_VERSION}. Nothing was sent anywhere.`);
    } catch (e) {
      status(`The checker could not run: ${e?.message ?? e}`);
    }
    render();
  }, 0);
}

/* ── Getting a model in ─────────────────────────────────────────────── */

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

/** A file reference the host may hand us, in whichever shape it uses. */
function findFileRef(value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 4) return null;
  for (const key of ["fileId", "file_id"]) if (typeof value[key] === "string") return { fileId: value[key], name: value.name ?? value.fileName };
  if (Array.isArray(value)) for (const v of value) { const f = findFileRef(v, depth + 1); if (f) return f; }
  for (const v of Object.values(value)) { const f = findFileRef(v, depth + 1); if (f) return f; }
  return null;
}

async function loadHostFile(ref) {
  const answer = await oa.getFileDownloadUrl({ fileId: ref.fileId });
  const url = typeof answer === "string" ? answer : answer?.url ?? answer?.downloadUrl;
  if (!url) throw new Error("the host returned no download URL");
  // The one network call in this file: a GET of the host's own authorised URL.
  const text = await (await fetch(url, { method: "GET", credentials: "omit" })).text();
  run(ref.name ?? "model.mmd", text);
}

if (oa?.selectFiles && oa?.getFileDownloadUrl) {
  $("host-pick").hidden = false;
  $("host-pick").addEventListener("click", async () => {
    try {
      const picked = await oa.selectFiles({ accept: [".mmd"], multiple: false });
      const ref = findFileRef(picked);
      if (ref) await loadHostFile(ref);
    } catch (e) { status(`Could not open the file: ${e?.message ?? e}`); }
  });
}

/* ── Getting the result out ─────────────────────────────────────────── */

$("save").addEventListener("click", async () => {
  const r = current.result;
  if (!r) return;
  const text = r.repaired.source;
  const name = current.name.endsWith(".mmd") ? current.name : `${current.name}.mmd`;
  const file = new File([text], name, { type: "text/plain;charset=utf-8" });
  if (oa?.uploadFile) {
    try { await oa.uploadFile(file); status(`Saved ${name} to this chat.`); return; }
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

/* ── Engine identity ────────────────────────────────────────────────── */

$("engine").innerHTML = `EML ${esc(MANIFEST.languageVersion)} · ` +
  MANIFEST.files.map((f) => `${esc(f.path)} <code title="SHA-256">${esc(f.sha256.slice(0, 12))}</code>`).join(" · ");

/* A host that opened us on a file passes it in; start on it straight away. */
try {
  const ref = findFileRef(oa?.toolInput) ?? findFileRef(oa?.toolOutput) ?? findFileRef(oa?.widgetState);
  if (ref && oa?.getFileDownloadUrl) await loadHostFile(ref);
} catch (e) { status(`Could not open the file from the chat: ${e?.message ?? e}`); }
