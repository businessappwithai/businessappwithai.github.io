#!/usr/bin/env node
/**
 * audit-model.mjs — score a delivered `.mmd` against the authoring checklist.
 *
 *   curl -sO https://www.appwithai.org/guide/audit-model.mjs
 *   node audit-model.mjs my-business.mmd
 *
 * `check-model.mjs` beside this file answers one question: would the generator
 * refuse this model. This one answers the other: **is the model actually
 * finished.** They are different questions, and the gap between them is the
 * reason this file is published rather than kept as a repository script.
 *
 * A model can score 0 errors and 0 warnings and still be missing half the
 * language. Nothing in the checker requires a model to *have* a state machine,
 * a saga, a hook, an `%%action` or a `%%rbac` line — a bare ERD is a valid EML
 * document. Nothing requires help text to be present on every column rather
 * than most of them, and a reference column that forgot its `FK` modifier is a
 * warning the generator happily proceeds past, having quietly downgraded a
 * lookup to a text box. Each of those is a clean report and an application
 * nobody can use.
 *
 * So this runs the mechanical half of §1.2's file contract and §10's checklist
 * in `https://www.appwithai.org/llms-full.txt`: the file's name and shape, the
 * keys, the enum bindings, the state machines, the rules, the sagas, the access
 * rules, help that says something rather than restating a column's own name,
 * line items declared where they belong — and the three checker passes over the
 * file's own bytes, so a clean audit implies a clean check.
 *
 * It is a scorer, not a second checker. Every diagnostic it reads comes from
 * `checker.js` and `fixer.js` — the same engines `appwithai` runs. A pass here
 * is not a promise that the model says what the business meant; only that
 * nothing in it is mechanically unfinished.
 *
 * Options
 *   --base <url>   where to load checker.js and fixer.js from — a directory
 *                  works too, which is how to run this with no network at all
 *                  (default: this file's own directory, the working directory,
 *                  ./guide/, then https://www.appwithai.org/guide/)
 *   --quiet        print only the score line
 *
 * Exit codes: 0 every check passed · 1 one or more failed · 2 could not run.
 */

import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * The loader below is the same ladder `check-model.mjs` uses, repeated here
 * deliberately rather than imported. Each of these runners is meant to be
 * fetched **on its own** — one `curl`, one `node`, no second download to
 * discover — so a shared module would turn one command into two and is exactly
 * the friction that makes the validation step get skipped. Change one, change
 * the other; `scripts/check-spec.mjs` asserts both resolve locally first and
 * that neither reaches a code-hosting origin.
 */
const PUBLISHED = ["https://www.appwithai.org/guide/"];
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
};
const file = args.find((arg) => !arg.startsWith("--") && arg !== option("--base"));

if (!file) {
  console.error("usage: node audit-model.mjs <model.mmd> [--base <url>] [--quiet]");
  process.exit(2);
}

/**
 * `--base` takes either a URL or a directory, and a directory is the form that
 * matters: it is what the no-egress rungs of the ladder tell a reader to pass.
 * A *relative* directory has to be turned into a `file:` URL first — `fetch`
 * and a bare `import()` both reject `guide/checker.js` with "Failed to parse
 * URL", which reads as the site being unreachable when the files are sitting
 * right there. So anything without a scheme is resolved against the working
 * directory and handed on as `file:///…/`, and `--base ./` works as documented.
 */
function asBase(value) {
  const withSlash = value.endsWith("/") ? value : value + "/";
  if (/^[a-z][a-z0-9+.-]*:/i.test(withSlash)) return withSlash;
  return pathToFileURL(resolve(withSlash) + "/").href;
}

async function loadModules() {
  const base = option("--base");
  if (base) return importFrom(asBase(base));

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

  for (const [index, published] of PUBLISHED.entries()) {
    const last = index === PUBLISHED.length - 1;
    const loaded = await importFrom(published, { fatal: last });
    if (loaded) return loaded;
  }
  return undefined;
}

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
          "model is finished, and it is not a reason to stop:\n\n" +
          "  1. put checker.js and fixer.js next to the model, or in this directory,\n" +
          "     and run this script again — it prefers local copies and needs no network;\n" +
          "  2. or pass --base <directory> naming where those two files are;\n" +
          "  3. or, if neither is possible, walk the checklist in section 10 of\n" +
          "     https://www.appwithai.org/llms-full.txt by hand and say in your delivery\n" +
          "     that you did. Never report a score you did not obtain."
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
const { check, LANGUAGE_VERSION } = checker;
const { checkAndFix } = fixer;

