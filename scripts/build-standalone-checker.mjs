#!/usr/bin/env node
/**
 * Builds `guide/check-model-standalone.mjs` — the whole checker as ONE file.
 *
 * Why this exists. The published validators are two ES modules plus two
 * runners: four files, 433KB. A shell with network fetches them in one line and
 * this file is pointless. The case it is for is the one that kept recurring: an
 * assistant whose shell cannot resolve any host, whose only channel into that
 * shell is text it can paste, and whose model file is already sitting there.
 * Four files of 433KB do not go through that channel; one file of ~140KB does.
 *
 * What it is. `checker.js`, `fixer.js`, `check-model.mjs` and
 * `audit-model.mjs` are embedded brotli-compressed and base64-encoded —
 * byte-identical to what the site serves. On run it inflates them into a temp
 * directory and executes the *published runner* against them with
 * `--base <tmpdir>`, forwarding argv and the exit code. It reimplements
 * nothing: the three passes, the checklist audit, the report and the 0/1/2 exit
 * codes are the published ones, because they are literally the published code.
 *
 * `--audit` picks the second runner. Both belong in here for the same reason
 * the file exists at all: the environment this is for cannot fetch the other
 * one afterwards, and "would the generator refuse this" and "is this model
 * finished" are different questions. Carrying only the first would leave the
 * shell that needs this most able to ask only half of it.
 *
 * That is also why it cannot drift in behaviour. `--check` fails when the
 * embedded payloads no longer match the files beside them, so re-vendoring the
 * validators without rebuilding this is caught rather than shipped.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { brotliCompressSync, constants } from "node:zlib";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = ["checker.js", "fixer.js", "check-model.mjs", "audit-model.mjs"];
const OUT = join(root, "guide", "check-model-standalone.mjs");

const pack = (name) => {
  const raw = readFileSync(join(root, "guide", name));
  const squeezed = brotliCompressSync(raw, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length },
  });
  return { name, base64: squeezed.toString("base64"), raw: raw.length, packed: squeezed.length };
};

const payloads = SOURCES.map(pack);

const body = `#!/usr/bin/env node
/**
 * The AppWithAI EML checker, as one file. Generated — do not edit.
 *   rebuild: node scripts/build-standalone-checker.mjs
 *
 * usage: node check-model-standalone.mjs <model.mmd> [--write] [--quiet]
 *        node check-model-standalone.mjs <model.mmd> --audit [--quiet]
 * exit:  0 clean · 1 the checker found errors, or the audit failed a check
 *        2 could not run
 *
 * This needs NO network and NO install. It carries \`checker.js\`, \`fixer.js\`,
 * \`check-model.mjs\` and \`audit-model.mjs\` — the published validators, byte
 * for byte — inflates them into a temp directory and runs the published runner
 * against them. The three passes, the diagnostics and the exit codes are
 * therefore the real ones: a run from this file is a real run and its counts
 * are reportable.
 *
 * Without \`--audit\` it answers "would the generator refuse this model".
 * With \`--audit\` it answers the other question — "is this model finished" —
 * by scoring it against the authoring checklist, which a model can fail with
 * zero errors and zero warnings.
 *
 * It exists for a shell that cannot resolve a host and whose only input channel
 * is text. If your shell has network, fetch the published files instead — each
 * one you need is smaller on its own than this is altogether.
 */
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { brotliDecompressSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const PAYLOAD = {
${payloads.map((p) => `  ${JSON.stringify(p.name)}: "${p.base64}",`).join("\n")}
};

const dir = mkdtempSync(join(tmpdir(), "eml-checker-"));
let code = 2;
try {
  for (const [name, base64] of Object.entries(PAYLOAD))
    writeFileSync(join(dir, name), brotliDecompressSync(Buffer.from(base64, "base64")));

  /* Run the published runner, not a copy of its logic. It resolves the two
   * modules from --base before it considers the network, so this never leaves
   * the machine. process.exitCode is what it sets; import() runs it to
   * completion first.
   *
   * --audit is consumed here rather than passed on: the audit runner has no
   * such flag, and an unrecognised argument would be taken for the model file. */
  const forwarded = process.argv.slice(2).filter((arg) => arg !== "--audit");
  const runner = process.argv.includes("--audit") ? "audit-model.mjs" : "check-model.mjs";
  process.argv = [process.argv[0], join(dir, runner), ...forwarded, "--base", dir];
  await import(pathToFileURL(join(dir, runner)).href);
  code = process.exitCode ?? 0;
} catch (error) {
  console.error("could not run the embedded checker: " + (error?.message ?? error));
  code = 2;
} finally {
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
}
process.exit(code);
`;

if (process.argv.includes("--check")) {
  let current = "";
  try { current = readFileSync(OUT, "utf8"); } catch {}
  if (current === body) {
    console.log("ok    guide/check-model-standalone.mjs — up to date");
    process.exit(0);
  }
  console.log("FAIL  guide/check-model-standalone.mjs is stale against the published validators.");
  console.log("      Rebuild: node scripts/build-standalone-checker.mjs");
  process.exit(1);
}

writeFileSync(OUT, body);
const raw = payloads.reduce((n, p) => n + p.raw, 0);
console.log(`wrote guide/check-model-standalone.mjs (${body.length} bytes)`);
for (const p of payloads) console.log(`  ${p.name.padEnd(22)} ${p.raw} → ${p.packed}`);
console.log(`  ${payloads.length} files, ${raw} bytes → one file, ${body.length} bytes`);
