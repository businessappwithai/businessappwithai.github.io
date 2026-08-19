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
├── guide/                    # "Build a CRM" guide (chapters 00–11)
│   ├── index.html            # 00 · Overview
│   ├── 01-…08-reference.html # Chapters 01–08
│   ├── run-in-browser.html   # 09 · Run it in your browser
│   ├── run-real-stack.html   # 10 · Run the real stack
│   ├── 11-check-a-model.html # 11 · Check a model
│   ├── checker.js            # Published EML checker (ES module)
│   ├── fixer.js              # Published EML fixer (ES module)
│   ├── coi-sw.js             # Service Worker that isolates chapter 10
│   ├── img/                  # Screenshots used by the chapters
│   ├── models/               # Example EML models the chapters load
│   └── wasm-app/sw.js        # Service Worker that hosts the generated app
├── llms-full.txt             # Machine-readable specification, for language models
├── index.html                # Home/landing page
├── justification.html        # Position paper: why the platform exists
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
| `guide/index.html` | "Build a CRM" guide overview, chapters 00–11 |
| `guide/run-in-browser.html` | Chapter 09: generates and runs a full application in the visitor's browser |
| `guide/run-real-stack.html` | Chapter 10: assembles the real NestJS/TanStack app and runs it in a WebContainer |
| `guide/11-check-a-model.html` | Chapter 11: the authoring protocol, and the published validators running live |
| `llms-full.txt` | The machine-readable specification language models are pointed at |

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
media query (1024–1279px) tightens the gap and type size instead. **Adding an
eighth nav item will not fit** — check at 1024px before you do.

**"Live Demo" points at `guide/run-in-browser.html`**, the in-browser CRM. It is
same-origin, so it carries no `target="_blank"`. There was formerly an externally
hosted Hospital Management System demo at a raw IP over plain `http://`; it has
been removed site-wide and the CRM is the one worked example the whole site uses.
Do not reintroduce a demo the site cannot serve itself.

## "Try It Yourself" — the conversion path

The section on the home page (`index.html#try-it-yourself`) is the site's main call to
action, and it spans four files. If you change one, check the others.

1. **The prompt block** carries the specification URL inside a `[data-url]` span, so a
   visitor copies a link to the host they are actually on. The copy button is
   `[data-copy]` pointing at `#research-prompt`. Both are handled by `main.js`.
2. **`llms-full.txt`** is what that prompt tells the model to read. Its §10 is the
   authoring protocol; the three steps on the page are a plain-English retelling of it.
   If §10 changes upstream, the three cards should change with it.
3. **`guide/run-in-browser.html#upload`** is where the reader lands with their model.
   The hash is honoured in `run-in-browser.js`: it selects the upload choice and scrolls
   the dropzone into view instead of showing the CRM example.
4. **`how-it-works.html`** carries a pointer section that links back to the home page
   rather than duplicating the steps. Keep it a pointer.

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

`guide/checker.js` and `guide/fixer.js` are the ES modules that §10.3 of `llms-full.txt` tells language
models to import, at exactly those URLs. **Do not move or rename them** — the specification, published
here as `llms-full.txt`, hard-codes `https://appwithai.org/guide/checker.js` and `…/fixer.js`.

They are built in the generator repository by `bun run build:language-tools` from
`language/browser/*.entry.ts`, and they are the same engines the CLI runs. `assets/js/validator.js` is
only a front end for them — never add validation logic to it, or a model could pass here and fail in the
generator.

## Vendored files

Everything under `assets/vendor/`, plus `assets/js/erdwithai-*.js`, `assets/js/run-*.js`,
`guide/wasm-app/sw.js`, `guide/checker.js`, `guide/fixer.js` and `llms-full.txt`, comes from
`businessappwithai/app-with-ai-tanstack`. Re-copy them rather than editing by hand. The local deltas,
all deliberate and all commented at the point of change:

| File | Local change | Why |
|---|---|---|
| `assets/js/run-in-browser.js` | Probes `assets/vendor/pglite/` and mounts a re-export shim at the app's `vendor/pglite/index.js` | This site vendors PGlite, so no CDN is ever reached |
| `assets/js/run-real-stack.js` | Vendored API and template URLs; font restore; boot timeout; environment check | No third-party module host; a hang becomes a message |
| `guide/wasm-app/sw.js` | `ignoreMethod: true` in `serve()` | The Cache API matches GET only, so HEAD probes escaped to the network and 404'd |
| `llms-full.txt` | The guide's chapter count in the header | It describes this site, and this site has twelve chapters |

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
