#!/usr/bin/env node
/**
 * Reads `guide/source/*.html` the way a reader would, and proves the bytes come
 * back.
 *
 * This is the second of two checks, and it answers a different question from
 * the first. `build-validator-source-page.mjs --check` asks whether the pages
 * are *current* against the files they carry; that would pass just as happily
 * on a page whose base64 decodes to nothing. This one asks whether the pages
 * are *recoverable*: decode each block, compare against the published file byte
 * for byte, check the SHA-256 the page prints, and then run the reconstructed
 * checker and audit in a directory holding nothing else.
 *
 * The last step is the one that matters. The point of those pages is that
 * somebody with a page-only fetcher ends up with a working checker — not with
 * four files that merely have the right length.
 *
 *   node scripts/check-validator-source-pages.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync, rmSync, copyFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["checker.js", "fixer.js", "check-model.mjs", "audit-model.mjs"];

let failed = 0;
const held = (cond, label) => {
  console.log(`${cond ? "ok  " : "FAIL"} ${label}`);
  if (!cond) failed++;
};

const work = mkdtempSync(join(tmpdir(), "eml-source-"));

for (const name of FILES) {
  const html = readFileSync(join(root, "guide", "source", `${name}.html`), "utf8");

  const block = /<pre id="b64">([\s\S]*?)<\/pre>/.exec(html);
  if (!block) { held(false, `${name}.html carries a base64 block`); continue; }

  /* Whitespace is stripped before decoding, deliberately: that is the property
     the page is relying on when it promises a reflowed or markdown-converted
     copy still works. Asserting it here is asserting the promise. */
  const raw = Buffer.from(block[1].replace(/\s+/g, ""), "base64");
  const published = readFileSync(join(root, "guide", name));
  const claimed = /sha256\s+([0-9a-f]{64})/.exec(html)?.[1];
  const actual = createHash("sha256").update(raw).digest("hex");

  held(raw.equals(published), `${name}.html decodes to the published bytes (${raw.length} of ${published.length})`);
  held(claimed === actual, `${name}.html prints the SHA-256 of what it carries`);
  writeFileSync(join(work, name), raw);
}

/* And the reconstructed set has to work. `fixer.js` imports `checker.js` from
   beside itself, and `--base ./` is what the pages tell a reader to pass, so
   this runs exactly the documented command. */
copyFileSync(join(root, "guide", "models", "crm.eml.mmd"), join(work, "model.mmd"));
for (const runner of ["check-model.mjs", "audit-model.mjs"]) {
  const run = spawnSync(process.execPath, [runner, "model.mmd", "--base", "./", "--quiet"], {
    cwd: work,
    encoding: "utf8",
  });
  held(run.status === 0, `the reconstructed ${runner} runs and exits 0 — "${(run.stdout || run.stderr || "").trim().split("\n").pop()}"`);
}

/* The index has to name every page, or a reader lands somewhere that offers
   three of the four files it needs. */
const index = readFileSync(join(root, "guide", "source", "index.html"), "utf8");
for (const name of FILES)
  held(index.includes(`${name}.html`), `index.html links ${name}.html`);

rmSync(work, { recursive: true, force: true });

console.log(failed === 0
  ? `\nthe source pages round-trip to the published validators.`
  : `\n${failed} check(s) failed.`);
process.exit(failed === 0 ? 0 : 1);
