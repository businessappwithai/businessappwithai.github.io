// The AppWithAI site, built by Docusaurus. The pages are the HTML documents at
// their own paths; plugins/site-pages.mjs gives each its route and copies the
// rest of the repository — assets, validators, models, llms.txt — into the
// build as is.

import { createRequire } from "node:module";
import { GOOGLE_TAG } from "./plugins/site-pages.mjs";

// Docusaurus's own page template, with the Google tag written as the first
// thing in <head> — where every page's source has it. See GOOGLE_TAG.
const { default: defaultTemplate } = createRequire(import.meta.url)(
  "@docusaurus/core/lib/ssg/ssgTemplate.html.js"
);
if (defaultTemplate.split("<head>").length !== 2) {
  throw new Error("Docusaurus's page template changed shape: expected exactly one <head>");
}
const ssrTemplate = defaultTemplate.replace("<head>", `<head>\n${GOOGLE_TAG}`);

export default {
  title: "AppWithAI",
  url: "https://www.appwithai.org",
  // A fork served from github.io/<repo>/ builds with BASE_URL=/<repo>/.
  baseUrl: process.env.BASE_URL ?? "/",
  // Pages keep their .html file names: /try-it-yourself.html, not /try-it-yourself/.
  trailingSlash: false,
  onBrokenLinks: "throw",
  baseUrlIssueBanner: false,
  i18n: { defaultLocale: "en", locales: ["en"] },
  ssrTemplate,
  plugins: ["./plugins/site-pages.mjs"],
};
