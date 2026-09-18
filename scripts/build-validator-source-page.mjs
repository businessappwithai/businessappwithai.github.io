#!/usr/bin/env node
/**
 * Builds `guide/source/` — the published validators as **HTML pages**.
 *
 * Why this exists. The ladder in §8.4 assumes that a runtime which can reach
 * the site can fetch `checker.js`. Not every one can: a browsing or fetch layer
 * that happily reads a *page* will refuse `application/javascript` outright, and
 * reports it as the resource being inaccessible — which reads like the site
 * being broken while the site is answering. Observed repeatedly from one
 * runtime, on all three files at once, while that same layer could read pages
 * from the same host.
 *
 * So each module is also published inside a page: `guide/source/checker.js.html`
 * and so on. The page carries the file **base64-encoded**, which is the part
 * that makes it worth doing at all:
 *
 *   - base64 contains no HTML-special character, so nothing has to be escaped
 *     and nothing can be silently unescaped wrong;
 *   - it is whitespace-insensitive, so a fetcher that reflows the text, wraps
 *     long lines or converts the page to Markdown cannot corrupt it;
 *   - `base64 -d` is on every POSIX shell, and Node has `Buffer.from(…,"base64")`.
 *
 * An HTML-escaped `<pre>` of the source would have looked simpler and would
 * have been the wrong choice: a markdown-converting fetcher can drop a blank
 * line or collapse an indent, the result still looks like JavaScript, and the
 * checker it produces is subtly not the published one. Base64 either decodes to
 * the exact bytes or fails loudly.
 *
 * Each page therefore also prints the **SHA-256 of the real file**, so whoever
 * reconstructs it can prove they got the published bytes rather than assume it.
 *
 * This is a transport of last resort, not a second home for the validators.
 * Every page says so and names the direct URL first: a fetch that works needs
 * none of this.
 *
 *   node scripts/build-validator-source-page.mjs           # write the pages
 *   node scripts/build-validator-source-page.mjs --check   # fail when stale
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "guide", "source");

/** The four published files a reader may need on disk. The one-file build is
 *  deliberately absent: it is already a paste-through-text transport, and a
 *  base64 of a base64 payload is 190KB of nothing. */
const FILES = [
  { name: "checker.js", what: "every diagnostic, as check(source) — imported by fixer.js from beside it" },
  { name: "fixer.js", what: "the auto-repairs, plus checkAndFix(source)" },
  { name: "check-model.mjs", what: "the runner: three passes, the report, exit 0/1/2" },
  { name: "audit-model.mjs", what: "the checklist audit: twenty-two checks, exit 0/1/2" },
];

const wrap = (s, n = 76) => s.replace(new RegExp(`(.{${n}})`, "g"), "$1\n").trimEnd();

