// The site's pages, served by Docusaurus at the URLs they have always had.
//
// Every page is a complete HTML document where it has always been —
// index.html, guide/run-in-browser.html, viewers/index.html — written and
// edited as HTML. This plugin reads each one, gives it a route at its own path,
// and hands its <head> and <body> to src/components/SitePage.jsx, which renders
// them. The body is kept verbatim rather than rewritten as JSX: the interactive
// chapters, the viewers and the Model Assistant drive their own markup by id,
// and the site's checks read the same text.
//
// Everything that is not a page — assets/, the published validators, the
// models, llms.txt and its chunks, guide/source/, the viewers' scripts, CNAME —
// is copied into the build unchanged after Docusaurus has written its own
// files, so every URL a language model or an old link was given still answers.

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";

// What is build tooling rather than part of the published site. Everything
// else at the repository root is published.
export const NOT_PUBLISHED = new Set([
  ".git",
  ".github",
  ".docusaurus",
  ".gitignore",
  ".bun-version",
  "build",
  "node_modules",
  "plugins",
  "src",
  "bun.lock",
  "docusaurus.config.mjs",
  "package.json",
]);

// Every file under dir, as paths relative to it.
export function listFiles(dir, prefix = "") {
  const files = [];
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    if (statSync(full).isDirectory()) files.push(...listFiles(full, rel));
    else files.push(rel);
  }
  return files;
}

// Every published file, relative to the repository root.
export function listPublished(root) {
  return readdirSync(root)
    .sort()
    .filter((name) => !NOT_PUBLISHED.has(name))
    .flatMap((name) => (statSync(path.join(root, name)).isDirectory() ? listFiles(path.join(root, name), name) : [name]));
}

// A page is any published .html file except guide/source/, which is a
// generated artifact carrying the validators byte for byte and is served as is.
export const isPage = (rel) => rel.endsWith(".html") && !rel.startsWith("guide/source/");

// Every spelling of a page's URL that GitHub Pages answers with that page.
// Docusaurus's client router has to know each one: a path it does not match
// is drawn as "Page Not Found" over the page Pages just served. So
// guide/index.html is a route at /guide/ and /guide/index.html, and
// features.html at /features.html and /features (Pages serves both). Each
// alias renders the same page, so it writes the same file.
function routesFor(rel) {
  if (rel === "index.html") return ["/", "/index.html"];
  if (rel.endsWith("/index.html")) {
    const dir = rel.slice(0, -"index.html".length);
    return [`/${dir}`, `/${rel}`];
  }
  return [`/${rel}`, `/${rel.slice(0, -".html".length)}`];
}

const ATTR = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

function parseAttrs(text) {
  const attrs = {};
  for (const m of text.matchAll(ATTR)) attrs[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  return attrs;
}

// The heads are a flat list of <meta>, <link>, <title> and <script> elements,
// which is all this has to read. Comments are dropped; the charset and the
// viewport are Docusaurus's own and are not repeated.
function parseHead(head) {
  const tags = [];
  const TAG = /<!--[\s\S]*?-->|<(meta|link|title|script)\b([^>]*)>(?:([\s\S]*?)<\/\1>)?/gi;
  for (const m of head.matchAll(TAG)) {
    if (!m[1]) continue;
    const tag = m[1].toLowerCase();
    const attrs = parseAttrs(m[2]);
    if (tag === "meta" && ("charset" in attrs || attrs.name === "viewport")) continue;
    tags.push({ tag, attrs, text: tag === "title" || tag === "script" ? (m[3] ?? "") : undefined });
  }
  return tags;
}

export function readPage(file) {
  const html = readFileSync(file, "utf8");
  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!head || !body) throw new Error(`${file}: expected a <head> and a <body>`);
  return { head: parseHead(head[1]), body: body[1] };
}

export default function sitePages(context) {
  const root = context.siteDir;

  return {
    name: "site-pages",

    getPathsToWatch() {
      return listPublished(root).filter(isPage).map((rel) => path.join(root, rel));
    },

    async loadContent() {
      return listPublished(root)
        .filter(isPage)
        .map((rel) => ({ rel, ...readPage(path.join(root, rel)) }));
    },

    async contentLoaded({ content, actions }) {
      for (const page of content) {
        const data = await actions.createData(
          `${page.rel.replace(/[/.]/g, "-")}.json`,
          JSON.stringify({ head: page.head, body: page.body })
        );
        for (const routePath of routesFor(page.rel)) {
          actions.addRoute({
            path: routePath,
            component: "@site/src/components/SitePage.jsx",
            modules: { page: data },
            exact: true,
          });
        }
      }
    },

    async postBuild({ outDir, content }) {
      // The /guide/ alias is written to guide.html. Pages would serve that file
      // at /guide, where every relative link in the chapter resolves one
      // directory too high; without it /guide redirects to /guide/ as before.
      for (const page of content) {
        if (!page.rel.endsWith("/index.html")) continue;
        const stray = path.join(outDir, `${page.rel.slice(0, -"/index.html".length)}.html`);
        if (existsSync(stray)) rmSync(stray);
      }

      for (const rel of listPublished(root)) {
        if (isPage(rel)) continue;
        const dest = path.join(outDir, rel);
        // Docusaurus writes its bundles under assets/js and assets/css with
        // hashed names; the site's own files there must not replace one.
        if (existsSync(dest)) throw new Error(`${rel} would overwrite a file Docusaurus wrote`);
        mkdirSync(path.dirname(dest), { recursive: true });
        copyFileSync(path.join(root, rel), dest);
      }
    },
  };
}
