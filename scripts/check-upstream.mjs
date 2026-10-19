#!/usr/bin/env node
/**
 * check-upstream.mjs — hold every vendored file to upstream's, byte for byte.
 *
 * Everything listed here is a straight copy of a file in
 * businessappwithai/app-with-ai-tanstack, and this site's CLAUDE.md says to
 * re-copy them, never edit them. Nothing used to check that. The protocol
 * document drifted — this site's copy documented an exit code upstream's had
 * dropped — and neither repository noticed, because each held only itself to
 * its own tests.
 *
 * It fetches upstream's file from raw.githubusercontent.com and compares. The
 * ref is `main` unless UPSTREAM_REF names another (a branch, a tag, a SHA). A
 * failure means "re-vendor from upstream", or "merge the upstream change first":
 * it is red on purpose while this site is ahead of upstream's main, so the two
 * cannot be merged in the wrong order. Exit 0 all identical · 1 a file differs ·
 * 2 could not fetch (the network, not the site: say so, do not call it a pass).
 *
 * Not listed, on purpose: the files this site deliberately changes
 * (assets/js/run-in-browser.js, run-real-stack.js — the local deltas in
 * CLAUDE.md) and viewers/index.html, which is authored here.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REF = process.env.UPSTREAM_REF || "main";
const BASE = `https://raw.githubusercontent.com/businessappwithai/app-with-ai-tanstack/${REF}/`;

const PAIRS = [
  ["llms.txt", "website/llmtext/llms.txt"],
  ["guide/checker.js", "html/checker.js"],
  ["guide/fixer.js", "html/fixer.js"],
  ["guide/wasm-app/sw.js", "html/wasm-app/sw.js"],
  ["assets/js/appwithai-wasm.js", "html/assets/appwithai-wasm.js"],
  ["assets/js/appwithai-fullstack.js", "html/assets/appwithai-fullstack.js"],
  ["guide/models/crm.eml.mmd", "html/models/crm.eml.mmd"],
  ["guide/models/drug-discovery.eml.mmd", "html/models/drug-discovery.eml.mmd"],
  ["guide/models/investment-planning-wealth-management-system.eml.mmd", "html/models/investment-planning-wealth-management-system.eml.mmd"],
  ["guide/models/dance-studio.eml.mmd", "language/examples/dance-studio.eml.mmd"],
  ["guide/models/hospital-management-system.eml.mmd", "examples/hospital-management-system.mmd"],
  ["guide/models/education-management-system.eml.mmd", "docs/eml-sessions/education-management-system/education-management-system.mmd"],
  ...["eml-model.js", "canvas.js", "layout.js", "erd-viewer.js", "workflow-viewer.js", "rules-viewer.js", "decision-table.js", "model-viewer.js", "viewers.css"].map(
    (f) => [`viewers/${f}`, `website/viewers/${f}`]
  ),
];

let differ = 0;
let unreachable = 0;
console.log(`Comparing ${PAIRS.length} vendored files with app-with-ai-tanstack @ ${REF}\n`);
for (const [here, there] of PAIRS) {
  let theirs;
  try {
    const res = await fetch(BASE + there, { cache: "no-store" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    theirs = Buffer.from(await res.arrayBuffer());
  } catch (error) {
    unreachable++;
    console.log(`  ???   ${here} — could not fetch ${there}: ${error.message}`);
    continue;
  }
  const ours = readFileSync(path.join(ROOT, here));
  if (ours.equals(theirs)) console.log(`  ok    ${here}`);
  else {
    differ++;
    console.log(`  DIFF  ${here} differs from ${there} (${ours.length} vs ${theirs.length} bytes) — re-vendor it, or merge the upstream change first`);
  }
}
console.log(
  differ ? `\n${differ} file(s) differ from upstream.`
  : unreachable ? `\n${unreachable} file(s) could not be fetched; that is a network fact, not a pass.`
  : "\nEvery vendored file is upstream's."
);
process.exitCode = differ ? 1 : unreachable ? 2 : 0;
