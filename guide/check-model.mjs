#!/usr/bin/env node
/**
 * check-model.mjs — run the published EML checker over a model file.
 *
 *   curl -sO https://appwithai.org/guide/check-model.mjs
 *   node check-model.mjs my-business.mmd
 *
 * §1.3 of https://appwithai.org/llms-full.txt asks a language model to validate
 * the `.mmd` it wrote before handing it over, by importing `checker.js` and
 * `fixer.js`. That is one line in Bun or Deno, which import straight from a URL,
 * and it is several in Node, which removed network imports — so a model with a
 * shell and no memory of the difference tends to skip the step. This script is
 * that step, in one command, on every runtime: it finds the published modules,
 * runs the three passes §1.3 describes, prints the report, and exits non-zero if
 * the generator would refuse the model.
 *
 * It is a runner, not a second checker. Every diagnostic it prints comes from
 * `checker.js` and `fixer.js` — the same engines `appwithai` runs.
 *
 * Options
 *   --base <url>   where to load checker.js and fixer.js from — a directory
 *                  works too, which is how to run this with no network at all
 *                  (default: this file's own directory, the working directory,
 *                  ./guide/, then https://appwithai.org/guide/)
 *   --write        save the repaired document back over the input file when
 *                  `checkAndFix` repaired something
 *   --quiet        print only the verdict line
 *
 * Exit codes: 0 clean · 1 the checker found errors · 2 the script could not run.
 */

import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Where the published modules live.
 *
 * One host, and deliberately one: `appwithai.org`. This list used to carry two
 * entries described as "two spellings because both answer", the second being
 * the same name under a `www.` label — and that one never answered. Pages issues a
 * certificate for the domain configured in repository settings, so the `www.`
 * label was reached over TLS it did not cover and every client refused it with
 * ERR_CERT_COMMON_NAME_INVALID. A fallback that cannot succeed is not
 * redundancy; it is one wasted round trip before the real error.
 *
 * The redundancy that does work is local-first, below: `--base`, this file's
 * own directory, the working directory, then `./guide/`. `checker.js` and
 * `fixer.js` are two dependency-free ES modules, so anything that puts them on
 * disk — a checkout, a copy, a file the user pastes in — is a complete
 * validation path with no network at all.
 *
 * This is the published site and nothing else. The script deliberately reaches
 * no code-hosting origin: §10.6 of `llmdetailed.txt` tells the reader so, and
 * `scripts/check-spec.mjs` asserts it by reading this file. Failing to reach
 * this host is still not the same as the model being unchecked.
 */
const PUBLISHED = ["https://appwithai.org/guide/"];
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const file = args.find((arg) => !arg.startsWith("--") && arg !== option("--base"));

if (!file) {
  console.error("usage: node check-model.mjs <model.mmd> [--base <url>] [--write] [--quiet]");
  process.exit(2);
}

/**
 * The modules can come from four places, in this order: a `--base` the caller
 * named, the directory this script sits in, the working directory, and the
 * published site under either of its names.
 *
 * The local cases come first and they are the point of the ordering: an agent
 * running in a sandbox with no egress can put `checker.js` and `fixer.js`
 * beside the model — or `--base ./`, or `--base ./guide/` in a clone of the
 * site — and get a real run with a real report. A network that refuses is a
 * fact about the network, not a reason to hand over an unvalidated model or to
 * invent counts for it.
 */
async function loadModules() {
  const base = option("--base");
  if (base) return importFrom(base.endsWith("/") ? base : base + "/");

  const here = dirname(fileURLToPath(import.meta.url));
  for (const dir of [here, process.cwd(), join(process.cwd(), "guide")]) {
    if (existsSync(join(dir, "checker.js")) && existsSync(join(dir, "fixer.js"))) {
      return {
        where: join(dir, "/"),
        checker: await import(pathToFileURL(join(dir, "checker.js")).href),
        fixer: await import(pathToFileURL(join(dir, "fixer.js")).href),
      };
    }
  }

  /* Each published name in turn. `importFrom` exits on a failure it cannot
     recover from, so the last one is the one allowed to do that. */
  for (const [index, published] of PUBLISHED.entries()) {
    const last = index === PUBLISHED.length - 1;
    const loaded = await importFrom(published, { fatal: last });
    if (loaded) return loaded;
  }
  return undefined;
}