const page = ({ name, what, base64, sha, bytes }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${name} — source, base64</title>
<link rel="icon" type="image/svg+xml" href="../../favicon.svg">
<link rel="icon" href="../../favicon.ico" sizes="48x48">
<style>
  :root { color-scheme: light dark; --fg:#111; --bg:#fff; --dim:#555; --line:#d4d4d4; }
  @media (prefers-color-scheme: dark) { :root { --fg:#e8e8e8; --bg:#111; --dim:#9a9a9a; --line:#333; } }
  body { background:var(--bg); color:var(--fg); font:15px/1.6 ui-sans-serif,system-ui,sans-serif; margin:0; padding:2rem 1rem; }
  main { max-width:62rem; margin:0 auto; }
  h1 { font-size:1.25rem; margin:0 0 .25rem; font-family:ui-monospace,monospace; }
  p { margin:.6rem 0; } code { font-family:ui-monospace,monospace; }
  .dim { color:var(--dim); } .meta { border:1px solid var(--line); padding:.75rem 1rem; margin:1rem 0; }
  .meta div { font-family:ui-monospace,monospace; font-size:13px; word-break:break-all; }
  pre { border:1px solid var(--line); padding:1rem; overflow-x:auto; font-family:ui-monospace,monospace; font-size:12px; line-height:1.45; white-space:pre-wrap; word-break:break-all; }
</style>
</head>
<body>
<main>
<h1>${name}</h1>
<p class="dim">${what}</p>

<p><b>Fetch the file itself if you can</b> —
<code>https://www.appwithai.org/guide/${name}</code> — and ignore this page. It
exists for one case: a fetch layer that reads pages but refuses
<code>application/javascript</code>, and so reports the module as inaccessible
while the site is answering normally.</p>

<div class="meta">
<div>bytes    ${bytes}</div>
<div>sha256   ${sha}</div>
</div>

<p>The block below is that file, base64-encoded. Base64 carries no HTML-special
character and ignores whitespace, so reflowing, wrapping or converting this page
to Markdown cannot corrupt it. Reconstruct and verify:</p>

<pre>base64 -d &lt; ${name}.b64 &gt; ${name}
sha256sum ${name}      # must print ${sha}</pre>

<p>Or in Node, with the block as a string:</p>

<pre>writeFileSync("${name}", Buffer.from(b64.replace(/\\s+/g, ""), "base64"));</pre>

<p><code>fixer.js</code> imports <code>checker.js</code> from beside itself, so
those two must land in the same directory. Then point a runner at it:
<code>node check-model.mjs &lt;model&gt;.mmd --base ./</code>.</p>

<pre id="b64">${base64}</pre>

<p class="dim">Generated from the published file by
<code>scripts/build-validator-source-page.mjs</code>. Do not edit: CI rebuilds
this and fails if it no longer matches <code>guide/${name}</code> byte for byte.</p>
</main>
</body>
</html>
`;

const index = (rows) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Validator source, as pages</title>
<link rel="icon" type="image/svg+xml" href="../../favicon.svg">
<link rel="icon" href="../../favicon.ico" sizes="48x48">
<style>
  :root { color-scheme: light dark; --fg:#111; --bg:#fff; --dim:#555; --line:#d4d4d4; }
  @media (prefers-color-scheme: dark) { :root { --fg:#e8e8e8; --bg:#111; --dim:#9a9a9a; --line:#333; } }
  body { background:var(--bg); color:var(--fg); font:15px/1.6 ui-sans-serif,system-ui,sans-serif; margin:0; padding:2rem 1rem; }
  main { max-width:62rem; margin:0 auto; }
  h1 { font-size:1.25rem; margin:0 0 .5rem; }
  p { margin:.6rem 0; } code { font-family:ui-monospace,monospace; }
  table { border-collapse:collapse; margin:1.25rem 0; width:100%; }
  th, td { border:1px solid var(--line); padding:.5rem .75rem; text-align:left; font-size:14px; vertical-align:top; }
  th { font-weight:600; } .dim { color:var(--dim); }
  td code { word-break:break-all; }
</style>
</head>
<body>
<main>
<h1>The published validators, carried inside pages</h1>

<p><b>You almost certainly do not want this page.</b> The validators are served
as files, and fetching them directly is one line:</p>

<pre><code>curl -sO https://www.appwithai.org/guide/check-model.mjs
node check-model.mjs &lt;model&gt;.mmd</code></pre>

<p>This directory exists for one observed failure: a browsing or fetch layer
that reads <code>text/html</code> but refuses
<code>application/javascript</code>, and reports the module as inaccessible
while the same host serves it pages without complaint. Each page below carries
one file base64-encoded, with its SHA-256, so the bytes can be reconstructed
and <em>proved</em> to be the published ones.</p>

<p>If your shell reaches no host at all, prefer
<code><a href="../check-model-standalone.mjs">check-model-standalone.mjs</a></code>:
one file, both modules and both runners inside it, nothing to reassemble.</p>

<table>
<tr><th>Page</th><th>File</th><th>bytes</th><th>sha256</th></tr>
${rows}
</table>

<p class="dim">Generated by <code>scripts/build-validator-source-page.mjs</code>;
CI fails if any page drifts from the file it carries.</p>
</main>
</body>
</html>
`;

const built = FILES.map((f) => {
  const raw = readFileSync(join(root, "guide", f.name));
  return {
    ...f,
    bytes: raw.length,
    sha: createHash("sha256").update(raw).digest("hex"),
    base64: wrap(raw.toString("base64")),
  };
});

const pages = built.map((f) => [`${f.name}.html`, page(f)]);
pages.push([
  "index.html",
  index(
    built
      .map(
        (f) =>
          `<tr><td><a href="${f.name}.html">${f.name}.html</a></td><td><code>${f.name}</code></td><td>${f.bytes}</td><td><code>${f.sha.slice(0, 16)}…</code></td></tr>`
      )
      .join("\n")
  ),
]);

if (process.argv.includes("--check")) {
  let stale = 0;
  for (const [name, body] of pages) {
    let current = "";
    try { current = readFileSync(join(OUT, name), "utf8"); } catch {}
    if (current === body) console.log(`ok    guide/source/${name}`);
    else { stale++; console.log(`FAIL  guide/source/${name} is stale against guide/${name.replace(/\.html$/, "")}`); }
  }
  if (stale) {
    console.log("      Rebuild: node scripts/build-validator-source-page.mjs");
    process.exit(1);
  }
  process.exit(0);
}

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
for (const [name, body] of pages) writeFileSync(join(OUT, name), body);
console.log(`wrote ${pages.length} pages into guide/source/`);
for (const f of built) console.log(`  ${f.name.padEnd(22)} ${String(f.bytes).padStart(7)} bytes → ${f.base64.length} base64`);
