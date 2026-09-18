/**
 * check-spec.mjs — verify llms-full.txt against the published checker.
 *
 * Two claims the specification makes about itself, both mechanical:
 *
 *   1. "Every example in this document is a complete model that the checker
 *      accepts with zero errors and zero warnings" (the file's own header).
 *   2. Every type alias, modifier, cardinality operator, hook type, action
 *      type, step contract, %%meta key and state-machine code it documents
 *      behaves the way it says (sections 3 to 8).
 *
 * No dependencies, no build step: it imports guide/checker.js, which is the
 * same engine the command line runs.
 *
 *   node scripts/check-spec.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { check, AUTO_FIXABLE, LANGUAGE_VERSION } from "../guide/checker.js";
import { checkAndFix } from "../guide/fixer.js";

const root = fileURLToPath(new URL("..", import.meta.url));

/* ---------------------------------------------- 1. the document's examples */

const spec = readFileSync(root + "llms-full.txt", "utf8").split("\n");
const blocks = [];
let current = null, start = 0;
spec.forEach((line, i) => {
  if (current === null && line.trim() === "```mermaid") { current = []; start = i + 1; return; }
  if (current !== null && line.trim() === "```") { blocks.push({ start, src: current.join("\n") }); current = null; return; }
  if (current !== null) current.push(line);
});

let exampleFailures = 0;
for (const block of blocks) {
  const report = check(block.src);
  if (report.counts.errors || report.counts.warnings) {
    exampleFailures++;
    console.log(`FAIL  mermaid example at line ${block.start}: ${JSON.stringify(report.counts)}`);
    for (const issue of report.issues) console.log(`        ${issue.severity} ${issue.code} line ${issue.line} — ${issue.message}`);
  }
}
console.log(`${blocks.length} mermaid examples, ${exampleFailures} not clean`);

/* ------------------------------------------- 2. the claims it makes in prose */
let pass = 0, fail = 0;

/*
 * The probes below are synthetic — `Thing { string id PK; string col_a }` and a
 * directive under test — built to ask one question each: does `varchar` alias to
 * `string`, is `beforeUpdate` a hook type, does `}o--||` parse. They are not
 * models anybody would deliver, and they carry no help text, so EML151-EML153
 * fire on every one of them and say nothing about the claim being tested. They
 * are excluded here and nowhere else: the *authored* examples above are still
 * held to zero warnings, help included, because those are what a reader copies.
 */
const HELP_CODES = new Set(["EML151", "EML152", "EML153"]);
/* `check` reports under `issues`, `checkAndFix` under `remaining`. */
const substantive = (r) => (r.issues ?? r.remaining ?? []).filter((i) => !HELP_CODES.has(i.code));

const t = (name, src, expect = "clean") => {
  const r = check(src);
  const bad = expect === "clean"
    ? r.counts.errors > 0 || substantive(r).some((i) => i.severity === "warning")
    : !r.issues.some((i) => i.code === expect);
  if (bad) {
    fail++;
    console.log(`FAIL ${name} -> ${JSON.stringify(r.counts)} ${r.issues.map((i) => i.code + ":" + i.message).slice(0,3).join(" | ")}`);
  } else pass++;
};
const say = (cond, label) => { if (cond) pass++; else { fail++; console.log("FAIL  " + label); } };
const erd = (body, extra = "") => `%%meta name: Audit\n%%meta kind: erd\n${extra}erDiagram\n${body}\n`;

// --- 1. version and auto-fixable list (header + §8.3) -----------------------
const expectedFixable = ["EML001", "EML103", "EML112", "EML114", "EML117", "EML421", "EML422"];
say(LANGUAGE_VERSION === "1.2.0", `header states EML version 1.2.0 (checker says ${LANGUAGE_VERSION})`);
say(AUTO_FIXABLE.join(",") === expectedFixable.join(","), `section 8.3 lists the seven auto-repairs (checker says ${AUTO_FIXABLE.join(", ")})`);
/* The heading counts them in words, so it goes stale silently otherwise. */
const specBody = spec.join("\n");
say(spec.includes("### 8.3 The seven auto-repairs"), "section 8.3's heading names the right number");
for (const code of expectedFixable)
  say(new RegExp(`^\\| \`${code}\` \\|.*\\|$`, "m").test(specBody), `section 8.3's table carries a row for ${code}`);

// --- 2. §3.2 types: every alias the doc lists must not raise EML115 ---------
const ALIASES = {
  string: ["string","varchar","char","uuid","guid","id","email","url","phone","password","color"],
  text: ["text","longtext"],
  integer: ["integer","int","bigint","smallint"],
  decimal: ["decimal","float","double","number","money","amount"],
  boolean: ["boolean","bool"],
  date: ["date"],
  datetime: ["datetime","timestamp","time"],
  json: ["json","jsonb","object","array"]
};
for (const [canon, aliases] of Object.entries(ALIASES))
  for (const a of aliases)
    t(`type alias ${a} (${canon})`, erd(`    Thing {\n        string id PK\n        ${a} col_a\n    }`));

// --- 3. §3.3 modifiers ------------------------------------------------------
for (const m of ["PK","FK","UK","UNIQUE","OPTIONAL","NULL"]) {
  const body = m === "PK"
    ? `    Thing {\n        string id PK\n    }`
    : m === "FK"
      ? `    Other {\n        string id PK\n    }\n    Thing {\n        string id PK\n        string other_id FK\n    }\n    Other ||--o{ Thing : "owns"`
      : `    Thing {\n        string id PK\n        string col_a ${m}\n    }`;
  t(`modifier ${m}`, erd(body));
}
t("unknown modifier raises EML118", erd(`    Thing {\n        string id PK\n        string col_a UNQIUE\n    }`), "EML118");

// --- 4. §3.4 all eight cardinality operators --------------------------------
for (const op of ["||--||","|o--o|","||--o{","||--|{","}o--||","}|--||","}o--o{","}|--|{"])
  t(`cardinality ${op}`, erd(`    Alpha {\n        string id PK\n    }\n    Beta {\n        string id PK\n    }\n    Alpha ${op} Beta : "relates"`));

// §3.4 — a spelling outside those eight is dropped, and only EML502 shows it.
const related = (op) => erd(`    Alpha {\n        string id PK\n    }\n    Beta {\n        string id PK\n        string alpha_id FK\n    }\n    Alpha ${op} Beta : "relates"`);
t("a recognised operator registers the relationship", related("||--o{"));
for (const op of ["||--o|", "|o--|{", "}o--|{", "}|--o{"])
  t(`the Mermaid-legal but unread operator ${op} loses the relationship — EML502`, related(op), "EML502");

// --- 5. §5.1 the thirteen hook types ---------------------------------------
const HOOKS = ["beforeCreate","afterCreate","beforeUpdate","afterUpdate","beforeDelete","afterDelete",
  "beforeRead","afterRead","beforeList","afterList","beforeQuery","afterQuery","customValidate"];
