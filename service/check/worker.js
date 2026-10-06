/**
 * The AppWithAI checker as an HTTP service.
 *
 * Why it exists. A chat assistant's code sandbox is often cut off from the
 * network entirely (ChatGPT's refuses every outbound connection by design), so
 * it can never download `guide/checker.js`. Its *actions* are different: they
 * are HTTP calls made from the provider's servers, not from the sandbox. This
 * service is what an action calls — POST a model, get the checker's verdict.
 *
 * It reimplements nothing. It imports the published `guide/checker.js` and
 * `guide/fixer.js` from this repository — the same bytes the site serves — and
 * runs §1.3's three passes exactly as `guide/check-model.mjs` does: repair what
 * is repairable, then check the repaired bytes. The verdict is `formatReport`'s
 * last line, so it is the real one.
 *
 * Written as a plain `fetch(request)` handler: it runs unchanged on Cloudflare
 * Workers (`export default { fetch }`), Deno Deploy and Node 18+.
 */
import { check, formatReport, LANGUAGE_VERSION } from "../../guide/checker.js";
import { checkAndFix } from "../../guide/fixer.js";

const MAX_BYTES = 1_000_000;
const DEFAULT_ISSUES = 100;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS },
  });

/** §1.3, exactly as check-model.mjs runs it. */
export function runChecker(original) {
  const repairedReport = checkAndFix(original);
  const model = repairedReport.source;
  const final = check(model);
  const report = formatReport(final);
  const lines = report.trimEnd().split("\n");
  return {
    verdict: lines[lines.length - 1],
    ok: final.counts.errors === 0,
    exitCode: final.counts.errors === 0 ? 0 : 1,
    counts: final.counts,
    languageVersion: LANGUAGE_VERSION,
    repaired: model !== original,
    repairedModel: model !== original ? model : undefined,
    issues: final.issues,
    report,
  };
}

async function readModel(request) {
  const text = await request.text();
  if (text.length > MAX_BYTES) return { error: `model is larger than ${MAX_BYTES} bytes` };
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    try {
      const body = JSON.parse(text);
      if (typeof body?.model !== "string") return { error: 'JSON body must be {"model": "<the .mmd text>"}' };
      return { model: body.model, options: body };
    } catch {
      return { error: "body is not valid JSON" };
    }
  }
  return { model: text, options: {} };
}

export async function handle(request) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  if (request.method === "GET") {
    if (url.pathname === "/openapi.json") return json(OPENAPI(url.origin));
    return json({
      service: "AppWithAI EML checker",
      languageVersion: LANGUAGE_VERSION,
      usage: 'POST /check with {"model": "<the .mmd text>"} (or the raw text as text/plain).',
      checker: "https://www.appwithai.org/guide/checker.js",
      openapi: `${url.origin}/openapi.json`,
    });
  }

  if (request.method !== "POST" || url.pathname !== "/check")
    return json({ error: "POST /check" }, 404);

  const { model, options, error } = await readModel(request);
  if (error) return json({ error }, 400);

  let result;
  try {
    result = runChecker(model);
  } catch (e) {
    return json({ error: `the checker could not run: ${e?.message ?? e}`, exitCode: 2 }, 500);
  }

  /* An action's response has a size ceiling, and a model with hundreds of
   * diagnostics produces a report of hundreds of kilobytes. The counts and the
   * verdict always come back whole; the issue list and the full report are
   * bounded unless asked for. */
  const limit = Number(options.maxIssues ?? url.searchParams.get("maxIssues") ?? DEFAULT_ISSUES);
  const full = options.full === true || url.searchParams.get("full") === "1";
  /* Errors first: a truncated list must still show everything that blocks generation. */
  const rank = { error: 0, warning: 1, info: 2 };
  const ordered = [...result.issues].sort((a, b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3));
  const issues = full ? ordered : ordered.slice(0, limit);
  return json({
    verdict: result.verdict,
    ok: result.ok,
    exitCode: result.exitCode,
    counts: result.counts,
    languageVersion: result.languageVersion,
    repaired: result.repaired,
    issues: issues.map(({ severity, code, line, message, hint, lineText }) => ({ severity, code, line, message, hint, lineText })),
    issuesTruncated: issues.length < result.issues.length,
    totalIssues: result.issues.length,
    ...(full ? { report: result.report, repairedModel: result.repairedModel } : {}),
  });
}

const OPENAPI = (server) => ({
  openapi: "3.1.0",
  info: {
    title: "AppWithAI EML checker",
    version: LANGUAGE_VERSION,
    description:
      "Runs the official AppWithAI checker (the published checker.js and fixer.js) over an EML .mmd model and returns its verdict. Use it whenever a model has been written or changed; report the verdict field verbatim.",
  },
  servers: [{ url: server }],
  paths: {
    "/check": {
      post: {
        operationId: "checkModel",
        summary: "Check an EML model with the official AppWithAI checker",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["model"],
                properties: {
                  model: { type: "string", description: "The complete .mmd file, every line, exactly as delivered." },
                  maxIssues: { type: "integer", description: "How many diagnostics to return (default 100)." },
                  full: { type: "boolean", description: "Return every diagnostic, the full report text and the repaired model." },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "The checker's result",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    verdict: { type: "string", description: "The checker's final line, e.g. 'OK — 0 errors, 0 warnings (EML 1.2.0)'. Report it verbatim." },
                    ok: { type: "boolean" },
                    exitCode: { type: "integer", description: "0 when there are no errors, 1 otherwise — the CLI's exit code." },
                    counts: { type: "object", properties: { errors: { type: "integer" }, warnings: { type: "integer" }, infos: { type: "integer" } } },
                    languageVersion: { type: "string" },
                    repaired: { type: "boolean", description: "The fixer changed the model; the counts are for the repaired model." },
                    issues: { type: "array", items: { type: "object" } },
                    issuesTruncated: { type: "boolean" },
                    totalIssues: { type: "integer" },
                    report: { type: "string" },
                    repairedModel: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
});

export default { fetch: handle };
