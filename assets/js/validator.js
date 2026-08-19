/**
 * The published EML validators, wired to a page.
 *
 * `guide/checker.js` and `guide/fixer.js` are the two files §10.3 of the
 * specification tells a language model to import before handing a model to
 * anyone. They are bundled from `language/checker.ts` and `language/fixer.ts` —
 * the same engines the command line runs, not a lighter web edition — and this
 * file is only a front end for them: it reads a document, calls `check` or
 * `checkAndFix`, and renders what comes back.
 *
 * That distinction matters more than it looks. If this page implemented its own
 * validation, a model could pass here and fail in the generator, and a reader
 * would have no way to tell which one was lying. Everything below goes through
 * the published modules, at the published URLs, so what this page says is what
 * `erdwithai` will say.
 */

import { check, formatReport, AUTO_FIXABLE, LANGUAGE_VERSION } from "../../guide/checker.js";
import { checkAndFix } from "../../guide/fixer.js";

const EXAMPLES = {
  crm: { path: "models/crm.eml.mmd", label: "crm.eml.mmd" },
  drug: { path: "models/drug-discovery.eml.mmd", label: "drug-discovery.eml.mmd" },
};

/**
 * A small document with four faults in it, so the failure path can be seen
 * without having to break an 1,100-line model by hand.
 *
 * One error the fixer cannot touch — an `%%index` on an entity nobody declared,
 * which needs a person to say whether the index or the entity was the mistake —
 * and three warnings it can: no document name, a foreign key that does not end
 * in `_id`, and an entity with no primary key. Pressing Check and then Check and
 * repair shows both halves of the contract: what gets repaired, and what is
 * handed back untouched because guessing would be worse.
 */
const BROKEN = `erDiagram
    %%enum OrderStatus: draft, placed, shipped

    CUSTOMER {
        uuid id PK
        string email
        string name
    }

    ORDER {
        uuid id PK
        uuid customer FK
        string status
        decimal total
    }

    ORDER_LINE {
        uuid order_id FK
        string sku
        int quantity
    }

    CUSTOMER ||--o{ ORDER : places
    ORDER ||--o{ ORDER_LINE : contains

    %%field ORDER.status enum: OrderStatus
    %%index SHIPMENT(order_id)
`;

const $ = (id) => document.getElementById(id);
const state = { label: "crm.eml.mmd" };

/* --------------------------------------------------------------- the model */

async function load(key) {
  for (const id of ["choice-crm", "choice-drug", "choice-broken", "choice-paste"]) {
    $(id).setAttribute("aria-pressed", String(id === `choice-${key}`));
  }

  if (key === "paste") {
    state.label = "your model";
    $("model").value = "";
    $("model").focus();
    reset();
    return;
  }

  if (key === "broken") {
    state.label = "tiny-shop.mmd";
    $("model").value = BROKEN;
    reset();
    return;
  }

  const example = EXAMPLES[key];
  state.label = example.label;
  $("model").value = "Loading…";
  reset();
  try {
    const response = await fetch(example.path, { cache: "no-store" });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    $("model").value = await response.text();
  } catch (error) {
    $("model").value = "";
    report(`<div class="failure">Could not load ${example.label}: ${escapeHtml(error.message)}</div>`);
  }
}

function reset() {
  $("check-result").classList.remove("is-shown");
  $("check-result").innerHTML = "";
  $("download-fixed").hidden = true;
}

/* ------------------------------------------------------------------ render */

function report(html) {
  $("check-result").innerHTML = html;
  $("check-result").classList.add("is-shown");
}

const cell = (value, label) =>
  `<div class="tally__cell"><span class="tally__value">${value}</span><span class="tally__label">${label}</span></div>`;

function tally(counts, extra = "") {
  return `<div class="tally">
    ${cell(counts.errors, "Errors")}
    ${cell(counts.warnings, "Warnings")}
    ${cell(counts.infos, "Infos")}
    ${extra}
  </div>`;
}

/**
 * One diagnostic per row, worst first — the order `check` already returns them
 * in, because the first line of a report should be the thing that stops the
 * generator rather than the thing that happened to be on an earlier line.
 */
