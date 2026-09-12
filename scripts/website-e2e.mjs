#!/usr/bin/env node
/**
 * Website end-to-end tests.
 *
 * Every claim this site makes about a published model is checked against the
 * model itself, read with the generator's own reader — `viewers/eml-model.js`,
 * the bundle the viewers page runs. Nothing here re-implements the language: if
 * a count is wrong, it is wrong because the page is stale, not because this
 * file counts differently.
 *
 * It exists because three separate defects reached the live site, each of the
 * same shape — a page describing a model it no longer matched, or a vendored
 * bundle that had fallen behind the generator:
 *
 *   1. `try-it-yourself.html` said the hospital model had 28 entities, nine
 *      state machines and 87 access restrictions. It has 30, ten and 132.
 *   2. The same stale figures were repeated in three guide chapters.
 *   3. `assets/js/appwithai-fullstack.js` was months behind the acronym fix, so
 *      the deployable zip named a table `bus_k_y_c_record` while every reader of
 *      the same model called it `bus_kyc_record`. The application built, ran and
 *      answered; only a query written in the model's own words found it.
 *
 * None of those had a test. All three do now.
 *
 *   node scripts/website-e2e.mjs          exit 0 clean, 1 on any failure
 *   node scripts/website-e2e.mjs --verbose  print every assertion, not just failures
 *
 * Node only, no dependencies, in the style of check-spec.mjs beside it.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERBOSE = process.argv.includes("--verbose");
const p = (...s) => path.join(ROOT, ...s);

let passed = 0;
const failures = [];
function ok(name) { passed++; if (VERBOSE) console.log(`  ok   ${name}`); }
function fail(name, detail) { failures.push(`${name}\n         ${detail}`); console.log(`  FAIL ${name}\n         ${detail}`); }
function is(actual, expected, name) { actual === expected ? ok(name) : fail(name, `expected ${expected}, page says ${actual}`); }

const { readModel } = await import(`file://${p("viewers", "eml-model.js")}`);
const { check, LANGUAGE_VERSION } = await import(`file://${p("guide", "checker.js")}`);

const MODELS = readdirSync(p("guide", "models")).filter((f) => f.endsWith(".eml.mmd")).sort();

/** The key each model is selected by, in chapter 09's BUILT_IN map and every `#hash` that links to it. */
const KEY_OF = {
  "crm.eml.mmd": "crm",
  "dance-studio.eml.mmd": "dance",
  "drug-discovery.eml.mmd": "drug",
  "education-management-system.eml.mmd": "education",
  "hospital-management-system.eml.mmd": "hospital",
  "investment-planning-wealth-management-system.eml.mmd": "investment",
};

const NUMBER = "(?:a |one )?[\\w-]+(?:\\s+hundred\\s+and\\s+[\\w-]+)?";
const WORDS = { one:1, two:2, three:3, four:4, five:5, six:6, seven:7, eight:8, nine:9, ten:10,
  eleven:11, twelve:12, thirteen:13, fourteen:14, fifteen:15, sixteen:16, seventeen:17, eighteen:18,
  nineteen:19, twenty:20, "twenty-two":22, "twenty-seven":27, "twenty-eight":28, thirty:30,
  "thirty-two":32, "fifty-nine":59, "sixty-eight":68, "eighty-seven":87, ninety:90, "ninety-one":91,
  "a hundred and thirty-two":132, "one hundred and thirty-two":132 };
const num = (t) => { const s = String(t).trim().toLowerCase().replace(/\s+/g, " ").replace(/,/g, ""); return /^\d+$/.test(s) ? Number(s) : (WORDS[s] ?? null); };