const path = resolve(file);
let raw;
try {
  raw = readFileSync(path);
} catch (error) {
  console.error(`could not read ${path}: ${error.code === "ENOENT" ? "no such file" : error.message}`);
  process.exit(2);
}

const src = raw.toString("utf8");
const lines = src.split("\n");
const ok = [], bad = [], notes = [];
const say = (cond, label) => (cond ? ok : bad).push(label);

// §1.2 — the file contract
say(file.endsWith(".mmd") && !file.endsWith(".md"), "name ends .mmd");
say(/^[a-z0-9-]+(\.eml|\.erd|\.flow|\.rules)?\.mmd$/.test(file.split("/").pop()), "name is lower-case and hyphenated");
say(!raw.includes(0), "UTF-8 plain text");
const first = lines.find((l) => l.trim() !== "") ?? "";
const MERMAID_OPENERS = /^(erDiagram|flowchart|graph|stateDiagram-v2)\b/;
say(first.trim().startsWith("%%"), `the file opens on a %% line, not on prose (${first.trim().slice(0, 40)})`);
const firstSectionAt = lines.findIndex((l) => MERMAID_OPENERS.test(l.trim()));
const nameAt = lines.findIndex((l) => /^\s*%%meta name: .+/.test(l));
say(nameAt >= 0 && (firstSectionAt < 0 || nameAt < firstSectionAt), `%%meta name: is declared before the first section (line ${nameAt + 1})`);
const offenders = [];
lines.forEach((l, i) => {
  const t = l.trim();
  if (t === "") return;
  if (t.startsWith("%%")) return;
  if (MERMAID_OPENERS.test(t)) { return; }
  if (/^#{1,6}\s/.test(t) || /^[-*+]\s/.test(t) || t.startsWith("```") || t.startsWith("<!--") || t.startsWith("---") || /^\|.*\|$/.test(t)) {
    offenders.push(`${i + 1}: ${t.slice(0, 60)}`);
  }
});
say(offenders.length === 0, `no markdown headings, bullets, fences, tables or HTML comments${offenders.length ? " — " + offenders.slice(0,3).join(" / ") : ""}`);
say(!/^\s*---\s*$/m.test(src.split("erDiagram")[0]), "no YAML front matter");

