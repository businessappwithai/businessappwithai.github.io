// One page of the site: its <head> as Docusaurus head tags, and its <body>
// exactly as written in site/. See plugins/site-pages.mjs.
//
// The body goes in through dangerouslySetInnerHTML on purpose. Its markup is
// the site's own HTML, read from this repository at build time — not input
// from a visitor — and the scripts at the end of it (main.js, the chapter
// controllers) run as the browser parses the generated page, then find their
// elements by id the way they always have.
import Head from "@docusaurus/Head";

// The few HTML attribute names React spells differently.
const REACT_NAMES = {
  class: "className",
  crossorigin: "crossOrigin",
  "http-equiv": "httpEquiv",
  hreflang: "hrefLang",
  referrerpolicy: "referrerPolicy",
};

function props(attrs) {
  const out = {};
  for (const [name, value] of Object.entries(attrs)) {
    out[REACT_NAMES[name] ?? name] = value === "" && (name === "async" || name === "defer") ? true : value;
  }
  return out;
}

function headTag({ tag, attrs, text }, key) {
  if (tag === "title") return <title key={key}>{text}</title>;
  if (tag === "script") {
    return text ? (
      <script key={key} {...props(attrs)}>
        {text}
      </script>
    ) : (
      <script key={key} {...props(attrs)} />
    );
  }
  const Tag = tag;
  return <Tag key={key} {...props(attrs)} />;
}

export default function SitePage({ page }) {
  return (
    <>
      <Head>{page.head.map(headTag)}</Head>
      <div className="site-page" dangerouslySetInnerHTML={{ __html: page.body }} />
    </>
  );
}
