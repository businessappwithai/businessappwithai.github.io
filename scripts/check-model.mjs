/**
 * check-model.mjs — audit a delivered .mmd against the authoring protocol.
 *
 * Section 1.2 of llms-full.txt states a file contract and section 10 a
 * checklist. Most of both is mechanical, and this runs that part: the file's
 * name and shape, the keys, enums, machines, rules, sagas and rbac it should
 * carry, and the three checker passes over its own bytes.
 *
 *   node scripts/check-model.mjs path/to/business-name.mmd
 *
 * A pass here is not a promise that the model says what the business meant —
 * only that nothing in it is mechanically wrong.
 */
import { readFileSync } from "node:fs";
import { check } from "../guide/checker.js";
import { checkAndFix } from "../guide/fixer.js";

const path = process.argv[2];
if (!path) {
  console.error("usage: node scripts/check-model.mjs <model.mmd>");
  process.exit(2);
}

const raw = readFileSync(path);
const src = raw.toString("utf8");
const lines = src.split("\n");
const ok = [], bad = [];
const say = (cond, label) => (cond ? ok : bad).push(label);

// §1.2 — the file contract
say(path.endsWith(".mmd") && !path.endsWith(".md"), "name ends .mmd");
say(/^[a-z0-9-]+(\.eml|\.erd|\.flow|\.rules)?\.mmd$/.test(path.split("/").pop()), "name is lower-case and hyphenated");
say(raw.toString("utf8") === raw.toString("utf8") && !raw.includes(0), "UTF-8 plain text");
const first = lines.find((l) => l.trim() !== "");
const MERMAID_OPENERS = /^(erDiagram|flowchart|graph|stateDiagram-v2)\b/;
say(first.trim().startsWith("%%"), `the file opens on a %% line, not on prose (${first.trim().slice(0, 40)})`);
const firstSectionAt = lines.findIndex((l) => MERMAID_OPENERS.test(l.trim()));
const nameAt = lines.findIndex((l) => /^\s*%%meta name: .+/.test(l));
say(nameAt >= 0 && (firstSectionAt < 0 || nameAt < firstSectionAt), `%%meta name: is declared before the first section (line ${nameAt + 1})`);
const offenders = [];
let inBlock = false;
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

// §10 — the handover: the three-run protocol over the file's own bytes
let report = checkAndFix(src);
const pass1 = { ...report.counts, repaired: report.repaired };
let model = report.source;
const passes = [pass1];
for (let p = 2; p <= 3 && report.ok; p++) { report = { ...check(model), source: model }; passes.push(report.counts); }
say(passes.every((c) => c.errors === 0 && c.warnings === 0), `three checker passes clean: ${passes.map((c) => `${c.errors}e/${c.warnings}w`).join(" → ")}`);
say(model === src, "the repaired bytes are the delivered bytes (no repairs were needed)");

console.log(`\n${path}\n`);
ok.forEach((l) => console.log("  PASS  " + l));
bad.forEach((l) => console.log("  FAIL  " + l));
console.log(`\n${ok.length} passed, ${bad.length} failed`);
process.exit(bad.length === 0 ? 0 : 1);