// §10 — the model
const entities = [...src.matchAll(/^\s{4}([A-Za-z][A-Za-z0-9_]*)\s*\{/gm)].map((m) => m[1]);
say(entities.length > 0, `entity blocks present (${entities.length}: ${entities.join(", ")})`);
const pkCount = (src.match(/\bPK\b/g) || []).length;
say(pkCount >= entities.length, `every entity declares a primary key (${pkCount} PK columns)`);
const fks = [...src.matchAll(/^\s+\w+\s+(\w+)\s+FK\b/gm)].map((m) => m[1]);
say(fks.every((f) => f.endsWith("_id")), `every FK ends _id (${fks.length} foreign keys)`);
/* §3.7 — the two silent downgrades. Both check clean, and both leave the
   generated application showing a text box where a lookup or a dropdown
   belongs, so a delivery audit is the last place to catch them. */
const referenceCols = [...src.matchAll(/^\s+\w+\s+(\w+(?:_id|_by))\b([^\n]*)$/gm)]
  .filter(([, name]) => name !== "id");
const unmarked = referenceCols.filter(([, , rest]) => !/\bFK\b/.test(rest)).map(([, name]) => name);
say(unmarked.length === 0,
  `every reference column carries the FK modifier — Table Direct, not String${unmarked.length ? " — missing on " + [...new Set(unmarked)].slice(0, 4).join(", ") : ""}`);

const enumBound = new Set([...src.matchAll(/^\s*%%field\s+(\w+)\.(\w+)\s+enum:/gm)].map((m) => `${m[1]}.${m[2]}`));
const unboundStatus = [];
let currentEntity = null;
for (const line of lines) {
  const entity = line.match(/^\s{4}([A-Za-z][A-Za-z0-9_]*)\s*\{/);
  if (entity) { currentEntity = entity[1]; continue; }
  if (/^\s{4}\}/.test(line)) { currentEntity = null; continue; }
  const column = currentEntity && line.match(/^\s+\w+\s+(status|state|stage)\b/);
  if (column && !enumBound.has(`${currentEntity}.${column[1]}`)) unboundStatus.push(`${currentEntity}.${column[1]}`);
}
say(unboundStatus.length === 0,
  `every status column is bound to an enum — List, not free text${unboundStatus.length ? " — unbound: " + unboundStatus.slice(0, 4).join(", ") : ""}`);

const statusCols = [...src.matchAll(/^\s+\w+\s+(status|state|stage)\b/gm)].length;
const fieldEnums = (src.match(/^\s*%%field .+ enum: /gm) || []).length;
say(fieldEnums >= statusCols, `status columns bound to enums (${statusCols} status columns, ${fieldEnums} %%field enum bindings)`);
const stateWfs = (src.match(/kind: state/g) || []).length;
say(stateWfs > 0 && (src.match(/\[\*\] -->/g) || []).length >= stateWfs && (src.match(/--> \[\*\]/g) || []).length >= stateWfs,
  `${stateWfs} state machines, each with an initial transition and a terminal state`);
say((src.match(/%%action /g) || []).length > 0, `rules carry %%action directives (${(src.match(/%%action /g) || []).length})`);
say((src.match(/kind: saga/g) || []).length > 0, `sagas declared (${(src.match(/kind: saga/g) || []).length}) with ${(src.match(/%%step /g) || []).length} steps`);
say((src.match(/%%rbac /g) || []).length > 0, `%%rbac directives present (${(src.match(/%%rbac /g) || []).length})`);
say((src.match(/%%hook /g) || []).length > 0, `%%hook directives present (${(src.match(/%%hook /g) || []).length})`);

/* §10.10 — help, and whether it says anything.
   The three-pass check below already fails on the warnings, but it reports them
   as a count: a reader of this scorer should be told that help was audited and
   what it was audited for, because it is the part of a model most often
   delivered as coverage rather than as content. */
{
  const codes = check(src).issues.filter((i) => ["EML151", "EML152", "EML153"].includes(i.code));
  const restated = codes.filter((i) => i.code === "EML151").length;
  const missing = codes.filter((i) => i.code !== "EML151").length;
  const entityHelp = (src.match(/%%entity \S+ (?:help|description):/g) || []).length;
  const fieldHelp = (src.match(/%%field \S+ help:/g) || []).length;
  say(codes.length === 0,
    `help on every entity and every column, none of it restating its own name `
    + `(${entityHelp} entities, ${fieldHelp} columns`
    + (codes.length ? `; ${missing} missing, ${restated} restated` : "") + ")");
}

/* §10.11 — line items, and where the dictionary puts them.
   EML150 is mechanical and fails here. EML149 is a judgement the checker cannot
   make, so it is reported rather than scored: a candidate the author has walked
   and rejected is a legitimate outcome, and one they have not seen is not. */
{
  const issues = check(src).issues;
  const onDashboard = issues.filter((i) => i.code === "EML150");
  const declared = (src.match(/%%entity \S+ parent:/g) || []).length;
  const candidates = issues.filter((i) => i.code === "EML149");
  say(onDashboard.length === 0,
    `${declared} line items declared, and none of them left on the dashboard`
    + (onDashboard.length ? ` (${onDashboard.length} still in a %%category)` : ""));
  for (const c of candidates) {
    notes.push(c.message.replace(/^"/, "").replace(/" looks like a line item of "/, " → ").replace(/" but declares no parent\.$/, ""));
  }
}

// §10 — the handover: the three-run protocol over the file's own bytes
let report = checkAndFix(src);
const pass1 = { ...report.counts, repaired: report.repaired };
let model = report.source;
const passes = [pass1];
for (let p = 2; p <= 3 && report.ok; p++) { report = { ...check(model), source: model }; passes.push(report.counts); }
say(passes.every((c) => c.errors === 0 && c.warnings === 0), `three checker passes clean: ${passes.map((c) => `${c.errors}e/${c.warnings}w`).join(" → ")}`);
say(model === src, "the repaired bytes are the delivered bytes (no repairs were needed)");

const quiet = flag("--quiet");

if (!quiet) {
  console.log(`\nmodel    ${path}`);
  console.log(`checker  ${where}checker.js · EML ${LANGUAGE_VERSION}\n`);
  ok.forEach((l) => console.log("  PASS  " + l));
  bad.forEach((l) => console.log("  FAIL  " + l));
  if (notes.length) {
    /* Candidates, not faults. The checker cannot tell a line item from a
       reference — that is a question about the business — so these are printed
       for the author to answer rather than counted against the model. */
    const plural = notes.length === 1
      ? "1 entity looks like a line item and declares no parent."
      : `${notes.length} entities look like line items and declare no parent.`;
    console.log(`\n  ${plural}`);
    console.log("  Walk each one and either declare it or decide against it (§3.5.1):");
    notes.forEach((n) => console.log("    " + n));
  }
  console.log();
}

/* The score is the last line, the same way `formatReport`'s verdict is: whoever
   reads a run reads its final line, and a FAIL above the total would otherwise
   be the last thing a reader sees on a passing audit. */
console.log(`${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length === 0 ? 0 : 1);