/** Measured, never asserted by hand: the generator's own reader, plus the directive count for reports. */
function measure(file) {
  const src = readFileSync(p("guide", "models", file), "utf8");
  const m = readModel(src);
  return {
    src,
    entities: m.stats.entities,
    stateMachines: m.stats.stateMachines,
    sagas: m.stats.sagas,
    rules: m.stats.rules,
    hooks: m.stats.hooks,
    // The roles the *model* declares, which is what every other figure on a card
    // is: a count of something in the .mmd. `stats.roles` is two higher — it adds
    // the generated `administrator` and `user` that no model writes. Counting
    // names in `%%rbac` lines instead gets this wrong in the other direction,
    // because some models name `administrator` there and some do not, so that
    // number silently means different things per model.
    roles: m.access.roles.filter((r) => /Declared by %%rbac/.test(r.description || "")).length,
    accessRules: m.stats.accessRules,
    // `%%report <key> ...` — matched on the directive's real shape, not the bare
    // keyword: the education model contains a line of prose that mentions it.
    reports: (src.match(/%%report[ \t]+[a-z0-9-]+[ \t]/g) || []).length,
  };
}

const STATS = Object.fromEntries(MODELS.map((f) => [f, measure(f)]));

/** Each figure a page may claim, and the measured value it has to equal. */
const CLAIMS = [
  ["entities",      new RegExp(`(${NUMBER})\\s+entities\\b`, "i"),                     (s) => s.entities],
  ["stateMachines", new RegExp(`(${NUMBER})\\s+state\\s+machines\\b`, "i"),            (s) => s.stateMachines],
  ["sagas",         new RegExp(`(${NUMBER})\\s+sagas\\b`, "i"),                          (s) => s.sagas],
  ["rules",         new RegExp(`(${NUMBER})\\s+rules\\b`, "i"),                          (s) => s.rules],
  ["hooks",         new RegExp(`(${NUMBER})\\s+(?:lifecycle\\s+)?hooks\\b`, "i"),      (s) => s.hooks],
  ["roles",         new RegExp(`(${NUMBER})\\s+roles\\b`, "i"),                          (s) => s.roles],
  ["accessRules",   new RegExp(`(${NUMBER})\\s+access\\s+restrictions\\b`, "i"),       (s) => s.accessRules],
  ["reports",       new RegExp(`(${NUMBER})\\s+<code>%%report</code>\\s+directives\\b`, "i"), (s) => s.reports],
];

/** The block of markup that describes one model on one page. */
function blockFor(html, key) {
  const card = html.match(new RegExp(`<a[^>]+href="[^"]*run-in-browser\\.html#${key}"[\\s\\S]*?</a>`, "i"));
  if (card) return card[0];
  const choice = html.match(new RegExp(`id="choice-${key}"[\\s\\S]*?</button>`, "i"));
  return choice ? choice[0] : null;
}

console.log("Website end-to-end tests\n");

// ---------------------------------------------------------------------------
console.log("Every published model still checks clean");
for (const f of MODELS) {
  const r = check(STATS[f].src);
  const errors = (r.issues || r.diagnostics || []).filter((i) => (i.severity || i.level) === "error").length;
  is(errors, 0, `${f} — 0 errors`);
}

// ---------------------------------------------------------------------------
console.log("\nEvery figure a page states matches the model it describes");
const PAGES = ["try-it-yourself.html", "guide/run-in-browser.html", "guide/run-real-stack.html", "guide/11-check-a-model.html"];
let claimsChecked = 0;
for (const page of PAGES) {
  if (!existsSync(p(page))) { fail(page, "page is missing"); continue; }
  const html = readFileSync(p(page), "utf8");
  for (const [file, key] of Object.entries(KEY_OF)) {
    const block = blockFor(html, key);
    if (!block) continue;                      // not every page describes every model
    for (const [label, re, pick] of CLAIMS) {
      const m = block.match(re);
      if (!m) continue;                        // a page need not state every figure
      const claimed = num(m[1]);
      if (claimed === null) continue;          // not a number word we recognise — e.g. "the largest"
      claimsChecked++;
      is(claimed, pick(STATS[file]), `${page} · ${key} · ${label}`);
    }
  }
}
console.log(`  (${claimsChecked} figures checked across ${PAGES.length} pages)`);

