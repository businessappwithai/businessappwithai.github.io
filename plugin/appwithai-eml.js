/**
 * The AppWithAI EML engine for a browser, a WebView or a ChatGPT app widget.
 *
 * It is not a copy. It imports the published `guide/checker.js`,
 * `guide/fixer.js` and `guide/audit-model.mjs` — the bytes https://www.appwithai.org serves and
 * `guide/check-model.mjs` runs — plus the viewers' model reader for the summary
 * figures. `plugin/manifest.js` carries the SHA-256 of each, so a result can
 * say exactly which engine produced it.
 *
 * It makes no network request. Everything below is computation over a string
 * the caller already holds; the only traffic this module causes is the browser
 * fetching these modules, which flows from AppWithAI to the client and
 * never the other way.
 */
import { check, formatReport, LANGUAGE_VERSION } from "../guide/checker.js";
import { checkAndFix } from "../guide/fixer.js";
import { readModel } from "../viewers/eml-model.js";
import { audit } from "../guide/audit-model.mjs";

export { LANGUAGE_VERSION, check, formatReport, checkAndFix, audit };

const RANK = { error: 0, warning: 1, info: 2 };
const byRank = (a, b) => (RANK[a.severity] ?? 3) - (RANK[b.severity] ?? 3);

const verdictOf = (report) => {
  const lines = formatReport(report).trimEnd().split("\n");
  return lines[lines.length - 1];
};

/** Figures a reader expects at the top of a model: name, entities, columns, … */
export function summarize(source) {
  const warn = console.warn;
  console.warn = () => {}; // the reader narrates what it skips; the checker already reports it
  try {
    const model = readModel(source);
    return { name: model.meta?.name ?? null, version: model.meta?.version ?? null, stats: model.stats };
  } catch {
    return { name: null, version: null, stats: null };
  } finally {
    console.warn = warn;
  }
}

/**
 * §1.3 of the specification, exactly as `guide/check-model.mjs` runs it:
 * check the model as written, repair what is repairable, check the repaired
 * bytes. Returns both checks so a screen can show "as written" and "after the
 * safe repairs" side by side.
 */
export function analyze(source, file = "model.mmd") {
  const original = check(source);
  const repair = checkAndFix(source);
  const repairedSource = repair.source;
  const final = check(repairedSource);
  return {
    languageVersion: LANGUAGE_VERSION,
    summary: summarize(source),
    original: { counts: original.counts, verdict: verdictOf(original), issues: [...original.issues].sort(byRank) },
    repaired: {
      changed: repairedSource !== source,
      source: repairedSource,
      counts: final.counts,
      verdict: verdictOf(final),
      issues: [...final.issues].sort(byRank),
      report: formatReport(final),
    },
    /* The twenty-two-point checklist, from the published runner itself:
     * guide/audit-model.mjs exports the function its command line runs. */
    audit: audit(source, { check, checkAndFix, file }),
    ok: final.counts.errors === 0,
    exitCode: final.counts.errors === 0 ? 0 : 1,
  };
}
