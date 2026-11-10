#!/usr/bin/env node
// Holds the Docusaurus build to the site it replaced. Run after `bun run build`.
//
//   1. Every page is served at its own path with its <body> exactly as
//      written — so the scripts that drive a page by id, and every claim the
//      other checks read off the source, describe what is deployed.
//   2. Every published file that is not a page — assets/, the validators, the
//      models, llms.txt and its chunks, guide/source/ — is in the build, byte for
//      byte. These are URLs language models and old links were given.
//   3. No page is served at a second path that breaks its relative links:
//      /guide/ must not also be written as guide.html.
//
// Node only, no dependencies: it reads the plugin's own list of what is
// published, so the two cannot disagree about it.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPage, listPublished } from "../plugins/site-pages.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = path.join(ROOT, "build");

let failed = 0;
const held = (cond, label) => {
  if (!cond) failed++;
  console.log(`${cond ? "ok  " : "FAIL"} ${label}`);
};

if (!existsSync(BUILD)) {
  console.error("No build/ — run `bun run build` first.");
  process.exit(2);
}

const published = listPublished(ROOT);
const pages = published.filter(isPage);

console.log("1. Pages");
for (const rel of pages) {
  const built = path.join(BUILD, rel);
  const body = readFileSync(path.join(ROOT, rel), "utf8").match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1];
  held(existsSync(built) && body !== undefined && readFileSync(built, "utf8").includes(body),
    `${rel} is served at /${rel === "index.html" ? "" : rel} with its body unchanged`);
}

console.log("\n2. Every other published file");
const files = published.filter((rel) => !isPage(rel));
for (const rel of files) {
  const built = path.join(BUILD, rel);
  if (!existsSync(built) || !readFileSync(built).equals(readFileSync(path.join(ROOT, rel)))) {
    held(false, `${rel} is in the build byte for byte`);
  }
}
held(files.length > 0, `${files.length} files copied byte for byte`);

console.log("\n3. No page at a second path");
for (const rel of pages.filter((f) => f.endsWith("/index.html"))) {
  const stray = `${rel.slice(0, -"/index.html".length)}.html`;
  held(!existsSync(path.join(BUILD, stray)), `${stray} is not written beside ${rel}`);
}

console.log(`\n${failed === 0 ? "OK — the build serves the site unchanged." : `${failed} check(s) failed.`}`);
process.exit(failed === 0 ? 0 : 1);