for (const h of HOOKS)
  t(`hook ${h}`, `%%meta name: Audit\n%%meta kind: erd\nerDiagram\n    Thing {\n        string id PK\n        string name\n    }\n\n%%meta name: Audit Hooks\n%%meta kind: workflow\n%%workflow AuditHooks entity: Thing kind: hook\nflowchart TD\n    A[Request] --> B[${h}: handlerName]\n    B --> C[Response]\n\n    %%hook ${h} handlerName on Thing[field: name]\n`);

// --- 6. §4.2 the three action types -----------------------------------------
const ACTIONS = {
  "trigger-workflow": 'workflow: AuditSaga message: go',
  "validation-error": "message: nope",
  transform: "field: name value: x message: ok"
};
for (const [type, keys] of Object.entries(ACTIONS))
  t(`action ${type}`, `%%meta name: Audit\n%%meta kind: erd\nerDiagram\n    Thing {\n        string id PK\n        string name\n    }\n\n%%meta name: Audit Rules\n%%meta kind: rules\n%%rule auditRule on Thing event: beforeCreate priority: 10\nflowchart TD\n    A([Start]) --> B{name == "x"?}\n    B -->|Yes| C[Do it]\n    B -->|No| D[Skip it]\n    C --> Z([End])\n    D --> Z\n\n    %%action doIt ${type} when: name == "x" ${keys}\n\n%%meta name: Audit Saga\n%%meta kind: workflow\n%%workflow AuditSaga entity: Thing kind: saga${type === "trigger-workflow" ? " trigger: rule" : ""}\nflowchart TD\n    S([Start]) --> U[Stamp it]\n    U --> E([End])\n\n    %%step U UpdateEntity field: name value: stamped\n`);

// --- 7. §5.3 the seven step types, exactly as documented --------------------
const saga = (steps, nodes) => `%%meta name: Audit\n%%meta kind: erd\nerDiagram\n    Thing {\n        string id PK\n        string name\n        integer qty\n    }\n    Other {\n        string id PK\n        string thing_id FK\n        string name\n    }\n    Thing ||--o{ Other : "spawns"\n\n%%meta name: Audit Saga\n%%meta kind: workflow\n%%workflow AuditSaga entity: Thing kind: saga\nflowchart TD\n${nodes}\n\n${steps}\n`;
t("step CreateEntity", saga('    %%step B CreateEntity entity: Other as: newOtherId fields: {"thing_id":"id","name":"name"}', "    A([Start]) --> B[Create]\n    B --> Z([End])"));
t("step UpdateEntity", saga("    %%step B UpdateEntity field: name value: stamped", "    A([Start]) --> B[Update]\n    B --> Z([End])"));
t("step DeleteEntity (no required keys)", saga("    %%step B DeleteEntity entity: Other targetField: thing_id", "    A([Start]) --> B[Delete]\n    B --> Z([End])"));
t("step Formula multiply", saga("    %%step B Formula target: doubled source: qty operation: multiply operand: 2", "    A([Start]) --> B(Compute)\n    B --> Z([End])"));
t("step Formula set", saga("    %%step B Formula target: label operation: set value: hello", "    A([Start]) --> B(Compute)\n    B --> Z([End])"));
t("step Formula copy", saga("    %%step B Formula target: copied operation: copy source: name", "    A([Start]) --> B(Compute)\n    B --> Z([End])"));
t("step Decision inline table", saga('    %%step B Decision decisionTable: {"hitPolicy":"first","inputs":[{"id":"i1","name":"Qty","field":"qty"}],"outputs":[{"id":"o1","name":"Band","field":"band"}],"rules":[{"_id":"hi","i1":"> 10","o1":"\'high\'"},{"_id":"rest","i1":"","o1":"\'low\'"}]}', "    A([Start]) --> B{Decide}\n    B --> Z([End])"));
t("step REST url closed up to its key", saga("    %%step B REST method: POST url:https://hooks.example.com/notify", "    A([Start]) --> B(Call)\n    B --> Z([End])"));
// Both spellings are accepted now. The parser used to end a value at the next
// `<key>:` token, and `https:` looked like one, so the spaced form raised
// EML262 + EML268 for a line that read perfectly correctly. It recognises a
// scheme and reads through it now — §5.3 says so, and this is what holds it.
t("step REST with a space before https", saga("    %%step B REST method: POST url: https://hooks.example.com/notify", "    A([Start]) --> B(Call)\n    B --> Z([End])"));
t("step Agent needs agentId", saga("    %%step B Agent agentId: triage-v1", "    A([Start]) --> B(Agent)\n    B --> Z([End])"));
t("step Agent without agentId raises EML262", saga("    %%step B Agent", "    A([Start]) --> B(Agent)\n    B --> Z([End])"), "EML262");

// --- 8. §7 %%meta keys -------------------------------------------------------
for (const [k, v] of [["version","1.0.0"],["entity","Thing"],["stack","tanstack-start-nestjs"]])
  t(`meta key ${k}`, `%%meta name: Audit\n%%meta kind: erd\n%%meta ${k}: ${v}\nerDiagram\n    Thing {\n        string id PK\n    }\n`);

// --- 9. §5.2 state machine rules --------------------------------------------
const state = (sd, extra = "") => `%%meta name: Audit\n%%meta kind: erd\n%%enum ThingStatus: draft, live, done\nerDiagram\n    Thing {\n        string id PK\n        string status\n    }\n%%field Thing.status enum: ThingStatus\n\n%%meta name: Audit Lifecycle\n%%meta kind: workflow\n%%workflow ThingLifecycle entity: Thing kind: state\nstateDiagram-v2\n${sd}\n${extra}`;
t("state machine, enum-backed, initial and terminal", state("    [*] --> draft\n    draft --> live : publish\n    live --> done : finish\n    done --> [*]"));
t("no initial transition raises EML421", state("    draft --> live : publish\n    live --> done : finish\n    done --> [*]"), "EML421");
t("no terminal state raises EML422", state("    [*] --> draft\n    draft --> live : publish\n    live --> done : finish"), "EML422");
t("a state missing from the matched enum raises EML426", state("    [*] --> draft\n    draft --> live : publish\n    live --> archived : archive\n    archived --> [*]"), "EML426");
t("an enum value no state uses raises EML427", state("    [*] --> draft\n    draft --> live : publish\n    live --> archived : archive\n    archived --> [*]"), "EML427");
t("a machine with no enum at all raises EML428", `%%meta name: Audit\n%%meta kind: erd\nerDiagram\n    Thing {\n        string id PK\n        string status\n    }\n\n%%meta name: Audit Lifecycle\n%%meta kind: workflow\n%%workflow ThingLifecycle entity: Thing kind: state\nstateDiagram-v2\n    [*] --> draft\n    draft --> live : publish\n    live --> done : finish\n    done --> [*]\n`, "EML428");

// --- 10. §6 rbac on a transition and on CRUD --------------------------------
t("rbac on a transition", state("    [*] --> draft\n    draft --> live : publish\n    live --> done : finish\n    done --> [*]", "\n    %%rbac role:editor|admin on Thing.publish\n"));
t("rbac on CRUD", erd(`    Thing {\n        string id PK\n    }`) + "\n%%rbac role:admin on Thing.*\n");
t("rbac on an unknown target raises EML214", state("    [*] --> draft\n    draft --> live : publish\n    live --> done : finish\n    done --> [*]", "\n    %%rbac role:editor on Thing.teleport\n"), "EML214");