// ---------------------------------------------------------------------------
console.log("\nEvery example a page offers is one chapter 09 can select");
const runner = readFileSync(p("assets", "js", "run-in-browser.js"), "utf8");
const builtIn = new Set([...runner.matchAll(/^\s*([a-z]+)\s*:\s*\{[^}]*?\.eml\.mmd/gms)].map((m) => m[1]));
for (const key of Object.values(KEY_OF)) {
  builtIn.has(key)
    ? ok(`chapter 09 can select #${key}`)
    : fail(`chapter 09 can select #${key}`, `BUILT_IN has no "${key}" — the card offers a model the page cannot load`);
}
const tiy = readFileSync(p("try-it-yourself.html"), "utf8");
for (const key of [...builtIn]) {
  tiy.includes(`run-in-browser.html#${key}`)
    ? ok(`try-it-yourself.html offers #${key}`)
    : fail(`try-it-yourself.html offers #${key}`, `BUILT_IN carries "${key}" but no card links to it`);
}

// ---------------------------------------------------------------------------
console.log("\nThe vendored generator artifacts are current");
// An entity whose name begins with an acronym is the case that reached the live
// site: a stale bundle spelled it one letter at a time, and every join through
// it matched nothing while the application looked healthy.
const probe = readModel(`%%meta name: Acronym Probe
erDiagram
    KYCRecord {
        string id PK
        string reference
    }
    %%rbac role:officer on KYCRecord.read
`);
is(probe.entities[0].tableName, "kyc_record", "an acronym entity is one word (viewers/eml-model.js)");
is(probe.rbac.operations[0]?.tableName, "bus_kyc_record", "and its bus_ table likewise");

// The two copies of the checker this site publishes have to agree; they are one
// engine built by two bundler entries, and a reader who gets different verdicts
// from chapter 11 and the viewers has no way to tell which to believe.
const viewerCheck = await import(`file://${p("viewers", "eml-model.js")}`);
is(viewerCheck.LANGUAGE_VERSION, LANGUAGE_VERSION, "checker.js and eml-model.js report one language version");

// ---------------------------------------------------------------------------
console.log("\nEvery published model explains itself, and puts its line items where they belong");
/*
 * Two properties nothing else on this site would notice going backwards.
 *
 * Help is the first: a model can be re-vendored with complete coverage and
 * worthless content — `Household id for HouseholdMember.` on every reference —
 * and every page still renders, every count still matches, and the generated
 * manual reads as a list of labels printed twice. `EML151` is what sees it.
 *
 * Line items are the second: `%%entity <Child> parent: <Parent>` is the only
 * thing that keeps an invoice line off the dashboard and inside its invoice,
 * and a model that loses the directive loses the arrangement silently — the
 * application still builds and still runs.
 *
 * Both are read from the published checker rather than counted here, so this
 * agrees with what chapter 11 tells a reader about the same file.
 */
for (const name of readdirSync(p("guide", "models")).filter((f) => f.endsWith(".mmd")).sort()) {
  const source = readFileSync(p("guide", "models", name), "utf8");
  const issues = check(source).issues;

  const helpFaults = issues.filter((i) => ["EML151", "EML152", "EML153"].includes(i.code));
  helpFaults.length === 0
    ? ok(`${name}: help on every entity and column, none of it restating a name`)
    : fail(`${name}: help`, helpFaults.slice(0, 3).map((i) => `${i.code} ${i.message}`).join("; "));

  const onDashboard = issues.filter((i) => i.code === "EML150");
  onDashboard.length === 0
    ? ok(`${name}: no line item is left on the dashboard`)
    : fail(`${name}: line items`, onDashboard.map((i) => i.message).join("; "));

  const namelessCategory = issues.filter((i) => i.code === "EML154");
  namelessCategory.length === 0
    ? ok(`${name}: every %%category declares a name, so none is silently dropped`)
    : fail(`${name}: categories`, `${namelessCategory.length} %%category line(s) with no name: key`);
}

// ---------------------------------------------------------------------------
console.log(`\n${failures.length === 0 ? "OK" : "FAILED"} — ${passed} passed, ${failures.length} failed`);
process.exit(failures.length === 0 ? 0 : 1);
