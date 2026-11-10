// The AppWithAI site, built by Docusaurus. The pages are the HTML documents in
// site/; plugins/site-pages.mjs gives each its route and copies the rest of the
// repository — assets, validators, models, llms.txt — into the build as is.

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
  plugins: ["./plugins/site-pages.mjs"],
};