// --- 11. §3.6 directives -----------------------------------------------------
t("enum, field, index, category", `%%meta name: Audit\n%%meta kind: erd\n%%enum ThingStatus: draft, live\n%%category name: Core; description: The things; icon: Box; entities: Thing\nerDiagram\n    Thing {\n        string id PK\n        string status\n        string code\n    }\n%%field Thing.status enum: ThingStatus\n%%index Thing(status)\n%%index Thing(code) unique\n`);
t("%%field naming a missing enum raises EML501", `%%meta name: Audit\n%%meta kind: erd\nerDiagram\n    Thing {\n        string id PK\n        string status\n    }\n%%field Thing.status enum: Nowhere\n`, "EML501");

/* --------------------------------- 3. the traps the spec now warns about ---- */

// §5.2 — the machine tracks a column called status / state / stage (EML500).
const machine = (entity, extra = "") => `%%meta name: Audit\n%%meta kind: erd\n%%enum ThingStatus: draft, live, done\nerDiagram\n    Thing {\n        string id PK\n        string ${entity}\n    }\n${extra}\n%%meta name: Audit Lifecycle\n%%meta kind: workflow\n%%workflow ThingLifecycle entity: Thing kind: state\nstateDiagram-v2\n    [*] --> draft\n    draft --> live : publish\n    live --> done : finish\n    done --> [*]\n`;
t("a lifecycle column called status is accepted", machine("status", "%%field Thing.status enum: ThingStatus"));
t("a lifecycle column called approval_status raises EML500", machine("approval_status", "%%field Thing.approval_status enum: ThingStatus"), "EML500");

// §5.3 — UpdateEntity naming another entity must say which row (EML265).
const target = (step) => `%%meta name: Audit\n%%meta kind: erd\nerDiagram\n    Thing {\n        string id PK\n        string name\n    }\n    Other {\n        string id PK\n        string thing_id FK\n        string name\n    }\n    Thing ||--o{ Other : "spawns"\n\n%%meta name: Audit Saga\n%%meta kind: workflow\n%%workflow AuditSaga entity: Thing kind: saga\nflowchart TD\n    A([Start]) --> B[Create]\n    B --> C[Write]\n    C --> Z([End])\n\n    %%step B CreateEntity entity: Other as: newOtherId fields: {"thing_id":"id","name":"name"}\n${step}\n`;
t("UpdateEntity on another entity with no target raises EML265", target("    %%step C UpdateEntity entity: Other field: name value: x"), "EML265");
t("UpdateEntity reading back an earlier step's as: id", target("    %%step C UpdateEntity entity: Other targetSource: newOtherId field: name value: x"));
t("UpdateEntity matching a foreign key", target("    %%step C UpdateEntity entity: Other targetField: thing_id field: name value: x"));
t("UpdateEntity on the triggering record names no entity", target("    %%step C UpdateEntity field: name value: x"));

// §3.5 — person columns resolve to User only by the documented list (EML502).
const person = (column) => `%%meta name: Audit\n%%meta kind: erd\nerDiagram\n    User {\n        string id PK\n        string full_name\n    }\n    Thing {\n        string id PK\n        string ${column} FK\n    }\n    User ||--o{ Thing : "owns"\n`;
for (const column of ["approved_by_id", "created_by_id", "owner_id", "user_id", "manager_id"])
  t(`person column ${column} resolves to User`, person(column));
/* A name matching no entity now falls back to a parent the model declared and
   nothing else claims — which is what the generator does, so the checker agrees.
   `person()` gives Thing exactly one such parent, so these resolve. */
for (const column of ["approver_id", "assigned_to_id"])
  t(`person column ${column} falls back to the declared parent`, person(column));

/* With no relationship to fall back on, the column resolves to nothing and
   EML502 is right again. */
const unowned = (column) =>
  `%%meta name: Audit\n%%meta kind: erd\nerDiagram\n    User {\n        string id PK\n        string full_name\n    }\n    Thing {\n        string id PK\n        string ${column} FK\n        string name\n    }\n`;
for (const column of ["approver_id", "assigned_to_id"])
  t(`person column ${column} with no declared parent — EML502`, unowned(column), "EML502");
t("assigned_to is recognised but does not end _id — EML114", person("assigned_to"), "EML114");

// §7 — %%meta stack takes one of two values (EML003).
for (const stack of ["tanstack-start-nestjs", "openui5-odatav4"])
  t(`%%meta stack: ${stack}`, `%%meta name: Audit\n%%meta kind: erd\n%%meta stack: ${stack}\nerDiagram\n    Thing {\n        string id PK\n    }\n`);
t("%%meta stack carrying anything else raises EML003", `%%meta name: Audit\n%%meta kind: erd\n%%meta stack: AppWithAI EML 1.2.0\nerDiagram\n    Thing {\n        string id PK\n    }\n`, "EML003");

console.log(`${pass} claims verified, ${fail} contradicted`);

/* ------------- 4. §3.7: what the Application Dictionary makes of the ERD ---- */

/* These claims are about the generator, not the checker, so they are tested
   against the bundled generator the browser chapter runs. */
const claimsBefore = pass;
const failuresBefore = fail;
const { generateFromSource } = await import("../assets/js/appwithai-wasm.js");
const REFERENCE = { 10: "String", 12: "Amount", 13: "ID", 14: "Text", 15: "Date", 16: "DateTime",
  19: "Table Direct", 20: "Yes-No", 24: "URL", 27: "Color", 28: "JSON", 29: "Password", 30: "Email", 31: "Phone" };

const dictionary = (body, extra = "") => {
  const source = `%%meta name: Dictionary Probe\n%%meta kind: erd\n%%enum OrderStatus: draft, placed, shipped\nerDiagram\n    Vendor {\n        string id PK\n        string name\n    }\n    Order {\n        string id PK\n${body}\n    }\n    Vendor ||--o{ Order : "supplies"\n${extra}`;
  const built = generateFromSource({ source, name: "Probe" });
  const order = JSON.parse(built.files["app/model.json"]).entities.find((entity) => entity.name === "Order");
  return Object.fromEntries(order.attributes.map((attr) => [attr.name, attr.referenceId]));
};

const reference = (label, column, expected, extra = "") => {
  const refs = dictionary(`        ${column}`, extra);
  const name = column.trim().split(/\s+/)[1];
  const got = refs[name];
  const shown = REFERENCE[got] ?? (got >= 1000 ? "List" : got);
  if (shown === expected) pass++;
  else { fail++; console.log(`FAIL ${label} — expected ${expected}, dictionary recorded ${shown}`); }
};

reference("FK modifier plus _id makes a Table Direct lookup", "string vendor_id FK", "Table Direct");
reference("the same column without FK is downgraded to String", "string vendor_id", "String");
reference("a bound enumerated column becomes a List", "string status", "List", "%%field Order.status enum: OrderStatus\n");
reference("an unbound status column is free text", "string status", "String");
reference("the email alias reaches the dictionary", "email contact_email", "Email");
reference("the phone alias reaches the dictionary", "phone contact_phone", "Phone");
reference("the url alias reaches the dictionary", "url tracking_link", "URL");
reference("the password alias reaches the dictionary", "password portal_secret", "Password");
reference("the color alias reaches the dictionary", "color label_colour", "Color");
/* All five normalise to `string`, so this is what proves the alias is what the
   dictionary reads and not the column's name — §3.2 tells the reader to write
   `email email` rather than `string email` on the strength of it. */
