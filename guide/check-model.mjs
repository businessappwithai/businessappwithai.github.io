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
 * `checker.js` and `fixer.js` — the same engines `erdwithai` runs.
 *
 * Options
 *   --base <url>   where to load checker.js and fixer.js from
 *                  (default: the directory this file was downloaded from, then
 *                  https://appwithai.org/guide/)
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

const PUBLISHED = "https://appwithai.org/guide/";
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
 * The modules can come from three places, in this order: a `--base` the caller
 * named, the directory this script sits in (a clone of the site, or a folder the
 * three files were downloaded into together), and the published site. The local
 * cases keep the script working with no network at all.
 */
async function loadModules() {
  const base = option("--base");
  if (base) return importFrom(base.endsWith("/") ? base : base + "/");

  const here = dirname(fileURLToPath(import.meta.url));
  if (existsSync(join(here, "checker.js")) && existsSync(join(here, "fixer.js"))) {
    return {
      where: join(here, "/"),
      checker: await import(pathToFileURL(join(here, "checker.js")).href),
      fixer: await import(pathToFileURL(join(here, "fixer.js")).href),
    };
  }
  return importFrom(PUBLISHED);
}

/**
 * Bun and Deno import a URL directly. Node removed network imports, so the bytes
 * are fetched and written into a temp directory before importing — the same
 * bytes either way, and `fixer.js` finds `checker.js` beside it.
 */
async function importFrom(base) {
  try {
    const checker = await import(base + "checker.js");
    const fixer = await import(base + "fixer.js");
    return { where: base, checker, fixer };
  } catch {
    /* Node: fetch, then import from disk. */
  }
  const dir = mkdtempSync(join(tmpdir(), "eml-"));
  for (const name of ["checker.js", "fixer.js"]) {
    const response = await fetch(base + name);
    if (!response.ok) {
      console.error(`could not fetch ${base}${name}: ${response.status} ${response.statusText}`);
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
