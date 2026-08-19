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
│   │   ├── style.css         # Main stylesheet (Lunaris Design System, ~976 lines)
│   │   ├── guide.css         # Documentation layer for the "Build a CRM" guide
│   │   └── guide-demo.css    # Scoped styles for the in-browser demo chapter
│   └── js/
│       ├── main.js           # Main JS (scroll animations, nav, forms, ~236 lines)
│       ├── guide.js          # Guide chapter nav and screenshot lightbox
│       ├── run-in-browser.js # Demo controller for guide/run-in-browser.html
│       └── erdwithai-wasm.js # Vendored generator bundle (parser + compilers)
├── guide/                    # "Build a CRM" guide (chapters 00–09)
│   ├── index.html            # 00 · Overview
│   ├── 01-…08-reference.html # Chapters 01–08
│   ├── run-in-browser.html   # 09 · Run it in your browser (live demo)
│   ├── img/                  # Screenshots used by the chapters
│   ├── models/               # Example EML models the demo loads
│   └── wasm-app/sw.js        # Service Worker that hosts the generated app
├── index.html                # Home/landing page
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
| `index.html` | Landing page: hero, stats, problem/solution, feature previews, demo showcase |
| `features.html` | Detailed feature breakdown (AI modeling, forms, workflows, security, analytics) |
| `how-it-works.html` | Step-by-step AI pipeline with multi-agent architecture diagram |
| `technology.html` | Two tech stack options: Modern Web Stack and Enterprise SAP-Style Stack |
| `pricing.html` | Pricing tiers, cost comparison vs. traditional development, ROI metrics |
| `contact.html` | Demo request and contact form |
| `guide/index.html` | "Build a CRM" guide overview, chapters 00–09 |
| `guide/run-in-browser.html` | Chapter 09: generates and runs a full application in the visitor's browser |

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

**Timeline:** `.timeline`, `.timeline-item`

**Comparison:** `.comparison-table` with `.check` / `.cross` marker classes

**Pricing:** `.pricing-card`, `.pricing-card.popular`, `.pricing-badge`, `.pricing-features`

**Utilities:** `.mt-1` through `.mt-5`, `.mb-1` through `.mb-5`

### Responsive Breakpoints

- Mobile: `max-width: 767px`
- Tablet/Desktop: `min-width: 768px`
- Design is desktop-first with mobile overrides

## JavaScript Conventions

`assets/js/main.js` is loaded on every page. Key behaviors:

- **Mobile menu:** Hamburger toggle with animated icon transform
- **Scroll animations:** Intersection Observer triggers `fadeInUp` on `.card`, `.feature-card`, `.timeline-item`
- **Nav highlighting:** Active link detection by matching `href` to current page filename
- **Form validation:** Red border on empty required fields on blur; blue border on focus
- **Stats counter:** Animated number increment on scroll into view
- **External links:** Automatically get `target="_blank"` + `rel="noopener noreferrer"`

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
3. PostgreSQL is PGlite, fetched once from a CDN and cached by the browser, and the database lives in
   the visitor's IndexedDB. Nothing the visitor loads is uploaded anywhere.

**Constraints to respect**

- The page must be served over `http://` or `https://` — a Service Worker cannot register from `file://`.
- Paths in `run-in-browser.js` are resolved against the page URL (`models/…`, `wasm-app/…`), so the page,
  `guide/models/` and `guide/wasm-app/` must stay siblings.
- `erdwithai-wasm.js` and `run-in-browser.js` are vendored from the generator repository. Re-copy them
  rather than editing by hand; the only local change is the removal of the vendored-PGlite probe, which
  this site does not ship.
- `guide-demo.css` is scoped entirely to `.guide-demo` so that the demo's own `.btn`, `.card`, `.stage`
  and similar names never collide with the Lunaris classes. Its palette is a token bridge onto the
  design system variables — change the bridge, not the individual rules.

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

Concurrency is configured so that a new deploy cancels any in-progress deploy (not queued).

## Product Context

**AppWithAI** generates full-stack business applications from natural language descriptions using a multi-agent AI pipeline:

1. Domain Analysis Agent
2. Entity & Relationship Agents
3. Human-in-the-Loop Review (critical gate)
4. ERD Design Agent
5. Application Dictionary Generator
6. Code Generation Engine

**Generated app tech stacks offered:**

- **Modern Web Stack:** Next.js 14+ / React 18 / Shadcn UI / TailwindCSS / TanStack (Table, Form, Query) / NestJS 10+ / Fastify / Knex.js / PostgreSQL
- **Enterprise Stack:** OpenUI5 / OData protocol / PostgreSQL

**Key value propositions:**
- 90% faster development
- 75% cost reduction
- Full code ownership
- Enterprise features out of the box (RBAC, field-level security, row-level security, audit trails)