reference("a string column named like an alias is not one", "string password_hint", "String");
reference("text becomes a memo", "text notes", "Text");
reference("boolean becomes Yes-No", "boolean is_rush", "Yes-No");
reference("money becomes an Amount", "money total", "Amount");
reference("json becomes a JSON editor", "json payload", "JSON");

/* The two downgrades are diagnostics now (EML119, EML146), and the retired
   access-rule spelling is EML223. These assert that the vendored checker
   actually reports what §3.7, §6 and §7 say it reports. */
const dictionaryDiagnostics = `%%meta name: Dictionary Probe\n%%meta kind: erd\n%%enum ThingStatus: draft, live\nerDiagram\n    Vendor {\n        string id PK\n    }\n    Order {\n        string id PK\n        string vendor_id\n        string status\n    }\n    Vendor ||--o{ Order : "supplies"\n`;
t("an unmarked reference column is reported as EML119", dictionaryDiagnostics, "EML119");
t("an unbound status column is reported as EML146", dictionaryDiagnostics, "EML146");
t("a %%guard written as an access rule is reported as EML223",
  `%%meta name: Guard Probe\n%%meta kind: erd\n%%enum ThingStatus: draft, live\nerDiagram\n    Thing {\n        string id PK\n        string status\n    }\n%%field Thing.status enum: ThingStatus\n\n%%meta name: Thing Lifecycle\n%%meta kind: workflow\n%%workflow ThingLifecycle entity: Thing kind: state\nstateDiagram-v2\n    [*] --> draft\n    draft --> live : publish\n    live --> [*]\n\n    %%guard role:manager on Thing.publish\n`,
  "EML223");
/* §3.1: the columns the generator adds are its own, and declaring one is
   reported rather than carried into a CREATE TABLE that PostgreSQL refuses. */
for (const column of ["created_at", "updated_at", "version", "deleted_by"])
  t(`declaring ${column} is reported as EML103`,
    `%%meta name: Managed Probe\n%%meta kind: erd\nerDiagram\n    Thing {\n        string id PK\n        datetime ${column}\n    }\n`,
    "EML103");
/* §8.3: both duplicate faults are repaired, and the repair keeps the stronger
   declaration rather than whichever came last. */
{
  const duplicated = `%%meta name: Duplicate Probe\n%%meta kind: erd\nerDiagram\n    Course {\n        string id PK\n        string title\n        string title OPTIONAL\n        string code OPTIONAL\n        string code UK\n        datetime created_at\n    }\n`;
  const fixed = checkAndFix(duplicated);
  say(fixed.repaired === true, "checkAndFix repairs a duplicated column and a managed one");
  const fixedSubstantive = substantive(fixed);
  say(fixed.counts.errors === 0 && !fixedSubstantive.some((i) => i.severity === "warning"),
    `the repaired document is clean (${fixed.counts.errors}e/${fixedSubstantive.length}w, help codes aside)`);
  const body = fixed.source;
  say((body.match(/^\s*string\s+title\b/gm) ?? []).length === 1, "the duplicate title is gone");
  say(/^\s*string\s+title\s*$/m.test(body), "title stayed required — OPTIONAL did not win");
  say(/^\s*string\s+code\s+UK\s*$/m.test(body), "code kept the UK the second line promised");
  say(!/created_at/.test(body), "the generator's own created_at was removed from the document");
}

t("a column the generator does not manage stays quiet",
  `%%meta name: Managed Probe\n%%meta kind: erd\nerDiagram\n    Thing {\n        string id PK\n        datetime started_at\n    }\n`);

t("a state column that no machine tracks stays quiet", `%%meta name: Address Probe\n%%meta kind: erd\nerDiagram\n    Address {\n        string id PK\n        string state\n        string city\n    }\n`);

/* §3.7: what a reference shows in place of its uuid — the dictionary's
   identifier columns, in declared order. Asserted against the generator rather
   than the prose, because the table in the spec is a promise about behaviour. */
const identifiersOf = (body) => {
  const source = `%%meta name: Identifier Probe\n%%meta kind: erd\nerDiagram\n    Thing {\n${body}\n    }\n`;
  const built = generateFromSource({ source, name: "Probe" });
  const model = JSON.parse(built.files["app/model.json"]);
  return model.dictionary.columns
    .filter((column) => column.isIdentifier)
    .sort((a, b) => a.seqNo - b.seqNo)
    .map((column) => column.columnName);
};

const identifierCases = [
  ["a name column names the record", "        string id PK\n        string name", ["name"]],
  ["title is used when there is no name", "        string id PK\n        string title", ["title"]],
  ["a person is both their names", "        string id PK\n        string first_name\n        string last_name", ["first_name", "last_name"]],
  ["name wins over a code", "        string id PK\n        string code\n        string name", ["name"]],
  ["a code identifies when no name exists", "        string id PK\n        string code", ["code"]],
  ["failing all of those, the first text column", "        string id PK\n        string billing_city\n        integer size", ["billing_city"]],
  ["the key is never an identifier", "        string id PK\n        integer size", []],
  /* A join entity names itself from the records it joins. Without this the
     first text column won, and every campaign member read "invited". */
  ["a join entity is its two parents",
    "        string id PK\n        string campaign_id FK\n        string contact_id FK\n        string member_status",
    ["campaign_id", "contact_id"]],
  ["only the first two parents, never four",
    "        string id PK\n        string order_id FK\n        string product_id FK\n        string warehouse_id FK",
    ["order_id", "product_id"]],
  ["an entity that names itself is not a join",
    "        string id PK\n        string name\n        string account_id FK\n        string owner_id FK",
    ["name"]],
  ["a person with two references is still a person",
    "        string id PK\n        string account_id FK\n        string owner_id FK\n        string first_name\n        string last_name",
    ["first_name", "last_name"]],
  ["one reference is not a join, so the text column beside it wins",
    "        string id PK\n        string contact_id FK\n        string street",
    ["street"]],
];
for (const [label, body, expected] of identifierCases) {
  const got = identifiersOf(body);
  say(got.join(",") === expected.join(","), `${label} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)})`);
}

/* §3.6 and §3.7: help text is compiled, and reaches sys_column / sys_table. */
const helped = generateFromSource({
  source: `%%meta name: Help Probe\n%%meta kind: erd\nerDiagram\n    Vendor {\n        string id PK\n        string name\n    }\n%%entity Vendor help: A company that supplies us.\n%%field Vendor.name help: The name on the invoice, not the trading name.\n`,
  name: "Help Probe",
});
const helpModel = JSON.parse(helped.files["app/model.json"]);
const helpTable = helpModel.dictionary.tables.find((table) => table.tableName === "bus_vendor");
const helpColumn = helpModel.dictionary.columns.find((column) => column.columnName === "name");
say(helpTable?.description === "A company that supplies us.",
  `%%entity help: becomes sys_table.description (${JSON.stringify(helpTable?.description)})`);
