# CLAUDE.md — AI Assistant Guide for businessappwithai.github.io

## Project Overview

This is the **AppWithAI** marketing website — a static site promoting an AI-powered business application generator. The site is deployed via GitHub Pages with no build step required.

## Repository Structure

```
businessappwithai.github.io/
├── .github/
│   └── workflows/
│       └── static.yml        # GitHub Actions: auto-deploy to GitHub Pages on push to main
├── assets/
│   ├── css/
│   │   ├── style.css         # Main stylesheet (Lunaris Design System, ~1,010 lines)
│   │   ├── guide.css         # Documentation layer for the "Build a CRM" guide
│   │   └── guide-demo.css    # Scoped styles for the three interactive chapters
│   ├── js/
│   │   ├── main.js               # Main JS (scroll animations, nav, forms)
│   │   ├── guide.js              # Guide chapter nav and screenshot lightbox
│   │   ├── coi.js                # Registers the cross-origin isolation worker (ch. 10)
│   │   ├── run-in-browser.js     # Controller for chapter 09
│   │   ├── run-real-stack.js     # Controller for chapter 10
│   │   ├── validator.js          # Controller for chapter 11
│   │   ├── erdwithai-wasm.js     # Vendored: browser generator (parser + compilers)
│   │   └── erdwithai-fullstack.js# Vendored: full NestJS/TanStack generator
│   └── vendor/                   # Third-party payloads, served from this origin
│       ├── pglite/               # PostgreSQL 18 compiled to WebAssembly (~18MB)
│       ├── webcontainer/         # @webcontainer/api, unbundled ESM
│       ├── app-fonts/            # The nine typefaces the template bundle cannot carry
│       └── stack-templates.json  # 310 stack templates for chapter 10
├── guide/                    # "Build a CRM" guide (chapters 00–11); every <figure>
│                             # puts its <figcaption> *before* the <img>
│   ├── index.html            # 00 · Overview
│   ├── 01-…08-reference.html # Chapters 01–08
│   ├── run-in-browser.html   # 09 · Run it in your browser
│   ├── run-real-stack.html   # 10 · Run the real stack
│   ├── 11-check-a-model.html # 11 · Check a model
│   ├── checker.js            # Published EML checker (ES module)
│   ├── fixer.js              # Published EML fixer (ES module)
│   ├── check-model.mjs       # Site-authored CLI runner for both of the above
│   ├── coi-sw.js             # Service Worker that isolates chapter 10
│   ├── img/                  # Screenshots used by the chapters
│   ├── models/               # Example EML models the chapters load
│   └── wasm-app/sw.js        # Service Worker that hosts the generated app
├── llms-full.txt             # EML language specification, for language models
├── scripts/
│   ├── check-spec.mjs        # Verifies llms-full.txt against guide/checker.js
│   └── check-model.mjs       # Audits any .mmd against §1.2 and §10 of the spec
├── index.html                # Home/landing page
├── justification.html        # Position paper: why the platform exists
├── try-it-yourself.html      # The conversion path as a page of its own (in the nav)
├── features.html             # Product features detail
├── how-it-works.html         # AI pipeline explanation
├── technology.html           # Tech stack options
├── pricing.html              # Pricing and ROI
├── contact.html              # Contact/demo request form
├── pencil-welcome.pen        # Pencil (design tool) mockup file (JSON, 208KB)
├── app_with_ai.docx          # Business documentation (Word, 27KB)
└── CLAUDE.md                 # This file
```

## Technology Stack

**Pure static site — no build tools, no package manager, no framework.**

- HTML5 (semantic markup)
- CSS3 with custom properties (CSS variables)
- Vanilla JavaScript (ES6+)
- GitHub Actions for CI/CD deployment to GitHub Pages

No Node.js, npm, webpack, or bundler of any kind. There is no `package.json`.

## Development Workflow

### Local Development

Open any `.html` file directly in a browser. No server required for basic viewing.

