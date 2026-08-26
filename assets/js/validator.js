/**
 * The published EML validators, wired to a page.
 *
 * `guide/checker.js` and `guide/fixer.js` are the two files §1.3 and §8 of the
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

/*
 * Analytics — see assets/js/analytics.js, which owns every decision about what
 * these mean. `window.awTrack` is a no-op when analytics are off or absent, so
 * these lines are unconditional. The codes travel; the messages do not, because
 * a message carries the reader's own entity names.
 */
const verdictOf = (result, extra) => ({
  model_name: state.label,
  checker_error_count: result.counts.errors,
  checker_warning_count: result.counts.warnings,
  checker_info_count: result.counts.infos,
  codes: [...new Set(result.issues.filter((i) => i.severity === "error").map((i) => i.code))],
  ...extra,
});

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

/**
 * `EML004` is the one diagnostic that is usually not about the model at all.
 *
 * It is what an *enhanced specification* scores — the document a language model
 * writes about the application it would build, instead of the `.mmd` §1.2 asks
 * for. The checker is right and its message is accurate, but "empty document"
 * reads as a puzzle when the thing in the box is four hundred lines long, so
 * this says what it means in the reader's terms. Nothing here decides anything:
 * it renders only when the published checker has already returned the code.
 */
function notAModel(issues) {
  if (!issues.some((issue) => issue.code === "EML004")) return "";
  return `<p class="result__note"><b>This looks like a document about a model, not a model.</b>
    There is no <code>erDiagram</code>, <code>flowchart</code> or <code>stateDiagram-v2</code> in it,
    so there is nothing for the generator to read — headings and bullet lists describing entities are
    prose to the parser, however thorough they are. If a language model answered you with a
    specification, ask it again for the file itself: one <code>.mmd</code>, every line Mermaid or an
    EML <code>%%</code> directive, as
    <a href="../llms-full.txt">section 1 of the specification</a> requires. If it answered with a
    report that contains the model in a fenced block, paste the contents of that block here
    instead.</p>`;
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

  window.awTrack?.("checker_started", { model_name: state.label, mode: "check" });
  const startedAt = performance.now();
  const result = check(source);
  window.awTrack?.(
    result.ok ? "checker_passed" : "checker_failed",
    verdictOf(result, {
      mode: "check",
      model_size: new Blob([source]).size,
      check_time_ms: Math.round(performance.now() - startedAt),
    })
  );
  $("download-fixed").hidden = !result.ok;
  report(
    verdict(result.ok, result.counts) +
      tally(result.counts) +
      notAModel(result.issues) +
      diagnostics(result.issues) +
      `<h4>As text</h4><pre class="report"><code>${escapeHtml(formatReport(result))}</code></pre>`
  );
});

$("fix").addEventListener("click", () => {
  const source = $("model").value;
  if (!source.trim()) return report(`<div class="failure">There is no model to repair.</div>`);

  window.awTrack?.("checker_started", { model_name: state.label, mode: "fix" });
  const startedAt = performance.now();
  const result = checkAndFix(source);
  $("model").value = result.source;

  const applied = result.fixes.filter((fix) => fix.applied);
  window.awTrack?.(
    result.ok ? "checker_passed" : "checker_failed",
    verdictOf(result, {
      mode: "fix",
      model_size: new Blob([source]).size,
      fixes_applied: applied.length,
      check_time_ms: Math.round(performance.now() - startedAt),
    })
  );
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
      notAModel(result.remaining) +
      diagnostics(result.remaining)
  );

  $("download-fixed").hidden = !result.ok;
});

/**
 * Hand the document back as a file — but only a document the generator would
 * accept. The button appears when a run comes back with no errors, whether it
 * needed repairs or not, and stays hidden when errors remain: handing someone a
 * file that `erdwithai generate` will refuse is the failure this page exists to
 * catch, not a convenience.
 *
 *
 * §1.4 asks for a file rather than a fenced block someone has to copy out of a
 * chat log, and the same courtesy applies here — including to the reader whose
 * model arrived as a fenced block in a report and was pasted into this box. The
 * name follows §1.2: the business name from `%%meta name:`, lower-cased and
 * hyphenated, so what lands in the downloads folder is what the specification
 * asked the model to deliver in the first place.
 */
function fileName(source) {
  const declared = source.match(/^\s*%%meta\s+name:\s*(.+)$/m)?.[1]?.trim();
  const slug = declared
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug) return `${slug}.mmd`;
  return state.label.endsWith(".mmd") ? state.label : "model.mmd";
}

$("download-fixed").addEventListener("click", () => {
  window.awTrack?.("model_downloaded", { model_name: state.label });
  const blob = new Blob([$("model").value], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName($("model").value);
  link.click();
  URL.revokeObjectURL(url);
});

/* ------------------------------------------------------------------- input */

$("choice-crm").addEventListener("click", () => load("crm"));
$("choice-drug").addEventListener("click", () => load("drug"));
$("choice-broken").addEventListener("click", () => load("broken"));
$("choice-paste").addEventListener("click", () => {
  window.awTrack?.("upload_started", { method: "paste" });
  load("paste");
});

$("file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  state.label = file.name;
  $("model").value = await file.text();
  window.awTrack?.("model_uploaded", {
    model_name: file.name,
    model_size: file.size,
    model_source: "upload",
  });
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

/*
 * Stamp the real URLs of the published modules.
 *
 * The specification quotes them under appwithai.org, and the page is written
 * that way because that is what §8 says. But a reader looking at a staging
 * host, a fork's github.io address or a local server would be copying a URL that
 * does not serve them the file in front of them. So each one is resolved against
 * this document's own origin and written in — the text always names the host
 * that is actually answering.
 */
for (const node of document.querySelectorAll("[data-url]")) {
  node.textContent = new URL(node.dataset.url, window.location.href).href;
}

await load("crm");
