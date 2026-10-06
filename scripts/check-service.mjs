#!/usr/bin/env node
/**
 * Holds service/check/worker.js to the published runner. For every published
 * model, and for a prose document, the service's `verdict` and `exitCode` must
 * equal what `node guide/check-model.mjs` prints and returns. The service imports
 * the same checker.js and fixer.js, so any difference means it stopped running
 * §1.3's passes the way the runner does.
 */
import { readdirSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handle } from "../service/check/worker.js";

const root = new URL("..", import.meta.url).pathname;
const work = mkdtempSync(join(tmpdir(), "check-service-"));
const prose = join(work, "prose.mmd");
writeFileSync(prose, "prose about a model, not a model\n");
const files = [
  ...readdirSync(join(root, "guide/models")).filter((f) => f.endsWith(".mmd")).map((f) => join(root, "guide/models", f)),
  prose,
];

let failed = 0;
for (const file of files) {
  const source = readFileSync(file, "utf8");
  const run = spawnSync(process.execPath, [join(root, "guide/check-model.mjs"), file, "--quiet", "--base", join(root, "guide/")], { encoding: "utf8", maxBuffer: 64 << 20 });
  const expected = run.stdout.split("\n").find((l) => /^(OK|FAILED) —/.test(l));
  for (const body of [JSON.stringify({ model: source }), source]) {
    const type = body === source ? "text/plain" : "application/json";
    const res = await handle(new Request("http://local/check", { method: "POST", headers: { "content-type": type }, body }));
    const got = await res.json();
    const same = res.status === 200 && got.verdict === expected && got.exitCode === run.status;
    if (!same) failed++;
    console.log(`${same ? "ok  " : "FAIL"} ${file.split("/").pop()} (${type}): ${got.verdict} · exit ${got.exitCode}${same ? "" : `  — runner said: ${expected} · exit ${run.status}`}`);
  }
}

const bad = await handle(new Request("http://local/check", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }));
if (bad.status !== 400) { failed++; console.log("FAIL invalid JSON should answer 400"); } else console.log("ok   invalid JSON answers 400");
const spec = await (await handle(new Request("http://local/openapi.json"))).json();
if (spec.paths?.["/check"]?.post?.operationId !== "checkModel") { failed++; console.log("FAIL /openapi.json"); } else console.log("ok   /openapi.json describes checkModel");

console.log(failed ? `\n${failed} failed` : "\nthe service agrees with the published runner.");
process.exit(failed ? 1 : 0);