For a local dev server (avoids CORS issues with relative links):
```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

### Deployment

Deployment is fully automatic:
- Push to `main` branch → GitHub Actions runs → site deploys to GitHub Pages
- No manual steps required
- The workflow uploads the entire repository as the static artifact

### Branching

- `main` — production branch, triggers auto-deployment
- `master` — legacy branch (do not use)
- Feature branches follow the `claude/...` naming convention for AI-assisted work

## Pages and Their Purpose

| File | Purpose |
|------|---------|
| `index.html` | Landing page: hero, stats, problem/solution, feature previews, the **Try It Yourself** section, the live in-browser demo, and the CRM guide preview |
| `features.html` | Detailed feature breakdown (AI modeling, forms, workflows, security, analytics) |
| `how-it-works.html` | Step-by-step AI pipeline with multi-agent architecture diagram |
| `technology.html` | Two tech stack options: Modern Web Stack and Enterprise SAP-Style Stack |
| `pricing.html` | Pricing tiers, cost comparison vs. traditional development, ROI metrics |
| `contact.html` | Demo request and contact form |
| `justification.html` | Position paper — the structural gap AppWithAI addresses, and why engineering standards belong in the platform. In the primary nav as "Why AppWithAI", and linked from the home page, Features, How It Works, Pricing and every footer. |
| `try-it-yourself.html` | The conversion path with room to explain itself: the three steps, the prompt block, a complete worked `.mmd` and what each of its lines does, the four habits §3.7 turns into diagnostics, and both ways to run the checker. In the nav directly after "Why AppWithAI". |
| `guide/index.html` | "Build a CRM" guide overview, chapters 00–11 |
| `guide/run-in-browser.html` | Chapter 09: generates and runs a full application in the visitor's browser |
| `guide/run-real-stack.html` | Chapter 10: assembles the real NestJS/TanStack app and runs it in a WebContainer |
| `guide/11-check-a-model.html` | Chapter 11: the authoring protocol, and the published validators running live |
| `llms-full.txt` | The EML language specification language models are pointed at — the language only, deliberately not the generator or the framework |

## Design System (Lunaris)

The CSS is organized as a complete design system. Use existing classes — do not invent new ones.

### Color Variables

```css
--primary-500    /* main blue */
--secondary-500  /* main purple */
--accent-500     /* main orange */
--success-500
--warning-500
--error-500
--neutral-*      /* 50–900 scale */
```

### Key Component Classes

**Buttons:** `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.btn-accent`, `.btn-lg`, `.btn-sm`

**Cards:** `.card`, `.card-icon`, `.card-header`, `.feature-card`, `.feature-icon`, `.stat-card`, `.pricing-card`

**Layout:** `.grid-2`, `.grid-3`, `.grid-4`, `.section`, `.section-white`, `.section-gray`, `.section-header`

**Forms:** `.form-group`, `.form-label`, `.form-input`, `.form-select`, `.form-textarea`

**Navigation:** `.header`, `.nav`, `.nav-link`, `.logo`, `.menu-toggle`

**Badges and stats:** `.hero-badge`, `.stats-grid`, `.stat-card`, `.stat-value`, `.stat-label`

**Grids:** `.features-grid` (auto-fit feature cards), `.grid` + `.grid-2/3/4`

**Timeline:** `.timeline`, `.timeline-item`

**Comparison:** `.comparison-table` with `.check` / `.cross` marker classes

**Pricing:** `.pricing-card`, `.pricing-card.popular`, `.pricing-badge`, `.pricing-features`

**Utilities:** `.mt-1` through `.mt-5`, `.mb-1` through `.mb-5`,
`.text-xs` / `.text-sm` / `.text-base`, `.text-center` / `.text-left` / `.text-right`,
`.text-muted`, `.text-gradient`, `.container-narrow`, `.container-wide`

> The font-size utilities were used across the marketing pages long before they were
> defined, so they silently did nothing. They are defined now — if you change them,
> six pages change with them.

### Responsive Breakpoints

| Query | What it governs |
|---|---|
| `min-width: 768px` | Desktop type scale and multi-column grids |
| `min-width: 1024px` | The full navigation appears; the menu toggle is hidden |
| `1024px–1279px` | Narrow desktops: the nav gap and type size tighten so seven items plus two buttons still fit |
| `max-width: 1023px` | Navigation collapses behind the menu toggle |
| `max-width: 767px` | Single-column layouts, full-width buttons, scrollable comparison tables |

Design is desktop-first with mobile overrides. Test any new section at **767px** and
any navigation change at **1024px**.

## JavaScript Conventions

`assets/js/main.js` is loaded on every page. Key behaviors:

- **Mobile menu:** Hamburger toggle with animated icon transform
- **Scroll animations:** Intersection Observer triggers `fadeInUp` on `.card`, `.feature-card`, `.timeline-item`
- **Nav highlighting:** Active link detection by matching `href` to current page filename
- **Form validation:** Red border on empty required fields on blur; blue border on focus
- **Stats counter:** Animated number increment on scroll into view
- **External links:** Automatically get `target="_blank"` + `rel="noopener noreferrer"`
- **`[data-url]`:** The element's text is replaced with `data-url` resolved against
  `window.location`. Use it for any absolute URL shown to a reader — the site is
  written as `appwithai.org` but must also be correct on a fork, a staging host or a
  local server. Never hard-code the production hostname in visible text.
- **`[data-copy]`:** A button copies the text of the element whose id it names.
  It reads the live DOM, so it picks up the resolved `[data-url]` values rather than
  the placeholder in the source. Falls back to selecting the text where the clipboard
  API is refused (private windows, plain `http://`).

