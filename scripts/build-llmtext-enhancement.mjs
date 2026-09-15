#!/usr/bin/env node
/**
 * Derive an enhancement document from the base specification it accompanies.
 *
 * `llmtextenhancement.txt` and `llmdetailedenhancement.txt` are the same
 * documents as `llms-full.txt` and `llmdetailed.txt` with one section swapped:
 * the authoring protocol becomes the enhancement protocol. Everything else —
 * the whole language reference — is carried across byte for byte.
 *
 * That is deliberate, and it is why this script exists rather than two more
 * hand-written specifications. Four documents describing one language, each
 * maintained separately, is four answers to "what does %%rbac do" and three of
 * them go stale silently. Here the language half cannot drift: it is copied,
 * and `scripts/check-spec.mjs` asserts it is still identical to the base.
 *
 *   node scripts/build-llmtext-enhancement.mjs            # rebuild both
 *   node scripts/build-llmtext-enhancement.mjs --check     # fail if stale
 *
 * A base living somewhere else — the copies under `website/llmtext/` in the
 * product repositories — is derived by passing its path:
 *
 *   node scripts/build-llmtext-enhancement.mjs \
 *     --base ../app-with-ai-tanstack/website/llmtext/llmdetailed.txt \
 *     --protocol interactive \
 *     --out  ../app-with-ai-tanstack/website/llmtext/llmdetailedenhancement.txt
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const src = root + "scripts/llmtext/";

/* The two shapes. `protocol` names which source pair is used; `heading` is the
   regular expression that finds the section being replaced in the base. */
const SHAPES = {
  batch: {
    protocol: src + "protocol-batch-enhancement.md",
    header: src + "header-batch-enhancement.md",
    heading: /^## (\d+)\. Authoring protocol\b/m,
  },
  interactive: {
    protocol: src + "protocol-interactive-enhancement.md",
    header: src + "header-interactive-enhancement.md",
    heading: /^## (\d+)\. Interactive authoring protocol\b/m,
  },
};

/* The default pair: this site's own published documents. */
const DEFAULTS = [
  { base: root + "llms-full.txt", shape: "batch", out: root + "llmtextenhancement.txt" },
  { base: root + "llmdetailed.txt", shape: "interactive", out: root + "llmdetailedenhancement.txt" },
];

/** The base's own §N.6 tooling subsections, spliced in wherever the protocol
 *  asks for them. Carrying the real ones across rather than restating them is
 *  what keeps every claim about the checker — its flags, its exit codes, the
 *  offline ladder — true in the enhancement editions for free. */
const toolsOf = (section) => {
  const from = section.indexOf("#### The tools");
  if (from === -1) return null;
  /* Everything from there to the end of that subsection — i.e. up to the next
     `### ` heading, which opens the following phase. */
  const rest = section.slice(from);
  /* Ends at the next *numbered* `### ` heading — the following phase. Matching
     a bare `### ` would stop at any heading inside a fenced example. */
  const to = rest.search(/\n### \d/);
  return (to === -1 ? rest : rest.slice(0, to)).replace(/\s+$/, "");
};

const derive = ({ base, shape }) => {
  const spec = SHAPES[shape];
  const doc = readFileSync(base, "utf8");

  /* 1. The header: everything before the first horizontal rule. */
  const rule = doc.indexOf("\n---\n");
  if (rule === -1) throw new Error(`${base}: no header rule found`);
  const headerSource = readFileSync(spec.header, "utf8");

  /* 2. The protocol section: from its heading to the next `## ` heading. */
  const match = spec.heading.exec(doc);
  if (!match) throw new Error(`${base}: no ${shape} authoring protocol section found`);
  const number = match[1];
  const start = match.index;
  /* The section ends at the next *numbered* `## ` heading. A bare `## ` match
     is wrong and was: both base documents quote a markdown document inside a
     fenced block — a per-entity dossier whose own headings are `## Fields`,
     `## Enums` — so the search stopped inside the fence and left the tail of
     the old protocol stranded after the new one. Nothing about the result
     looked broken; it checked clean and read as a document with an extra
     entity dossier bolted to the end of it. */
  const after = doc.slice(start + match[0].length).search(/\n## \d+\. /);
  if (after === -1) throw new Error(`${base}: the protocol section does not end`);
  const end = start + match[0].length + after + 1;

  /* The header names this document's own protocol section, which is numbered
     differently in each base shape — §1 in the language-only edition, §10 in
     the system edition — so it carries the same token the protocol does. */
  const header = headerSource.replace(/\{\{N\}\}/g, number).replace(/\s+$/, "");

  let protocol = readFileSync(spec.protocol, "utf8")
    .replace(/\{\{N\}\}/g, number)
    .replace(/\s+$/, "");

  /* 3. The tooling splice, where the protocol asks for it. */
  if (protocol.includes("{{TOOLS}}")) {
    const tools = toolsOf(doc.slice(start, end));
    if (!tools) throw new Error(`${base}: no "#### The tools" subsection to splice`);
    protocol = protocol.replace("{{TOOLS}}", tools);
  }

  const out = header + doc.slice(rule, start) + protocol + "\n\n" + doc.slice(end);

  /* No template token may survive into a published document. One did — `{{N}}`
     in the header, because the header was read before the section number was
     known — and it shipped looking like part of the prose. */
  const leftover = out.match(/\{\{[A-Z]+\}\}/);
  if (leftover) throw new Error(`${base}: ${leftover[0]} was never substituted`);
  return out;
};

/* --------------------------------------------------------------- arguments */

const argv = process.argv.slice(2);
const flag = (name) => {
  const at = argv.indexOf(`--${name}`);
  return at === -1 ? null : argv[at + 1];
};
const check = argv.includes("--check");

const jobs = flag("base")
  ? [{ base: flag("base"), shape: flag("protocol") ?? "interactive", out: flag("out") }]
  : DEFAULTS;

let stale = 0;
for (const job of jobs) {
  if (!job.out) throw new Error("--base needs --out");
  if (!existsSync(job.base)) {
    console.log(`skip  ${job.base} — not present here`);
    continue;
  }
  const derived = derive(job);
  const current = existsSync(job.out) ? readFileSync(job.out, "utf8") : null;
  if (current === derived) {
    console.log(`ok    ${job.out.replace(root, "")} — up to date`);
  } else if (check) {
    stale++;
    console.log(`STALE ${job.out.replace(root, "")} — rebuild with: node scripts/build-llmtext-enhancement.mjs`);
  } else {
    writeFileSync(job.out, derived);
    console.log(`wrote ${job.out.replace(root, "")} (${derived.length} bytes)`);
  }
}

process.exit(stale === 0 ? 0 : 1);