function diagnostics(issues) {
  if (!issues.length) return "";
  return `<h4>Diagnostics</h4><ul class="diags">${issues
    .map(
      (issue) => `<li class="diag diag--${issue.severity}">
        <span class="diag__sev">${issue.severity}</span>
        <span class="diag__code">${escapeHtml(issue.code)}</span>
        ${issue.line ? `<span class="diag__line">line ${issue.line}</span>` : ""}
        <span class="diag__msg">${escapeHtml(issue.message)}</span>
        ${issue.hint ? `<span class="diag__hint">${escapeHtml(issue.hint)}</span>` : ""}
        ${issue.autoFixable ? `<span class="diag__hint"><b>Repairable</b> — “Check and repair” fixes this one.</span>` : ""}
      </li>`
    )
    .join("")}</ul>`;
}

function verdict(ok, counts) {
  if (ok && !counts.warnings) return `<div class="verdict verdict--ok">Clean. <code>erdwithai generate</code> will accept this model.</div>`;
  if (ok) return `<div class="verdict verdict--warn">No errors, but ${counts.warnings} warning(s). Warnings describe something the generator accepts and quietly gets wrong — clear them, or be able to say why you left them.</div>`;
  return `<div class="verdict verdict--bad">${counts.errors} error(s). The generator would refuse this model; do not hand it over in this state.</div>`;
}

/* ---------------------------------------------------------------- the runs */

$("check").addEventListener("click", () => {
  const source = $("model").value;
  if (!source.trim()) return report(`<div class="failure">There is no model to check.</div>`);

  const result = check(source);
  $("download-fixed").hidden = true;
  report(
    verdict(result.ok, result.counts) +
      tally(result.counts) +
      diagnostics(result.issues) +
      `<h4>As text</h4><pre class="report"><code>${escapeHtml(formatReport(result))}</code></pre>`
  );
});

$("fix").addEventListener("click", () => {
  const source = $("model").value;
  if (!source.trim()) return report(`<div class="failure">There is no model to repair.</div>`);

  const result = checkAndFix(source);
  $("model").value = result.source;

  const applied = result.fixes.filter((fix) => fix.applied);
  const extra = cell(applied.length, "Repairs");

  report(
    verdict(result.ok, result.counts) +
      tally(result.counts, extra) +
      (result.repaired
        ? `<h4>What was repaired</h4><ul class="diags">${applied
            .map(
              (fix) =>
                `<li class="diag diag--fixed"><span class="diag__sev">fixed</span>` +
                `<span class="diag__code">${escapeHtml(fix.code ?? "")}</span>` +
                `<span class="diag__msg">${escapeHtml(fix.message ?? fix.description ?? "repaired")}</span></li>`
            )
            .join("")}</ul>`
        : `<p class="result__note">Nothing was auto-repairable. The five codes this can repair are
           <code>${AUTO_FIXABLE.join("</code>, <code>")}</code>; everything else needs a person or a
           model to decide what was meant.</p>`) +
      diagnostics(result.remaining)
  );

  $("download-fixed").hidden = !result.repaired;
});

/**
 * Hand the repaired document back as a file.
 *
 * §10.4 asks for a file rather than a fenced block someone has to copy out of a
 * chat log, and the same courtesy applies here.
 */
$("download-fixed").addEventListener("click", () => {
  const blob = new Blob([$("model").value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = state.label.endsWith(".mmd") ? state.label : "model.mmd";
  link.click();
  URL.revokeObjectURL(url);
});

/* ------------------------------------------------------------------- input */

$("choice-crm").addEventListener("click", () => load("crm"));
$("choice-drug").addEventListener("click", () => load("drug"));
$("choice-broken").addEventListener("click", () => load("broken"));
$("choice-paste").addEventListener("click", () => load("paste"));

$("file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  state.label = file.name;
  $("model").value = await file.text();
  for (const id of ["choice-crm", "choice-drug", "choice-broken", "choice-paste"]) {
    $(id).setAttribute("aria-pressed", "false");
  }
  reset();
});

$("model").addEventListener("input", reset);

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]
  );
}

/* Stamp the language version the published modules were built against, so the
   page cannot claim a version it is not actually running. */
for (const node of document.querySelectorAll("[data-eml-version]")) {
  node.textContent = LANGUAGE_VERSION;
}

await load("crm");