Utility functions available globally via the `utils` object:
```js
utils.debounce(func, wait)
utils.throttle(func, limit)
utils.getCookie(name)
utils.setCookie(name, value, days)
```

## HTML Conventions

- Use semantic elements: `<header>`, `<nav>`, `<section>`, `<footer>`, `<main>`
- Maintain heading hierarchy (one `<h1>` per page)
- Add `aria-label` to interactive elements without visible text
- All external links: include `target="_blank"` and `rel="noopener noreferrer"`
- Meta tags required on every page: `charset`, `viewport`, `description`, `keywords`
- Keep navigation consistent across all pages (copy from an existing page)

## Navigation and the Live Demo

The primary nav carries seven items plus two buttons and fits on one line down to
1024px, below which it collapses behind the menu toggle. `.nav-link` is
`white-space: nowrap` so a two-word label never breaks mid-item; the narrow-desktop
media query (1024–1279px) tightens the gap and type size instead. **Seven is the
ceiling** — an eighth item overflows the header at every desktop width, measured.
"Try It Yourself" was added by dropping "Home": the logo links home from every
page, which is where a reader looks for it anyway. **Adding another item means
removing one** — check at 1024px before you do.

**"Live Demo" points at `guide/run-in-browser.html`**, the in-browser CRM. It is
same-origin, so it carries no `target="_blank"`. There was formerly an externally
hosted Hospital Management System demo at a raw IP over plain `http://`; it has
been removed site-wide and the CRM is the one worked example the whole site uses.
Do not reintroduce a demo the site cannot serve itself.

## "Try It Yourself" — the conversion path

The section on the home page (`index.html#try-it-yourself`) is the site's main call to
action, and `try-it-yourself.html` is the same path with room to explain itself — the
nav points at the page, the home page keeps the short version and links to it. Between
them the path spans five files. If you change one, check the others.

1. **The prompt block** carries the specification URL inside a `[data-url]` span, so a
   visitor copies a link to the host they are actually on. The copy button is
   `[data-copy]` pointing at `#research-prompt`. Both are handled by `main.js`.
2. **`llms-full.txt`** is what that prompt tells the model to read. Its §1 is the
   authoring protocol; the three steps on the page are a plain-English retelling of it.
   If §1 changes, the three cards should change with it — and so should the section
   number quoted in the prompt block.
