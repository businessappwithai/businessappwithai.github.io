# businessappwithai.github.io

Marketing website for **AppWithAI** — an AI-powered business application generator that produces full-stack applications from natural language descriptions and EML model files.

Live at **https://www.appwithai.org** (canonical; redirects to apex `appwithai.org`).

## What it is

AppWithAI takes an Entity Modeling Language (`.eml.mmd`) file and generates a complete, runnable application: a NestJS API, a TanStack Start / React 19 frontend with shadcn/UI, PostgreSQL migrations, an enterprise reporting platform, and a deployable `docker compose up --build` archive — all from a single model.

This repository is the marketing and documentation site only. The generator lives in [`businessappwithai/app-with-ai-tanstack`](https://github.com/businessappwithai/app-with-ai-tanstack).

> **Experimental software, not fully tested.** The site says so in the hero and footer of the home page. The five items before a production-grade 1.0.0 release are listed on [`todo.html`](https://www.appwithai.org/todo.html).

## Tech stack

Built with [Docusaurus](https://docusaurus.io) 3.10, installed with Bun 1.4.4, over pages that are
still hand-written HTML.

- HTML5 / CSS3 (Lunaris Design System, custom properties throughout) — the pages are where they have always been
- Vanilla JavaScript ES6+
- Docusaurus (`@docusaurus/core` and one local plugin, `plugins/site-pages.mjs`) builds `build/`,
  serving every page at the URL it has always had
- GitHub Actions → GitHub Pages (automatic build and deploy on push to `main`)

## Local development

```bash
bun install        # Bun 1.4.4
bun run build      # Docusaurus → build/
bun run serve      # http://localhost:3000
node scripts/check-build.mjs   # every page and published file is served unchanged
```

A Service Worker on `guide/run-in-browser.html` and `guide/run-real-stack.html` requires `http://` or `https://` — `file://` will not work for those pages.

## Repository layout

```
businessappwithai.github.io/
├── package.json, bun.lock        # Docusaurus, installed with Bun 1.4.4
├── docusaurus.config.mjs         # trailingSlash: false — pages keep their .html URLs
├── plugins/site-pages.mjs        # One route per .html page; copies everything else into build/
├── src/components/SitePage.jsx   # Renders a page's <head> and its <body> verbatim
├── index.html                    # Landing page
├── features.html                 # Feature detail
├── how-it-works.html             # AI pipeline
├── technology.html               # Tech stack options
├── pricing.html                  # Pricing and ROI
├── justification.html            # Position paper ("Why AppWithAI")
├── try-it-yourself.html          # Conversion path — the main CTA
├── todo.html                     # What's missing before 1.0.0
├── assistant.html                # Model Assistant (bring your own API key)
├── contact.html                  # Contact / demo request
├── privacy.html                  # Analytics and key handling
├── llms.txt                      # EML protocol document for language models
├── guide/                        # "Build a CRM" guide, chapters 00–11
│   ├── index.html                # 00 · Overview
│   ├── run-in-browser.html       # 09 · Run it in your browser (PGlite + WASM)
│   ├── run-real-stack.html       # 10 · Real NestJS/TanStack in a WebContainer
│   ├── 11-check-a-model.html     # 11 · Published validators, live
│   ├── checker.js                # Published EML checker (ES module)
│   ├── fixer.js                  # Published EML fixer (ES module)
│   ├── check-model.mjs           # CLI runner: §1.3's three passes, exit 0/1/2
│   ├── audit-model.mjs           # CLI audit: 23-point checklist, exit 0/1/2
│   ├── models/                   # Eight published .eml.mmd examples
│   └── source/                   # Validators embedded in HTML pages (base64)
├── viewers/                      # Model viewer — ERD, workflows, rules, access
│   └── index.html                # Authored here; all other files vendored
├── assets/
│   ├── css/                      # Lunaris Design System + dark theme
│   └── js/                       # Main JS, guide controllers, vendored bundles
└── scripts/                      # CI scripts (check-spec, website-e2e, etc.)
```

## Key pages

| Page | Purpose |
|---|---|
| `index.html` | Hero (with experimental-software notice), stats, problem/solution, live demo link, "Try It Yourself" prompt |
| `try-it-yourself.html` | The conversion path: three steps, the prompt block, a complete worked model with every line explained, and both validators |
| `guide/run-in-browser.html` | Compiles an EML model in the browser (WASM) and runs it against PGlite — no server needed. Eight built-in models; `#crm`, `#hospital`, `#dance`, `#drug`, `#investment`, `#education`, `#airport`, `#upload` |
| `guide/run-real-stack.html` | Assembles the full NestJS / TanStack Start source and runs it in a StackBlitz WebContainer |
| `guide/11-check-a-model.html` | The published checker and fixer running live in the browser |
| `viewers/index.html` | Draws an `.eml.mmd` in full — entities, state machines, sagas, rules, access — using the generator's own parser |
| `assistant.html` | Model Assistant: bring an OpenAI or Claude key, load a model, describe a change — result is checked before download |
| `llms.txt` | The one protocol document language models are pointed at: EML syntax, Application Dictionary, working-session procedure |

## The EML protocol

`llms.txt` is vendored from upstream and defines:

- **§1** — Working-session procedure (new model or change to existing one)
- **§3.7** — Application Dictionary: reference types, enum bindings, form layout (`%%section`), help text
- **§5.2** — Record lifecycle: status machines, action buttons, RBAC per transition
- **§6** — Access control: functional roles, `%%rbac … .read` per entity
- **§8** — Checker contract: `checker.js`, `fixer.js`, `check-model.mjs`, `audit-model.mjs`

Validate any model with:

```bash
node guide/check-model.mjs path/to/model.eml.mmd   # 3-pass check, exit 0/1/2
node guide/audit-model.mjs path/to/model.eml.mmd   # 23-point audit, exit 0/1/2
```

## Vendored files

Several files are built upstream in `app-with-ai-tanstack` and copied here. Do not edit them directly — re-vendor from upstream:

| File(s) | Upstream source | Rebuilt with |
|---|---|---|
| `guide/checker.js`, `guide/fixer.js` | `html/checker.js`, `html/fixer.js` | `bun run build:language-tools` |
| `assets/js/appwithai-wasm.js` | `html/assets/appwithai-wasm.js` | `bun run build:wasm-browser` |
| `assets/js/appwithai-fullstack.js` | `html/assets/appwithai-fullstack.js` | same build |
| `assets/vendor/stack-templates.json` | `html/assets/stack-templates.json` | `bun run build:stack-templates` |
| `llms.txt` and its six chunks | `website/llmtext/` | — |
| `viewers/*.js`, `viewers/viewers.css` | `website/viewers/` | `bun run build:viewers` (for `eml-model.js`) |
| Published EML models | `html/models/`, `language/examples/`, `examples/` | — |

`scripts/check-upstream.mjs` runs in CI and fails on any byte of difference.

## CI

Two workflows:

- **`tests.yml`** — gates pull requests: verifies `llms.txt` examples, runs checker and audit on all eight published models, checks vendored source pages, runs `scripts/website-e2e.mjs`
- **`static.yml`** — deploys `main` to GitHub Pages automatically

Run the full test suite locally (no install needed):

```bash
node scripts/check-spec.mjs          # llms.txt claims vs. published checker
node scripts/website-e2e.mjs         # figures on every page vs. actual models
node guide/check-model.mjs guide/models/crm.eml.mmd
node guide/audit-model.mjs guide/models/crm.eml.mmd
```

## Generated application stack

| Layer | Technology |
|---|---|
| Frontend | TanStack Start / React 19 / shadcn/UI / TailwindCSS |
| State & data | TanStack Query, Table, Form |
| Backend | NestJS / Fastify / Kysely |
| Database | PostgreSQL |
| Auth | Better Auth (email + password, server-side sessions) |
| Business rules | GoRules |
| Agent orchestration | Mastra.ai |
| Reporting | Enterprise Reporting platform (separate service, same model) |

## Contributing

Edit the pages and assets in place, run `bun run build` and `node scripts/check-build.mjs`, and check the result with `bun run serve` before opening a pull request. Merging to `main` builds and deploys automatically.

Navigation is at its seven-item ceiling (1024px). Adding a nav item means removing one.
