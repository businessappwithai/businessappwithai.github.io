#!/usr/bin/env node
/**
 * Builds `guide/check-model-standalone.mjs` — the whole checker as ONE file.
 *
 * Why this exists. The published validators are two ES modules plus a runner:
 * three files, 418KB. A shell with network fetches them in one line and this
 * file is pointless. The case it is for is the one that kept recurring: an
 * assistant whose shell cannot resolve any host, whose only channel into that
 * shell is text it can paste, and whose model file is already sitting there.
 * Three files of 418KB do not go through that channel; one file of ~125KB does.
 *
 * What it is. `checker.js`, `fixer.js` and `check-model.mjs` are embedded
 * brotli-compressed and base64-encoded — byte-identical to what the site
 * serves. On run it inflates them into a temp directory and executes the
 * *published runner* against them with `--base <tmpdir>`, forwarding argv and
 * the exit code. It reimplements nothing: the three passes, the report and the
 * 0/1/2 exit codes are the published ones, because they are literally the
 * published code.
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
const SOURCES = ["checker.js", "fixer.js", "check-model.mjs"];
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
 * exit:  0 clean · 1 the checker found errors · 2 could not run
 *
 * This needs NO network and NO install. It carries \`checker.js\`, \`fixer.js\`
 * and \`check-model.mjs\` — the published validators, byte for byte — inflates
 * them into a temp directory and runs the published runner against them. The
 * three passes, the diagnostics and the exit codes are therefore the real ones:
 * a run from this file is a real run and its counts are reportable.
 *
 * It exists for a shell that cannot resolve a host and whose only input channel
 * is text. If your shell has network, fetch the three files instead — they are
 * smaller apart than this is together.
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
   * completion first. */
  process.argv = [process.argv[0], join(dir, "check-model.mjs"), ...process.argv.slice(2), "--base", dir];
  await import(pathToFileURL(join(dir, "check-model.mjs")).href);
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
console.log(`  three files, ${raw} bytes → one file, ${body.length} bytes`);