3. **`guide/run-in-browser.html#upload`** is where the reader lands with their model.
   The hash is honoured in `run-in-browser.js`: it selects the upload choice and scrolls
   the dropzone into view instead of showing the CRM example.
4. **`how-it-works.html`** carries a pointer section that links to `try-it-yourself.html`
   rather than duplicating the steps. Keep it a pointer.
5. **`try-it-yourself.html`** repeats the three cards and the prompt block, and then goes
   further than the home page can: a complete `Field Service` model with every line
   explained, the four dictionary habits, and both ways to run the checker. **Its example
   model is checker-clean** — `node guide/check-model.mjs` it after any edit, the same way
   `llms-full.txt`'s examples are held to.

## Key Conventions for AI Assistants

1. **No build step** — changes to HTML/CSS/JS are applied directly. Do not introduce npm, bundlers, or frameworks.
2. **Reuse existing CSS classes** — the design system is comprehensive. Avoid adding new CSS unless absolutely necessary.
3. **Keep pages consistent** — navigation, footer, and meta structure must match existing pages exactly.
4. **No external JS dependencies** — do not add CDN script tags or npm packages.
5. **Preserve the design system** — CSS variable names and spacing scale are intentional; do not rename or restructure them.
6. **Static only** — there is no backend, no API, no database. Forms do not submit to a server by default.
7. **Deployment is automatic** — merging to `main` deploys to production. Test locally before merging.
8. **Mobile-first content** — ensure any new sections are responsive and tested at 767px width.
9. **Animations via CSS + IntersectionObserver** — follow the existing pattern in `main.js` for scroll-triggered effects; do not use JS animation libraries.
10. **Accessible markup** — maintain ARIA labels, semantic structure, and sufficient color contrast (design system colors are pre-validated).

## The In-Browser Demo (Chapter 09)

`guide/run-in-browser.html` compiles a Mermaid model into a complete application and runs it in the
visitor's tab. It is the only page on the site with moving parts, so it has its own rules.

**How it works**

1. `assets/js/run-in-browser.js` (an ES module) reads a model from `guide/models/`, or from a file the
   visitor picks, and compiles it with `assets/js/erdwithai-wasm.js` — the generator bundled for the browser.
2. The generated files are posted to the Service Worker at `guide/wasm-app/sw.js`, which serves them
   from Cache Storage under `guide/wasm-app/run/` and forwards that app's `/api` calls to a worker thread.
3. PostgreSQL is PGlite, served from `assets/vendor/pglite/` on this origin, and the database lives in
   the visitor's IndexedDB. **The chapter makes no request to any other host.**

**Sample data — the `#sample-records` control**

The page asks for **10 rows per entity** by default, and that number is a deliberate choice rather than
a leftover. An application whose every list says *No entries* is one nobody can look at: nothing to
sort, nothing to open, every reference dropdown empty — and looking at it is the only thing this
chapter is for. The rows are generated by **faker.js**, but *which* faker generator a column gets is
decided upstream, in `sample-data.ts`, from the Application Dictionary: the column's reference type
first, its name second. So an `EMAIL` holds an address, a `%%enum` holds one of its declared values,
and a `TABLE_DIRECT` holds the id of a row that exists — entities are written parents-first for
exactly that reason.

- **No sample-data logic lives on this site.** `run-in-browser.js` reads the select, passes
  `sampleRecords` and `sampleSeed` to `generateFromSource`, and renders `summary.sampleRows`. Everything
  else — the vocabulary, the typing, the ordering — is in the vendored bundle, the same code
  `erdwithai-wasm generate --standalone` runs. Adding a rule here would mean the page showing records
  the CLI would not write.
- **The seed is the application's name**, so two readers who leave the field alone see the same records
  and can talk about row four.
