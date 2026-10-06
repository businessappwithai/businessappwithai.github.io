#!/usr/bin/env node
/**
 * Holds the ChatGPT app (plugin/, service/mcp/) to its two promises.
 *
 *  1. It is the official checker. analyze() must give the published runner's
 *     verdict and exit code on every published model and on a prose document.
 *  2. The model never leaves the device. The panel's code may make exactly one
 *     request — a GET of the host's authorised file URL — and nothing that can
 *     send (XMLHttpRequest, sendBeacon, WebSocket, EventSource, a POST); the
 *     standalone page's CSP forbids every connection; the MCP server has no tool
 *     that takes any input, and its widget may connect to no domain of ours.
 */
import { readdirSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyze } from "../plugin/appwithai-eml.js";
import { handle, _test } from "../service/mcp/server.js";

const root = new URL("..", import.meta.url).pathname;
let failed = 0;
const expect = (cond, label) => { console.log(`${cond ? "ok  " : "FAIL"} ${label}`); if (!cond) failed++; };

// 1. Same verdict as the published runner.
const work = mkdtempSync(join(tmpdir(), "check-plugin-"));
const prose = join(work, "prose.mmd");
writeFileSync(prose, "prose about a model, not a model\n");
const models = [...readdirSync(join(root, "guide/models")).filter((f) => f.endsWith(".mmd")).map((f) => join(root, "guide/models", f)), prose];
for (const file of models) {
  const run = spawnSync(process.execPath, [join(root, "guide/check-model.mjs"), file, "--quiet", "--base", join(root, "guide/")], { encoding: "utf8", maxBuffer: 64 << 20 });
  const expected = run.stdout.split("\n").find((l) => /^(OK|FAILED) —/.test(l));
  const name = file.split("/").pop();
  const got = analyze(readFileSync(file, "utf8"), file);
  expect(got.repaired.verdict === expected && got.exitCode === run.status, `${name}: ${got.repaired.verdict} · exit ${got.exitCode}`);
  const auditRun = spawnSync(process.execPath, [join(root, "guide/audit-model.mjs"), file, "--quiet", "--base", join(root, "guide/")], { encoding: "utf8" });
  const auditLine = auditRun.stdout.trimEnd().split("\n").pop();
  expect(got.audit.score === auditLine && (got.audit.ok ? 0 : 1) === auditRun.status, `${name}: audit ${got.audit.score}`);
}

// 2a. The panel cannot send model data to AppWithAI. Its only fetch is a
// credential-less GET of a ChatGPT/OpenAI-authorized temporary file URL.
const SENDERS = /XMLHttpRequest|sendBeacon|WebSocket|EventSource|RTCPeerConnection|["']POST["']|navigator\.share|navigator\.clipboard/;
for (const f of ["plugin/app.js", "plugin/appwithai-eml.js"]) {
  const src = readFileSync(join(root, f), "utf8");
  expect(!SENDERS.test(src), `${f}: no API that sends`);
  const fetches = (src.match(/\bfetch\s*\(/g) ?? []).length;
  const allowed = f === "plugin/app.js" ? 1 : 0;
  expect(fetches === allowed, `${f}: ${fetches} fetch call(s), ${allowed} allowed`);
}
const appSrc = readFileSync(join(root, "plugin/app.js"), "utf8");
expect(/fetch\(url, \{ method: "GET", credentials: "omit" \}\)/.test(appSrc), "plugin/app.js: its one fetch is a credential-less GET of the host's file URL");
expect(!/uploadFile\(file,\s*\{\s*library:\s*true/.test(appSrc), "plugin/app.js: repaired models are not persisted to the ChatGPT Library by default");
const posts = appSrc.match(/\.postMessage\(/g) ?? [];
const toParent = appSrc.match(/window\.parent\.postMessage\(/g) ?? [];
expect(posts.length === toParent.length, `plugin/app.js: postMessage goes only to the host window (${toParent.length} call sites)`);
expect(/if \(!inFrame \|\| event\.source !== window\.parent\) return;/.test(appSrc), "plugin/app.js: only the host window may message the panel");
const page = readFileSync(join(root, "plugin/index.html"), "utf8");
expect(/connect-src 'none'/.test(page), "plugin/index.html: CSP forbids every connection");
expect(!/analytics\.js|posthog/i.test(page + appSrc), "plugin/: no analytics");

// 2b. The MCP server never receives a model.
for (const tool of _test.TOOLS) {
  const props = Object.keys(tool.inputSchema?.properties ?? {});
  expect(props.length === 0 && tool.inputSchema?.additionalProperties === false, `MCP tool ${tool.name}: takes no input`);
}
{
  const t = _test.OPEN_FILE_TOOL;
  const fileProps = Object.keys(t.inputSchema.properties.file.properties).sort().join(",");
  expect(Object.keys(t.inputSchema.properties).join(",") === "file" && fileProps === "name,resourceUri"
    && t.inputSchema.additionalProperties === false && t.inputSchema.properties.file.additionalProperties === false,
    "MCP open_mmd_file: receives only a file name and an opaque handle, never contents");
  expect(!_test.toolsFor({}).includes(t) && _test.toolsFor({ FILE_ENTRYPOINT: "1" }).includes(t),
    "MCP open_mmd_file: off unless FILE_ENTRYPOINT=1");
  expect(t._meta["openai/ui"].entrypoints[0].extensions.join() === ".mmd", "MCP open_mmd_file: registers .mmd");
}
const allowedConnect = new Set(["https://*.oaiusercontent.com", "https://chatgpt.com"]);
expect(_test.RESOURCES.every((r) => {
  const legacy = r._meta?.["openai/widgetCSP"]?.connect_domains ?? [];
  const standard = r._meta?.ui?.csp?.connectDomains ?? [];
  return legacy.length > 0 && standard.length > 0
    && legacy.every((d) => allowedConnect.has(d))
    && standard.every((d) => allowedConnect.has(d))
    && ![...legacy, ...standard].some((d) => /appwithai\.org/i.test(d));
}), "MCP widget: runtime connections are limited to ChatGPT/OpenAI file hosts, never AppWithAI");
expect(_test.RESOURCES.every((r) => r._meta?.ui?.domain === "https://www.appwithai.org"
  && r._meta?.["openai/widgetDomain"] === "https://www.appwithai.org"), "MCP widget: declares the required dedicated UI domain");
const rpc = async (method, params) => (await (await handle(new Request("http://local/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }))).json());
expect((await rpc("initialize", { protocolVersion: "2025-06-18" })).result?.serverInfo?.name === "appwithai", "MCP initialize");
const listedTools = (await rpc("tools/list")).result?.tools ?? [];
expect(listedTools.length === 2, "MCP tools/list (desktop file entrypoint off by default)");
const openTool = listedTools.find((t) => t.name === "open_appwithai");
const entryTypes = openTool?._meta?.["openai/ui"]?.entrypoints?.map((e) => e.type).sort().join(",");
expect(entryTypes === "global,thread", "MCP open_appwithai: web/mobile-safe global and thread entrypoints");
const widget = (await rpc("resources/read", { uri: "ui://widget/appwithai.html" })).result?.contents?.[0];
expect(widget?.mimeType === "text/html;profile=mcp-app" && widget.text.includes("https://www.appwithai.org/plugin/app.js"), "MCP widget resource loads the published panel");
expect((await rpc("tools/call", { name: "open_appwithai", arguments: {} })).result?.structuredContent?.languageVersion, "MCP open_appwithai");

console.log(failed ? `\n${failed} failed` : "\nthe app runs the official checker and cannot send a model.");
process.exit(failed ? 1 : 0);