say(helpColumn?.description === "The name on the invoice, not the trading name.",
  `%%field help: becomes sys_column.description (${JSON.stringify(helpColumn?.description)})`);

const silent = check(dictionaryDiagnostics);
const silentWarnings = substantive(silent).filter((i) => i.severity === "warning");
say(silent.counts.errors === 0 && silentWarnings.length === 2,
  `both downgrades are warnings, not errors — the generator still runs (${silent.counts.errors}e/${silentWarnings.length}w)`);

console.log(`${pass - claimsBefore} dictionary derivations verified, ${fail - failuresBefore} contradicted`);

/* ------------------------------- 5. the runner §8.4 tells a model to use ---- */

const runner = root + "guide/check-model.mjs";
const specText = spec.join("\n");
const command = "curl -sO https://www.appwithai.org/guide/check-model.mjs\nnode check-model.mjs my-business.mmd";

const scratch = mkdtempSync(join(tmpdir(), "eml-spec-"));
const clean = join(scratch, "clean.mmd");
const broken = join(scratch, "broken.mmd");
writeFileSync(clean, "%%meta name: Runner Check\n%%meta kind: erd\nerDiagram\n    Thing {\n        string id PK\n        string name\n    }\n");
writeFileSync(broken, "%%meta name: Runner Check\n%%meta kind: erd\nerDiagram\n    Thing {\n        string id PK\n        string name\n    }\n%%index Missing(name)\n");

const run = (file) => spawnSync(process.execPath, [runner, file, "--base", root + "guide/", "--quiet"], { encoding: "utf8" });
const cleanRun = run(clean);
const brokenRun = run(broken);
let runnerFail = 0;
const expect = (cond, label) => { if (cond) console.log(`ok   ${label}`); else { runnerFail++; console.log(`FAIL ${label}`); } };
expect(specText.includes("```sh\n" + command + "\n```"), "the spec carries the two-line command as a runnable block");
expect((specText.match(/check-model\.mjs/g) ?? []).length >= 4, "the command is reachable from the header, §1.3, §8.4 and §10");
expect(existsSync(runner), "guide/check-model.mjs exists at the path the spec publishes");
expect(cleanRun.status === 0, "check-model.mjs exits 0 on a clean model");
expect(/OK — 0 errors/.test(cleanRun.stdout), "check-model.mjs prints the checker's own verdict");
expect(brokenRun.status === 1, "check-model.mjs exits 1 when the generator would refuse the model");
expect(spawnSync(process.execPath, [runner], { encoding: "utf8" }).status === 2, "check-model.mjs exits 2 when it cannot run");

/* ------------------------------- 5b. the checklist audit §8.5 publishes -----
 *
 * The audit answers the question a clean report does not: is the model
 * finished. It was a repository script for most of its life — twenty-two checks
 * importing `../guide/checker.js` by relative path — so the only people who
 * could run it were the ones with a clone, and the failure it catches is
 * delivered by a language model in an environment that has neither. It is
 * published beside the checker now, and these hold it there.
 *
 * The positive case has to be a real finished model, not the two-column fixture
 * above: that one is exactly what the audit exists to fail.
 */
const auditor = root + "guide/audit-model.mjs";
const runAudit = (file, ...extra) =>
  spawnSync(process.execPath, [auditor, file, "--base", root + "guide/", "--quiet", ...extra], { encoding: "utf8" });

/* A bare ERD: a primary key, a name, a free-text status. The checker accepts it
   with 0 errors — no %%rbac, no workflow, no help, no enum binding — and that
   is the whole reason this runner exists. */
const bare = join(scratch, "bare-erd.mmd");
writeFileSync(bare, "%%meta name: Bare Erd\n%%meta kind: erd\nerDiagram\n    Thing {\n        string id PK\n        string name\n        string status\n    }\n");

const finishedRun = runAudit(root + "guide/models/crm.eml.mmd");
const unfinishedRun = runAudit(bare);
const unfinishedCheck = run(bare);

expect(existsSync(auditor), "guide/audit-model.mjs exists at the path the spec publishes");
expect(finishedRun.status === 0, "audit-model.mjs exits 0 on a finished model");
expect(unfinishedRun.status === 1, "audit-model.mjs exits 1 on a model that is valid but unfinished");
expect(unfinishedCheck.status === 0,
  "…and that same model passes check-model.mjs — which is why the audit is published, not optional");
expect(spawnSync(process.execPath, [auditor], { encoding: "utf8" }).status === 2, "audit-model.mjs exits 2 when it cannot run");

/* The score is a published figure: §8.5 states it and shows the line. A check
   added or dropped without editing the document leaves the spec quoting a
   number no run produces. */
const scored = /^(\d+) passed, (\d+) failed$/m.exec(finishedRun.stdout.trim());
expect(scored !== null, "audit-model.mjs's last line is its score");
const total = scored ? Number(scored[1]) + Number(scored[2]) : 0;
expect(specText.includes(`${total} passed, 0 failed`),
  `section 8.5 quotes the score the runner actually prints (${total} checks)`);
expect(new RegExp(`\\b${total === 22 ? "twenty-two" : String(total)}\\b`).test(specText),
  "section 8.5 states how many checks there are, in words, and it is that many");

/* §8.4's no-egress row tells the reader to pass a directory, and `--base ./` is
   the form it shows. A relative path is not a URL: `fetch` and a bare
   `import()` both reject `guide/checker.js` outright, so this used to fail with
   "Failed to parse URL" — which reads as the site being unreachable while the
   files sit in the next directory. Both runners resolve it as a path now. */
const relative = (script) =>
  spawnSync(process.execPath, [script, "guide/models/crm.eml.mmd", "--base", "guide/", "--quiet"],
    { encoding: "utf8", cwd: root });
for (const [label, script] of [["check-model.mjs", runner], ["audit-model.mjs", auditor]])
  expect(relative(script).status === 0, `${label} accepts a relative --base, as §8.4 tells the reader to pass`);

/* Both runners are local-first and neither reaches a code-hosting origin — the
   same claim §8.4 makes, now made about two files. */
const auditorSource = readFileSync(auditor, "utf8");
expect(!/github/i.test(auditorSource), "audit-model.mjs reaches no GitHub host either");
expect(auditorSource.includes("scorer, not a second checker"),
  "audit-model.mjs says in its own header that it originates no diagnostic");

/* The one-file build carries it too, or the shell that can reach nothing can
   ask only half the question. */
const standalone = readFileSync(root + "scripts/build-standalone-checker.mjs", "utf8");
expect(/SOURCES = \[[^\]]*"audit-model\.mjs"/.test(standalone),
  "the one-file checker embeds the audit as well as the checker");

/* Named where a reader will meet it: the header bullet, §8.5 and §10. */
expect((specText.match(/audit-model\.mjs/g) ?? []).length >= 4,
  "the audit is reachable from the header, §8.4, §8.5 and §10");