- **`0` (the *None* option) is honoured**, and is what a reader who brought their own model to look at
  the schema wants. The generator's own default is 0, so the page is the thing asking.
- **"Start over with a fresh database" re-seeds**, because the reset is a fresh first boot. The button
  used to say *empty*, which stopped being true.

**Constraints to respect**

- The page must be served over `http://` or `https://` — a Service Worker cannot register from `file://`.
- `#upload` in the URL opens the chapter with the upload choice selected. The home page's
  "Try It Yourself" section links here that way — do not break the hash.
- Paths in `run-in-browser.js` are resolved against the page URL (`models/…`, `wasm-app/…`), so the page,
  `guide/models/` and `guide/wasm-app/` must stay siblings.
- `guide-demo.css` is scoped entirely to `.guide-demo` so that the demo's own `.btn`, `.card`, `.stage`
  and similar names never collide with the Lunaris classes. Its palette is a token bridge onto the
  design system variables — change the bridge, not the individual rules.

## Chapter 10 — the real stack in a WebContainer

`guide/run-real-stack.html` assembles the full NestJS and TanStack Start application — 406 files — and
runs it in a WebContainer. It needs two things chapter 09 does not.

- **Cross-origin isolation.** A WebContainer needs `SharedArrayBuffer`, which requires
  `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` on the
  document. GitHub Pages cannot send headers, so `guide/coi-sw.js` adds them: `assets/js/coi.js`
  registers it and reloads once. **The worker rewrites that one document and passes everything else
  through** — do not widen it. Isolation is a constraint, not an upgrade, and the other chapters must
  stay outside it.
- **The network.** The WebContainer runtime comes from StackBlitz and the packages from npm. Everything
  else — the API, the 310 templates, the fonts — is served from `assets/vendor/`.

The nine binary font templates cannot travel in `stack-templates.json` (it is JSON), so they are shipped
in `assets/vendor/app-fonts/` and put back into the file tree by `withFonts()` before it is mounted.

`stack-templates.json` is rebuilt in the generator repository with `bun run build:stack-templates`
(it is gitignored there) and copied here.

## Chapter 11 — the published validators

`guide/checker.js` and `guide/fixer.js` are the ES modules that §1.3 and §8 of `llms-full.txt` tell language
models to import, at exactly those URLs. **Do not move or rename them** — the specification, published
here as `llms-full.txt`, hard-codes `https://appwithai.org/guide/checker.js` and `…/fixer.js`.

They are built in the generator repository by `bun run build:language-tools` from
`language/browser/*.entry.ts`, and they are the same engines the CLI runs. `assets/js/validator.js` is
only a front end for them — never add validation logic to it, or a model could pass here and fail in the
generator.

`guide/check-model.mjs` is the command-line way in, and it is **authored here, not vendored**: a
runner that locates `checker.js` and `fixer.js` (beside itself, or from the published site), performs
§1.3's three passes, prints `formatReport`, and exits 0 / 1 / 2. It exists because Node removed network
imports, so a language model with a shell needs four lines where Bun and Deno need one — and skips the
step. `scripts/check-spec.mjs` asserts its exit codes, and §8.4 of `llms-full.txt` documents it. Keep it
a runner: no diagnostic may originate in it.

Two behaviours in the page's front end are deliberate, and both are presentation of what the published
modules already returned — not decisions of their own:

- **The `EML004` note.** When the checker returns that code, the page adds a line saying the document
  looks like prose about a model rather than a model. It is the diagnostic readers arrive with: a
  language model answers with an *enhanced specification*, the fixer inserts `%%meta name:` (`EML001`),
  and `EML004` remains. The note renders only when the code is in the report — it never inspects the
  document itself.
- **"Download as .mmd" appears only when a run has no errors**, whether it needed repairs or not, and
  the file is named from `%%meta name:` per §1.2 (lower-cased, hyphenated). Handing someone a file the
  generator would refuse is the failure this page exists to catch; and the reader whose model arrived
  as a fenced block in a chat report gets a real `.mmd` out of the paste box, which is the path the
  home page now points them at.

