#!/usr/bin/env node
/**
 * check-model.mjs — audit a delivered .mmd against the authoring checklist.
 *
 *   node scripts/check-model.mjs path/to/business-name.mmd
 *
 * This is the local way in. **The audit itself lives in
 * `guide/audit-model.mjs`**, published beside `checker.js` and `fixer.js` at
 * `https://www.appwithai.org/guide/audit-model.mjs`, and this file only forwards
 * to it with `--base guide/` so a run inside a checkout needs no network.
 *
 * It used to be the other way round: the twenty-two checks were here, importing
 * `../guide/checker.js` by relative path, so the only way to run them was to
 * have a clone of this repository. The thing they catch is a model that scores
 * 0 errors and 0 warnings and is still missing half the language — which is
 * precisely the failure a language model delivers, from an environment that has
 * no clone and never will. A check that only the maintainer can run does not
 * catch it.
 *
 * Keep this a forwarder: a diagnostic added here would be one the published
 * runner does not have, and the audit would mean two different things depending
 * on who ran it.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("usage: node scripts/check-model.mjs <model.mmd> [--quiet]");
  process.exit(2);
}

const run = spawnSync(
  process.execPath,
  [join(root, "guide", "audit-model.mjs"), ...args, "--base", join(root, "guide")],
  { stdio: "inherit" }
);

process.exit(run.status === null ? 2 : run.status);