expect(/^### 8\.5 /m.test(specText), "§8.5 exists — the header and §10 both cite it");

/* ------------------------------- 6. llmdetailed.txt — the interactive §10 ---
 *
 * llms-full.txt is authored here; llmdetailed.txt is vendored from
 * app-with-ai-tanstack. So this section does not re-audit the language — it
 * holds the claims §10 makes about *the tooling it tells a model to run*,
 * which is exactly what goes stale when the file is re-vendored or when
 * check-model.mjs changes underneath it. Every one of these was verified by
 * hand once; that is the thing this section replaces.
 */

const detailed = readFileSync(root + "llmdetailed.txt", "utf8");
/* The enhancement editions. Each is its base with the authoring protocol
 * swapped for the enhancement protocol, derived by
 * scripts/build-llmtext-enhancement.mjs — so everything asserted below about a
 * base document has to hold for its enhancement edition too. */
const enhancements = {
  "llmtextenhancement.txt": readFileSync(root + "llmtextenhancement.txt", "utf8"),
  "llmdetailedenhancement.txt": readFileSync(root + "llmdetailedenhancement.txt", "utf8"),
};
/* The file is hard-wrapped, so any assertion about a *sentence* has to run
 * against a whitespace-collapsed copy — otherwise it silently passes or fails
 * on where the line happened to break. */
const detailedProse = detailed.replace(/\s+/g, " ");
const checkerSource = readFileSync(root + "guide/checker.js", "utf8");
const runnerSource = readFileSync(runner, "utf8");
let detailedFail = 0;
const held = (cond, label) => {
  if (cond) console.log(`ok   ${label}`);
  else { detailedFail++; console.log(`FAIL ${label}`); }
};

// Every diagnostic the document names must be one the engine can actually emit.
// A code invented for a table reads exactly like a real one to a language model.
const cited = [...new Set(detailed.match(/EML\d{3}/g) ?? [])].sort();
const unknown = cited.filter((code) => !checkerSource.includes(code));
held(cited.length >= 20 && unknown.length === 0,
  `every diagnostic llmdetailed.txt cites exists in the checker (${cited.length} codes${unknown.length ? ", missing: " + unknown.join(", ") : ""})`);

// The auto-fixable seven, against the engine rather than against a copy of the list.
held(AUTO_FIXABLE.every((code) => new RegExp(`\\| \`${code}\` \\|`).test(detailed)),
  `section 10.6 tabulates every auto-fixable code the checker reports (${AUTO_FIXABLE.join(", ")})`);
held(!/\bSeven codes are auto-fixable\b/.test(detailed) || AUTO_FIXABLE.length === 7,
  `section 10.6 counts the auto-repairs correctly (checker says ${AUTO_FIXABLE.length})`);

// The runner it tells a model to use, and the flags it promises that runner has.
// The host is pinned to the apex, not left as "either spelling". Pages issues a
// certificate for the domain in repository settings, so a `www.` label is
// refused over TLS — a published URL naming it sends a model to a failure it
// reads as "the checker is unavailable". That is the defect the guard below
// exists to prevent recurring.
held(/curl -sO https:\/\/www\.appwithai\.org\/guide\/check-model\.mjs/.test(detailed),
  "section 10.6 carries the one-line way to run the checker without a checkout");
for (const flag of ["--write", "--base"])
  held(detailed.includes(flag) && runnerSource.includes(flag),
    `section 10.6's \`${flag}\` is a flag check-model.mjs actually has`);
held(/exit 0[\s\S]{0,120}exit 1[\s\S]{0,120}exit 2/.test(detailed),
  "section 10.6 documents all three of the runner's exit codes");

// The central claim of the rewrite: GitHub is in none of the checker's paths.
// If the runner ever learns to fetch from GitHub, the document becomes wrong.
held(!/github/i.test(runnerSource),
  "check-model.mjs reaches no GitHub host, as section 10.6 tells the reader");
held(/failing to \*\*?\s*reach GitHub says nothing about whether the checker can run/i.test(detailedProse)
  || /reach GitHub says nothing about whether the checker can run/i.test(detailedProse),
  "section 10.6 states that an unreachable GitHub is not an unreachable checker");

/* The audit, in the vendored document too. This file is a straight copy from
 * app-with-ai-tanstack, so a re-vendor from a tree that predates the audit
 * would silently drop it while every other check here stayed green — and the
 * paragraph it replaced named a script in *this* repository that no reader of
 * that document has. */
held(/curl -sO https:\/\/www\.appwithai\.org\/guide\/audit-model\.mjs/.test(detailed),
  "llmdetailed.txt offers the checklist audit by URL, not a repository script");
/* The document keeps one mention of the old path, in a sentence saying it used
 * to be the instruction and why that was unfollowable. That is a
 * counter-example, so it is dropped by name before the scan — the same
 * treatment section 8 gives the bad-URL forms, and for the same reason: a
 * check that "corrects" it leaves a paragraph explaining nothing. */
const withoutHistory = detailed
  .split("\n")
  .filter((line) => !/paragraph used to name/.test(line) && !/in the website$/.test(line))
  .join("\n");
held(!/scripts\/check-model\.mjs/.test(withoutHistory),
  "…and no longer points a reader without a clone at scripts/check-model.mjs");

// Every rung of the ladder has to name something this site actually serves.
for (const rung of ["guide/check-model.mjs", "guide/audit-model.mjs", "guide/checker.js", "guide/fixer.js", "guide/11-check-a-model.html"])
  held(existsSync(root + rung) && detailed.includes(rung.replace("guide/", "")),
    `the ladder's ${rung} is published here and named in the document`);

/* The viewers. Section 10 sends a reader to /viewers/ at Phase 3 and names
 * three of its tabs; the page can move and a tab can be renamed, and a model
 * following a stale instruction sends its user to a 404 in the middle of a
 * walkthrough. The upstream repository holds the document to the same claims
 * where it is authored; this holds the copy to what *this host* serves. */
// The apex, for the same reason as above: a `www.` URL here would send a reader
// mid-walkthrough to a certificate error rather than to the viewers.
held(/https:\/\/www\.appwithai\.org\/viewers\//.test(detailed),
  "section 10 names the model viewers by their published URL");
for (const file of ["viewers/index.html", "viewers/eml-model.js", "viewers/model-viewer.js", "viewers/viewers.css"])
  held(existsSync(root + file), `${file} is published here — section 10 sends readers to it`);

const viewerPage = readFileSync(root + "viewers/index.html", "utf8");
const viewerTabs = [...viewerPage.matchAll(/data-tab="[^"]+">([^<]+)</g)].map((m) => m[1].trim());
for (const named of ["Workflows", "Business rules", "Access"])
  held(viewerTabs.includes(named) && detailedProse.includes(`**${named}**`),
    `the "${named}" tab section 10 names exists on the viewer page`);

/* Watching a file is Chromium-only. Recommending it without saying so is how a
 * reader on Firefox concludes the page is broken. */
held(/File System Access API/.test(detailedProse) && /Watch a file/.test(detailedProse),
  "section 10 says which browsers can watch a file");
held(readFileSync(root + "viewers/model-viewer.js", "utf8").includes("showOpenFilePicker"),
  "the viewers really gate watching on the File System Access API");

// Cross-references inside the file must resolve, or the ladder sends a reader nowhere.
const headings = new Set([...detailed.matchAll(/^#{2,4} (\d+(?:\.\d+)*)[. ]/gm)].map((m) => m[1]));
const referenced = [...new Set([...detailed.matchAll(/§(\d+\.\d+)/g)].map((m) => m[1]))];
const dangling = referenced.filter((ref) => !headings.has(ref));
held(dangling.length === 0,
  `every §N.N cross-reference in llmdetailed.txt resolves to a heading${dangling.length ? " (dangling: " + dangling.join(", ") + ")" : ""}`);

/* Three observed failures were one URL failing, generalised into "no validation
 * is possible" — in one case the blocked URL was llmdetailed.txt itself. */
held(/needs no specification document at all/i.test(detailedProse),
  "section 10.6 separates fetching the spec from running the checker");
held(/Perform the validation; do not offer it/i.test(detailedProse),
  "section 10.6 requires the run rather than offering it");

/* Directive status: a document that calls a compiled directive inert tells a
 * model its help text does nothing. %%entity help: becomes sys_table.description
 * and the whole of the generated manual's prose, and §11 rule 2 called it
 * "validated but not compiled" while the same file's own table said compiled.
 * The authority (language/appwithai-language.json) lives upstream, so what is
 * held here is each document against its own status table. */
for (const [file, body] of [["llmdetailed.txt", detailed], ["llms-full.txt", spec.join("\n")], ...Object.entries(enhancements)]) {
  const compiled = [...body.matchAll(/^\| `%%(\w+)` \|[^\n]*\bcompiled\b[^\n]*$/gm)].map((m) => m[1]);
  held(compiled.length >= 8, `${file}: its directive table marks the compiled directives (${compiled.length})`);
  const flat = body.replace(/\s+/g, " ");
  for (const directive of compiled) {
    held(
      !new RegExp(`%%${directive}\`?,? (and )?[^.]{0,60}are validated but not compiled`).test(flat),
      `${file}: prose does not call the compiled %%${directive} "validated but not compiled"`
    );
  }
}

// The per-step rule, which is the other half of what §10 now promises.
held(/every step that touches the `\.mmd`/i.test(detailedProse),
  "section 10 binds the fixer-then-checker loop to every step, not only to phase 6");


/* ------------------------------- 7. the enhancement editions ---------------
 *
 * `llmtextenhancement.txt` and `llmdetailedenhancement.txt` take an existing
 * `.mmd` and change it, where their base documents write one from a brief.
 * They are *derived* from those bases — the whole language reference is copied,
 * only the protocol section differs — so the first thing held here is that the
 * derivation is current. The rest holds the four claims that make an
 * enhancement protocol different from an authoring one, each of which was a
 * real failure before it was a rule: starting without the user's file,
 * rebuilding the model from memory, answering with a patch, and handing back a
 * model that checks clean and is quietly smaller than the one that came in.
 */

let enhancementFail = 0;
const enh = (cond, label) => {
  if (cond) console.log(`ok   ${label}`);
  else { enhancementFail++; console.log(`FAIL ${label}`); }
};

/* The derivation itself. A base edited without rebuilding its enhancement
 * edition is the only way these four documents can disagree about the
 * language, and it is exactly the failure the deriver exists to prevent. */
const built = spawnSync(process.execPath, [root + "scripts/build-llmtext-enhancement.mjs", "--check"], { encoding: "utf8" });
enh(built.status === 0,
  `both enhancement editions are current against their bases${built.status === 0 ? "" : "\n" + built.stdout}`);

/* The language half is the base's, byte for byte. Asserted directly as well as
 * through the deriver, because this is the property that matters and it should
 * fail by name rather than as "the build is stale". */
const tailFrom = (body, heading) => body.slice(body.search(heading));
enh(tailFrom(enhancements["llmtextenhancement.txt"], /^## 2\. /m) === tailFrom(spec.join("\n"), /^## 2\. /m),
  "llmtextenhancement.txt carries llms-full.txt's language reference unchanged");
enh(tailFrom(enhancements["llmdetailedenhancement.txt"], /^## 11\. /m) === tailFrom(detailed, /^## 11\. /m),
  "llmdetailedenhancement.txt carries llmdetailed.txt's closing section unchanged");

for (const [name, body] of Object.entries(enhancements)) {
  const prose = body.replace(/\s+/g, " ");

  /* A code invented for a table reads exactly like a real one to a model. */
  const cited = [...new Set(body.match(/EML\d{3}/g) ?? [])].sort();
  const missing = cited.filter((code) => !checkerSource.includes(code));
  enh(cited.length >= 20 && missing.length === 0,
    `${name}: every diagnostic it cites exists in the checker (${cited.length} codes${missing.length ? ", missing: " + missing.join(", ") : ""})`);

  /* Cross-references must resolve, or a ladder sends the reader nowhere. */
  const heads = new Set([...body.matchAll(/^#{2,4} (\d+(?:\.\d+)*)[. ]/gm)].map((m) => m[1]));
  const dangling = [...new Set([...body.matchAll(/§(\d+\.\d+)/g)].map((m) => m[1]))].filter((r) => !heads.has(r));
  enh(dangling.length === 0,
    `${name}: every §N.N cross-reference resolves${dangling.length ? " (dangling: " + dangling.join(", ") + ")" : ""}`);

  /* 1 — it has an input, and it asks for it. A protocol that does not say this
   * gets a model invented from the conversation, which is the authoring
   * protocol run under the wrong name. */
  enh(/load (?:their|your) `?\.mmd`?|Send me the `\.mmd`/i.test(prose),
    `${name}: asks the user to load their .mmd before anything else`);
  enh(/Never reconstruct the model/i.test(prose),
    `${name}: forbids reconstructing the model from memory or the conversation`);

  /* 2 — the deliverable is the whole file. The observed failure is a reply of
   * "add these lines", which makes the user perform the merge. */
  enh(/Not a patch\. Not a diff\.|Not a diff, not a patch/i.test(prose),
    `${name}: says the deliverable is the whole model, not a patch or a diff`);
  enh(/\.mmd/.test(body) && /one file/i.test(prose),
    `${name}: still delivers exactly one .mmd`);

  /* 3 — baseline before editing, so a diagnostic can be attributed. */
  enh(/baseline/i.test(prose) && /inventor/i.test(prose),
    `${name}: baselines and inventories the model before it is edited`);

  /* 4 — the regression comparison. This is the half no tool performs, and the
   * reason both documents exist rather than a sentence in the base ones. */
  enh(/%%report/.test(body) && /(nothing was lost|nothing lost|regression)/i.test(prose),
    `${name}: compares the result against the baseline to prove nothing was lost`);
  enh(/help text/i.test(prose) && /%%rbac/.test(body),
    `${name}: names help text and %%rbac among what an enhancement silently drops`);

  /* The four protocols have to be findable from any one of them, or a reader
   * lands on the enhancement form for a model that does not exist yet. */
  for (const sibling of ["llms-full.txt", "llmdetailed.txt", "llmtextenhancement.txt", "llmdetailedenhancement.txt"])
    if (sibling !== name)
      enh(body.includes(sibling), `${name}: names its companion ${sibling}`);
}

/* The interactive edition is held to every tooling claim llmdetailed.txt is
 * held to above — it carries the same §10.6, spliced by the deriver, so these
 * pass for free and fail loudly if that splice is ever replaced by prose. */
const interactive = enhancements["llmdetailedenhancement.txt"];
const interactiveProse = interactive.replace(/\s+/g, " ");
enh(/curl -sO https:\/\/www\.appwithai\.org\/guide\/check-model\.mjs/.test(interactive),
  "llmdetailedenhancement.txt carries the one-line way to run the checker");
for (const flagName of ["--write", "--base"])
  enh(interactive.includes(flagName) && runnerSource.includes(flagName),
    `llmdetailedenhancement.txt's \`${flagName}\` is a flag check-model.mjs actually has`);
enh(/exit 0[\s\S]{0,120}exit 1[\s\S]{0,120}exit 2/.test(interactive),
  "llmdetailedenhancement.txt documents all three of the runner's exit codes");
enh(AUTO_FIXABLE.every((code) => new RegExp(`\\| \`${code}\` \\|`).test(interactive)),
  `llmdetailedenhancement.txt tabulates every auto-fixable code (${AUTO_FIXABLE.join(", ")})`);
enh(/https:\/\/www\.appwithai\.org\/viewers\//.test(interactive),
  "llmdetailedenhancement.txt names the model viewers by their published URL");
for (const named of ["Workflows", "Business rules", "Access"])
  enh(viewerTabs.includes(named) && interactiveProse.includes(`**${named}**`),
    `llmdetailedenhancement.txt: the "${named}" tab it names exists on the viewer page`);
enh(/File System Access API/.test(interactiveProse) && /Watch a file/.test(interactiveProse),
  "llmdetailedenhancement.txt says which browsers can watch a file");
enh(/every step that touches the `\.mmd`/i.test(interactiveProse),
  "llmdetailedenhancement.txt binds the fixer-then-checker loop to every step");
enh(/Perform the validation; do not offer it/i.test(interactiveProse),
  "llmdetailedenhancement.txt requires the run rather than offering it");

/* The gates are the substance of the interactive form. A phase list with no
 * gate in it is the batch protocol wearing the other file's name. */
for (const gate of ["Gate A", "Gate B", "Gate C", "Gate D", "Gate E"])
  enh(interactive.includes(gate), `llmdetailedenhancement.txt keeps ${gate}`);
enh(/00-original\.mmd/.test(interactive),
  "llmdetailedenhancement.txt keeps the original untouched as the thing to compare against");

console.log(`\n${enhancementFail === 0 ? "enhancement editions hold." : enhancementFail + " enhancement claim(s) contradicted."}`);


/* ---------------------------------------------------------------------------
 * The published host, and why the guard that used to sit here is gone.
 *
 * It forbade `www.appwithai.org` anywhere in the tree. GitHub Pages issues a
 * certificate for the domain configured in repository settings, and `www` was
 * a DNS record onto the apex rather than a delegation to the Pages host — so
 * it resolved, reached the edge, and was refused with
 * ERR_CERT_COMMON_NAME_INVALID. A model told to curl such a URL reported the
 * checker as unavailable and its validation state as "not determinable".
 *
 * `www` is now a CNAME onto `businessappwithai.github.io`, Pages has issued a
 * certificate for it, and it serves directly — verified in a browser. The
 * guard named that exact condition for its own deletion ("if `www.` is ever
 * given a certificate of its own, delete this guard deliberately"), so it is
 * deleted rather than widened, and `www` is the canonical published form.
 *
 * What replaces it is section 8 below, which is the check that still has
 * something to catch: the canonical form in every document, and the three
 * spellings that fail — a bare host, a Markdown link around one, and a host
 * without a scheme.
 * ------------------------------------------------------------------------- */
let hostFail = 0;


/* ------------------------------- 8. the published host, written in full ----
 *
 * A model following these documents reported a failed validator fetch as
 * `[appwithai.org](https://www.appwithai.org)` — a Markdown link whose text
 * is a bare host. That is what the documents taught it: they named the host
 * without a scheme in prose, and half their URLs used a label with no certificate.
 * Both are fixed,
 * and this is what stops either coming back.
 *
 * Every mention of the host must be `https://www.appwithai.org`. The three
 * passages that deliberately show another form are teaching material — the rule
 * itself, and the two sentences contrasting the apex with `www` — so they are
 * removed before the scan rather than special-cased inside it.
 */

const host = (cond, label) => {
  if (cond) console.log(`ok   ${label}`);
  else { hostFail++; console.log(`FAIL ${label}`); }
};

/* The counter-examples, verbatim. Each one exists to show a reader what NOT to
   write, so each must survive canonicalisation — and be excluded from it. */
const TEACHING = [
  "`appwithai.org/guide/checker.js` is a string a",
  "`[appwithai.org](https://www.appwithai.org)` reads to a person as a working",
  "- **The apex is not the canonical form.** `https://appwithai.org/…` serves the same files and",
  "  is the domain the repository's `CNAME` pins, but `https://www.appwithai.org/…`",
  "  `https://appwithai.org` serves the same files, but the `www.` form is the canonical one.",
  '*"Validator retrieval failed for appwithai.org"* says neither',
  "is the canonical host and the apex `https://appwithai.org` serves the same",
];

for (const [name, body] of [
  ["llms-full.txt", spec.join("\n")],
  ["llmdetailed.txt", detailed],
  ...Object.entries(enhancements),
]) {
  const teachable = body.split("\n").filter((line) => !TEACHING.some((t) => line.includes(t)));
  const stray = teachable
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /appwithai\.org/.test(line.replace(/https:\/\/www\.appwithai\.org/g, "")));

  host(stray.length === 0,
    `${name}: every mention of the host is https://www.appwithai.org${
      stray.length ? ` (${stray.length} stray, first: "${stray[0].line.trim().slice(0, 72)}")` : ""
    }`);

  /* The rule has to actually be in the document, or the scan above is passing
     over a file that never tells the reader which form to write. */
  host(body.includes("Write the URL in full, every time"),
    `${name}: carries the rule that the URL is written in full`);
  host(/Report the URL you actually requested/.test(body.replace(/\s+/g, " ")),
    `${name}: tells the reader to report the URL actually requested`);

  /* And the counter-examples have to survive, or the rule teaches nothing. */
  host(body.includes("[appwithai.org](https://www.appwithai.org)"),
    `${name}: keeps the Markdown-link counter-example the rule is about`);
}

/* The pages are held to the same form: a prompt is a URL a reader pastes. */
for (const page of ["index.html", "try-it-yourself.html"]) {
  const markup = readFileSync(root + page, "utf8");
  const bare = [...markup.matchAll(/[^/w.]((?:www\.)?appwithai\.org)/g)].map((m) => m[1]);
  host(bare.length === 0,
    `${page}: names the host only as https://www.appwithai.org${bare.length ? ` (${bare.length} bare)` : ""}`);
}

console.log(`\n${hostFail === 0 ? "the published host is written in full everywhere." : hostFail + " host spelling(s) wrong."}`);


process.exit(exampleFailures + fail + runnerFail + detailedFail + enhancementFail + hostFail === 0 ? 0 : 1);