## Vendored files

Everything under `assets/vendor/`, plus `assets/js/erdwithai-*.js`, `assets/js/run-*.js`,
`guide/wasm-app/sw.js`, `guide/checker.js` and `guide/fixer.js` comes from
`businessappwithai/app-with-ai-tanstack`. Re-copy them rather than editing by hand. The local deltas,
all deliberate and all commented at the point of change:

| File | Local change | Why |
|---|---|---|
| `assets/js/run-in-browser.js` | Probes `assets/vendor/pglite/` and mounts a re-export shim at the app's `vendor/pglite/index.js` | This site vendors PGlite, so no CDN is ever reached |
| `assets/js/run-real-stack.js` | Vendored API and template URLs; font restore; boot timeout; environment check | No third-party module host; a hang becomes a message |
| `guide/wasm-app/sw.js` | `ignoreMethod: true` in `serve()` | The Cache API matches GET only, so HEAD probes escaped to the network and 404'd |

## `llms-full.txt` is authored here, not vendored

It began as a copy of the generator repository's `llmtext/llms-full.txt`, which documents the whole
system — repository topology, the generator pipeline, the templates, the generated application, the
modelling tool. **It is now a different document**: the EML language and nothing else, because the only
thing a language model has to produce is a model file.

- **Do not overwrite it from upstream.** Re-copying loses the rewrite. Take language changes across by
  hand, and use `language/erdwithai-language.json` in the generator repository as the authority.
- **§1 is the authoring protocol** — the four steps a model follows to answer "build me an app for X".
  The home page's prompt block quotes that section number.
