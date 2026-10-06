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
  const got = analyze(readFileSync(file, "utf8"));
  expect(got.repaired.verdict === expected && got.exitCode === run.status, `${file.split("/").pop()}: ${got.repaired.verdict} · exit ${got.exitCode}`);
}

// 2a. The panel's code cannot send.
const SENDERS = /XMLHttpRequest|sendBeacon|WebSocket|EventSource|RTCPeerConnection|["']POST["']|navigator\.share/;
for (const f of ["plugin/app.js", "plugin/appwithai-eml.js"]) {
  const src = readFileSync(join(root, f), "utf8");
  expect(!SENDERS.test(src), `${f}: no API that sends`);
  const fetches = (src.match(/\bfetch\s*\(/g) ?? []).length;
  const allowed = f === "plugin/app.js" ? 1 : 0;
  expect(fetches === allowed, `${f}: ${fetches} fetch call(s), ${allowed} allowed`);
}
const appSrc = readFileSync(join(root, "plugin/app.js"), "utf8");
expect(/fetch\(url, \{ method: "GET", credentials: "omit" \}\)/.test(appSrc), "plugin/app.js: its one fetch is a credential-less GET of the host's file URL");
const page = readFileSync(join(root, "plugin/index.html"), "utf8");
expect(/connect-src 'none'/.test(page), "plugin/index.html: CSP forbids every connection");
expect(!/analytics\.js|posthog/i.test(page + appSrc), "plugin/: no analytics");

// 2b. The MCP server never receives a model.
for (const tool of _test.TOOLS) {
  const props = Object.keys(tool.inputSchema?.properties ?? {});
  expect(props.length === 0 && tool.inputSchema?.additionalProperties === false, `MCP tool ${tool.name}: takes no input`);
}
expect(_test.RESOURCES.every((r) => (r._meta?.["openai/widgetCSP"]?.connect_domains ?? ["x"]).length === 0), "MCP widget: may connect to no domain");
const rpc = async (method, params) => (await (await handle(new Request("http://local/", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) }))).json());
expect((await rpc("initialize", { protocolVersion: "2025-06-18" })).result?.serverInfo?.name === "appwithai", "MCP initialize");
expect((await rpc("tools/list")).result?.tools?.length === 2, "MCP tools/list");
const widget = (await rpc("resources/read", { uri: "ui://widget/appwithai.html" })).result?.contents?.[0];
expect(widget?.mimeType === "text/html+skybridge" && widget.text.includes("https://www.appwithai.org/plugin/app.js"), "MCP widget resource loads the published panel");
expect((await rpc("tools/call", { name: "open_appwithai", arguments: {} })).result?.structuredContent?.languageVersion, "MCP open_appwithai");

console.log(failed ? `\n${failed} failed` : "\nthe app runs the official checker and cannot send a model.");
process.exit(failed ? 1 : 0);