/**
 * Bun and Deno import a URL directly. Node removed network imports, so the bytes
 * are fetched and written into a temp directory before importing — the same
 * bytes either way, and `fixer.js` finds `checker.js` beside it.
 */
async function importFrom(base, { fatal = true } = {}) {
  try {
    const checker = await import(base + "checker.js");
    const fixer = await import(base + "fixer.js");
    return { where: base, checker, fixer };
  } catch {
    /* Node: fetch, then import from disk. */
  }
  const dir = mkdtempSync(join(tmpdir(), "eml-"));
  for (const name of ["checker.js", "fixer.js"]) {
    /*
     * A blocked network fails in two shapes and they must be handled alike.
     *
     * A refused connection or a DNS failure *throws*; an egress proxy or a
     * corporate gateway *answers*, with 403, 407 or 502. The second is the one
     * that reads like the site being broken, and it is the commoner of the two
     * inside an agent sandbox — so both end in the same place: try the next
     * base, and when there is none left, say what to do instead of only what
     * went wrong.
     */
    let failure;
    let response;
    try {
      response = await fetch(base + name);
      if (!response.ok) failure = `${response.status} ${response.statusText}`;
    } catch (error) {
      failure = String(error?.message || error);
    }
    if (failure) {
      if (!fatal) return undefined;
      console.error(
        `could not load ${base}${name}: ${failure}\n\n` +
          "The published modules could not be reached — usually no egress from this\n" +
          "environment rather than anything wrong with the site. It does NOT mean the\n" +
          "model is valid, and it is not a reason to stop:\n\n" +
          "  1. put checker.js and fixer.js next to the model, or in this directory,\n" +
          "     and run this script again — it prefers local copies and needs no network;\n" +
          "  2. or pass --base <directory> naming where those two files are;\n" +
          "  3. or, if neither is possible, deliver the model and state plainly that it\n" +
          "     is unvalidated and why. Never report checker counts you did not obtain."
      );
      process.exit(2);
    }
    writeFileSync(join(dir, name), await response.text());
  }
  return {
    where: base,
    checker: await import(pathToFileURL(join(dir, "checker.js")).href),
    fixer: await import(pathToFileURL(join(dir, "fixer.js")).href),
  };
}

const { where, checker, fixer } = await loadModules();
const { check, formatReport, LANGUAGE_VERSION } = checker;
const { checkAndFix } = fixer;

const path = resolve(file);
let original;
try {
  original = readFileSync(path, "utf8");
} catch (error) {
  console.error(`could not read ${path}: ${error.code === "ENOENT" ? "no such file" : error.message}`);
  process.exit(2);
}

/* §1.3, exactly: repair what is repairable, then check the repaired bytes twice. */
let report = checkAndFix(original);
let model = report.source;
const passes = [{ label: "checkAndFix", counts: report.counts, repaired: report.repaired }];
for (let pass = 2; pass <= 3 && report.ok; pass++) {
  report = { ...check(model), source: model };
  passes.push({ label: "check", counts: report.counts });
}

const final = check(model);
const quiet = flag("--quiet");

if (!quiet) {
  console.log(`model    ${path}`);
  console.log(`checker  ${where}checker.js · EML ${LANGUAGE_VERSION}`);
  for (const [index, pass] of passes.entries()) {
    const { errors, warnings, infos } = pass.counts;
    const repaired = pass.repaired === undefined ? "" : ` · repaired: ${pass.repaired}`;
    console.log(`pass ${index + 1}   ${pass.label.padEnd(11)} ${errors}e ${warnings}w ${infos}i${repaired}`);
  }
  if (report.fixes?.length) {
    console.log("\nrepairs");
    for (const fix of report.fixes) console.log(`  ${fix.code} ${fix.message ?? fix.description ?? ""}`);
  }
  console.log();
}

console.log(formatReport(final));

if (model !== original) {
  if (flag("--write")) {
    writeFileSync(path, model);
    console.log(`\nrepaired document written back to ${path}`);
  } else {
    console.log("\nThe repairs above are not saved. Re-run with --write to keep them, and hand over the repaired file rather than the draft.");
  }
}

process.exit(final.counts.errors === 0 ? 0 : 1);