- **§1.0 states the deliverable**, and it is there for one reason: the observed failure is a model
  answering with an *enhanced specification* — headings, entity glossary, lifecycle prose — and never
  writing the Mermaid. The checker scores such a document `EML004`, *empty document*. §1.0 (the
  deliverable), §1.2 (the file contract: opens on a `%%` line, every line Mermaid or a `%%`
  directive), §1.3 (validate the file's bytes, and what `EML004` really means) and §10 (the checklist)
  all carry that rule. Do not soften them back into "the first output is not Mermaid".
- **§1.0 also says exactly one file leaves the model's hands**, and §1.4 says what a surface that can
  only produce a document must do instead — open the document with the model in its first fenced
  block. That is there because the failure recurred with a *second* model that had plainly written a
  model and still handed over only the prose about it. Two files means the reader opens the wrong one.
- **Four places mirror §1 and change together**: `guide/11-check-a-model.html#protocol`, the home
  page's prompt block, the three "Try It Yourself" cards, and `try-it-yourself.html`.
- **§3.7 is the Application Dictionary**, and it is there because a model could check clean and still
  generate an application full of text boxes. The generated app is metadata-driven: `sys_table`,
  `sys_column`, `sys_reference`, `sys_ref_list` and the rest are derived from the ERD, and the column's
  *reference type* decides the control. Two mistakes downgrade a column to `String` — a reference column
  without the `FK` modifier (both generators require `isForeignKey` **and** a name ending `_id`/`_by` for
  `Table Direct`), and an enumerated column with no `%%field … enum:` binding. §3.7 also carries the help
  contract: `%%field <E>.<c> help:` and `%%entity <E> help:` are compiled into `sys_column.description`
  and `sys_table.description`, and they are the only help the generated application has. Both are diagnostics now,
  `EML119` and `EML146`, added upstream in `businessappwithai/app-with-ai-tanstack` and vendored here
  with the checker; `EML223` reports the third member of the family, a `%%guard role:… on …` line — the
  retired spelling of `%%rbac` — which parses and restricts nothing. `scripts/check-spec.mjs` asserts the
  derivation table against `erdwithai-wasm.js` and asserts that the three codes fire;
  `scripts/check-model.mjs` keeps its own checks for the two downgrades, so a delivery is audited even
  where an older checker is vendored.
- **§3.7 also carries the display value** — what a reference shows in place of its uuid. The dictionary
  derives it from `sys_column.is_identifier`: a `name`-ish column, else `first_name` + `last_name`, else
  a `code`, else — for a **join entity**, two or more `FK` columns and no name of its own — its first two
  parents resolved through *their* labels (`Spring Promo — Omar Kowalski`), else the first text column,
  else the uuid. The key is never an identifier. Only the first two parents, only one level deep, and
  names of one record join with a space while two records join with an em dash. `check-spec.mjs` asserts
  all of it against `erdwithai-wasm.js`, so the table in §3.7 is a checked promise rather than prose.
- **§8 is the checker contract**, and the URLs in it are the ones `guide/checker.js` and
  `guide/fixer.js` are actually published at.
- **Every fenced `mermaid` example in it is a complete model that the checker accepts with zero errors
  and zero warnings.** That claim is made in the file's own header, so it has to stay true.
- **Verify after every edit with `node scripts/check-spec.mjs`.** It extracts each fenced `mermaid`
  block and runs it through `guide/checker.js`, then re-tests the claims the prose makes — every type
  alias, modifier, cardinality operator, hook type, action type, step contract, `%%meta` key and
  state-machine code — against the same engine. It exits non-zero on any contradiction, and it is how
  the §5.3 step table and the §5.2 enum codes were found to be wrong. No dependencies; Node only.
- **`node guide/check-model.mjs <file.mmd>`** is the published runner: §1.3's three passes and the
  checker's own report, exit 0/1/2. It is what §8.4 tells a language model to `curl`.
- **`node scripts/check-model.mjs <file.mmd>`** audits a delivered model against the mechanical half of
  §1.2's file contract and §10's checklist — shape, keys, enum bindings, state machines, rbac, and the
  three checker passes over its own bytes. `guide/models/crm.eml.mmd` passes it 18/18.

**On the published domain.** The specification quotes the validators as
`https://appwithai.org/guide/checker.js`, and chapter 11 prints them that way. There is no `CNAME`
file — the Pages source is GitHub Actions, which keeps a custom domain in repository settings rather
than in the tree — so the page never trusts that string: every URL it shows carries a `data-url`
attribute and `validator.js` resolves it against `window.location`, so the text always names the host
that is actually answering. Keep that mechanism if you edit those URLs.

## CI/CD Pipeline

```yaml
# .github/workflows/static.yml
Trigger: push to main (or manual dispatch)
Runner:  ubuntu-latest
Steps:
  1. actions/checkout@v4
  2. actions/configure-pages@v5
  3. actions/upload-pages-artifact@v3  (uploads entire repo)
  4. actions/deploy-pages@v4
```

Concurrency is `group: pages` with **`cancel-in-progress: false`** — a running deploy
is allowed to finish, and only the most recent queued run follows it. A merge therefore
takes a minute or two to appear; that is the workflow behaving correctly, not a stuck
deploy.

## Product Context

**AppWithAI** generates full-stack business applications from natural language descriptions using a multi-agent AI pipeline:

1. Domain Analysis Agent
2. Entity & Relationship Agents
3. Human-in-the-Loop Review (critical gate)
4. ERD Design Agent
5. Application Dictionary Generator
6. Code Generation Engine

**Generated app tech stacks offered:**

- **Modern Web Stack:** TanStack Start / React 19+ / Shadcn UI / TailwindCSS / TanStack
  (Table, Form, Query) / NestJS / Fastify / Kysely / PostgreSQL — plus Mastra.ai,
  GoRules and Better-Auth. This is what `technology.html` and the guide describe, and
  what chapter 10 actually assembles.
- **Enterprise Stack:** OpenUI5 / OData protocol / PostgreSQL

**Key value propositions:**
- 90% faster development
- 75% cost reduction
- Full code ownership
- Enterprise features out of the box (RBAC, field-level security, row-level security, audit trails)
