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
const t = (name, src, expect = "clean") => {
  const r = check(src);
  const bad = expect === "clean"
    ? r.counts.errors > 0 || r.counts.warnings > 0
    : !r.issues.some((i) => i.code === expect);
  if (bad) {
    fail++;
    console.log(`FAIL ${name} -> ${JSON.stringify(r.counts)} ${r.issues.map((i) => i.code + ":" + i.message).slice(0,3).join(" | ")}`);
  } else pass++;
};
const say = (cond, label) => { if (cond) pass++; else { fail++; console.log("FAIL  " + label); } };
const erd = (body, extra = "") => `%%meta name: Audit\n%%meta kind: erd\n${extra}erDiagram\n${body}\n`;

// --- 1. version and auto-fixable list (header + §8.3) -----------------------
const expectedFixable = ["EML001", "EML114", "EML117", "EML421", "EML422"];
say(LANGUAGE_VERSION === "1.2.0", `header states EML version 1.2.0 (checker says ${LANGUAGE_VERSION})`);
say(AUTO_FIXABLE.join(",") === expectedFixable.join(","), `section 8.3 lists the five auto-repairs (checker says ${AUTO_FIXABLE.join(", ")})`);

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
t("step REST with a space before https raises EML262", saga("    %%step B REST method: POST url: https://hooks.example.com/notify", "    A([Start]) --> B(Call)\n    B --> Z([End])"), "EML262");
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
for (const column of ["approver_id", "assigned_to_id"])
  t(`person column ${column} does not resolve — EML502`, person(column), "EML502");
t("assigned_to is recognised but does not end _id — EML114", person("assigned_to"), "EML114");

// §7 — %%meta stack takes one of two values (EML003).
for (const stack of ["tanstack-start-nestjs", "openui5-odatav4"])
  t(`%%meta stack: ${stack}`, `%%meta name: Audit\n%%meta kind: erd\n%%meta stack: ${stack}\nerDiagram\n    Thing {\n        string id PK\n    }\n`);
t("%%meta stack carrying anything else raises EML003", `%%meta name: Audit\n%%meta kind: erd\n%%meta stack: AppWithAI EML 1.2.0\nerDiagram\n    Thing {\n        string id PK\n    }\n`, "EML003");

console.log(`${pass} claims verified, ${fail} contradicted`);

/* ------------------------------- 4. the runner §8.4 tells a model to use ---- */

const runner = root + "guide/check-model.mjs";
const specText = spec.join("\n");
const command = "curl -sO https://appwithai.org/guide/check-model.mjs\nnode check-model.mjs my-business.mmd";

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

process.exit(exampleFailures + fail + runnerFail === 0 ? 0 : 1);
