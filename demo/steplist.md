# Demo Step List — Best CRM Comprehensive Walkthrough

Full flow: generation → login → dashboard → entity list → entity detail →
help text → manual → logout → enterprise reporting login → reporting
dashboard → 2 reports → 2 charts.

All steps reference screenshots in `img/`.

Hotspot coordinates are `x, y` as percent of a 1600 × 900 screenshot,
matching the `box` format in `demo.js` (box centre, not top-left).

---

## Step 1 — Start on Try It Yourself

**Image:** `img/01-try-it-yourself.jpg`  
**Title:** Start on Try It Yourself  
**Description:** appwithai.org/try-it-yourself is where an idea becomes a
running application. You describe your business to an AI assistant, it writes
one model file, and the platform builds the application from that file. Click
the ready-made CRM to follow along without writing anything.  
**Hotspot centre:** x 49, y 77  
**CTA:** Click "Or run the ready-made CRM"

---

## Step 2 — The CRM model is loaded and checked

**Image:** `img/02-model.jpg`  
**Title:** The CRM model is loaded and checked  
**Description:** The model is read and checked inside your browser — nothing
is sent to a server. It holds 17 entities, state machines, business rules,
nine functional roles and 132 access restrictions. The checker reports zero
errors before a single line of code is generated.  
**Hotspot centre:** x 59, y 50  
**CTA:** Click the model summary to continue

---

## Step 3 — Name the application "Best CRM"

**Image:** `img/03-name.jpg`  
**Title:** Name the application "Best CRM"  
**Description:** The name appears on the sign-in screen, the header and the
seeded account email addresses. Setting the sample-record count to 10 means
every list and dropdown has real-looking data the moment the application
boots.  
**Hotspot centre:** x 33, y 17  
**CTA:** Click the name field, then Generate

---

## Step 4 — Generated in seconds

**Image:** `img/04-generated.jpg`  
**Title:** Generated in seconds  
**Description:** The same parser and compilers the command-line tool uses ran
entirely in your browser. The result lists what was built: the database
schema, API, 17 screens, state machines, roles, seed data and a deployable
zip with Docker Compose — all from one model file.  
**Hotspot centre:** x 59, y 50  
**CTA:** Click the result to continue

---

## Step 5 — Run it in the browser

**Image:** `img/05-run.jpg`  
**Title:** Run it in the browser  
**Description:** PostgreSQL runs inside this tab, compiled to WebAssembly.
Clicking Run creates the database, applies every migration and seeds the
dictionary, accounts and sample records — no server, no install.  
**Hotspot centre:** x 30, y 50  
**CTA:** Click "Run the application"

---

## Step 6 — Best CRM is running

**Image:** `img/06-booted.jpg`  
**Title:** Best CRM is running  
**Description:** The application booted in the frame with nine seeded
accounts — one per functional role the model declares, plus the
administrator. Click "Open in a new tab" to use it at full size.  
**Hotspot centre:** x 90, y 29  
**CTA:** Click "Open in a new tab"

---

## Step 7 — Sign in as the administrator

**Image:** `img/07-signin.jpg`  
**Title:** Sign in as the administrator  
**Description:** The sign-in screen lists every seeded account. Each role
sees only the entities the model grants it. The Administrator sees all 17,
the Sales Manager 13, and the Support Agent 5. Access comes straight from the
model — nothing is configured by hand.  
**Hotspot centre:** x 17, y 44  
**CTA:** Click Sign in

---

## Step 8 — The dashboard

**Image:** `img/08-dashboard.jpg`  
**Title:** The dashboard  
**Description:** The 17 entities are grouped by business area: accounts and
contacts, demand generation, sales pipeline, customer service and more. Each
already has 10 sample records. The Enterprise Reporting card is in the lower
half — the same model produced a second application.  
**Hotspot centre:** x 11, y 50  
**CTA:** Click the Lead card

---

## Step 9 — A complete list for every entity

**Image:** `img/09-lead-list.jpg`  
**Title:** A complete list for every entity  
**Description:** Sorting, filtering, CSV export and every column the model
declared — status, owner, source campaign, lead score and a timestamp for
each lifecycle stage. The column order and labels come from the model, not
from configuration.  
**Hotspot centre:** x 51, y 35  
**CTA:** Click the first row

---

## Step 10 — The record form

**Image:** `img/10-record.jpg`  
**Title:** The record form  
**Description:** The form is laid out in headed sections, two columns wide,
exactly as the model's section directives describe. The status is
system-managed — a record moves only through its action buttons, and only
for the roles the model allows.  
**Hotspot centre:** x 9, y 25  
**CTA:** Click the status field

---

## Step 11 — Field help text

**Image:** `img/10-record.jpg`  
**Title:** Field help text from the model  
**Description:** Every field displays the help text written into the model's
%%field help: lines. This is the same text that appears in the generated
manual — one source, two surfaces, neither can drift from the other.  
**Hotspot centre:** x 50, y 60  
**CTA:** Scroll down to see the help text under each field

> **Note:** Reuses `img/10-record.jpg`. A dedicated screenshot showing the
> help text visible beneath a field would sharpen this step. Suggested
> filename: `img/10b-record-help.jpg` — scroll the form so a field with a
> longer help blurb is visible.

---

## Step 12 — A manual comes with it

**Image:** `img/11-manual-button.jpg`  
**Title:** A manual comes with it  
**Description:** Every generated application gets a manual written from the
same model. The Manual button appears on the dashboard header; the file is
already there — written at generation time, not on request.  
**Hotspot centre:** x 93, y 27  
**CTA:** Click "Open the manual"

---

## Step 13 — The generated manual

**Image:** `img/12-manual.jpg`  
**Title:** The generated manual  
**Description:** One self-contained page: a contents table, then a section
per entity listing every field with its control type, constraints and help
text, its relationships, state machine, business rules and the roles that may
read it. It is written from the model's own help text, so it cannot drift
from the application.  
**Hotspot centre:** x 50, y 50  
**CTA:** Click an entity in the contents table

---

## Step 14 — Sign out and switch roles

**Image:** `img/16-role-pick.jpg`  
**Title:** Sign out and switch roles  
**Description:** Signing out lands on the account list. Each account is a
different functional role. Pick Support Agent to see what a restricted user
sees — five of the 17 entities, defined entirely by the model's access
control lines.  
**Hotspot centre:** x 17, y 73  
**CTA:** Click "Support Agent"

---

## Step 15 — Enterprise Reporting card

**Image:** `img/13-reporting-card.jpg`  
**Title:** Enterprise Reporting — a second application  
**Description:** The same model that produced the CRM also produced a
reporting application with its own sign-in, its own role-based accounts and
116 pre-built reports derived from the model's structure and report
directives.  
**Hotspot centre:** x 9, y 50  
**CTA:** Click "Open reporting"

---

## Step 16 — Reporting sign-in

**Image:** `img/14-reporting-signin.jpg`  
**Title:** Reporting sign-in — its own accounts  
**Description:** Reporting roles mirror the application's roles and control
which of the application's tables each person's queries may read. The
administrator account sees all tables; a support agent sees only the five
tables their application role works with.  
**Hotspot centre:** x 50, y 46  
**CTA:** Click Sign in

---

## Step 17 — Reporting dashboard

**Image:** `img/15-reporting.jpg`  
**Title:** Reports, charts and a dashboard  
**Description:** The model generated 116 reports, 84 charts and a dashboard
— all derived from its structure and report directives. The sidebar lists
every report grouped by entity. Click Reports to see the full list.  
**Hotspot centre:** x 5, y 26  
**CTA:** Click Reports in the sidebar

---

## Step 18 — Report 1: a list report

**Image:** `img/18-report-1.jpg`  
**Title:** A generated list report  
**Description:** Every entity with a %%report directive gets a list report —
sortable columns, the entity's declared filters and a CSV export. The column
order and labels come from the model.  
**Hotspot centre:** x 50, y 40  
**CTA:** Click the first row to open the detail report

> **Capture:** From the reporting application (step 17), click Reports in the
> sidebar, then open any list report (e.g. the Lead report). Screenshot at
> 1600 × 900.

---

## Step 19 — Report 2: a detail / drill-down report

**Image:** `img/19-report-2.jpg`  
**Title:** A detail report with related data  
**Description:** Each row in a list report opens a detail view pulling in
related records across entities — the same relationships the model's FK lines
declare. No query was written by hand.  
**Hotspot centre:** x 50, y 50  
**CTA:** Click the Charts tab

> **Capture:** From report 1, click any row to open its detail panel.
> Screenshot at 1600 × 900.

---

## Step 20 — Chart 1: a bar or line chart

**Image:** `img/20-chart-1.jpg`  
**Title:** Charts from the model  
**Description:** Every %%report line that declared a chart type gets a
rendered chart — bar, line, pie or area, as the model specifies. No
configuration tool, no drag-and-drop: the model is the configuration.  
**Hotspot centre:** x 50, y 50  
**CTA:** Click the next chart

> **Capture:** From the reporting sidebar, click Charts, then open any chart
> (e.g. Lead pipeline by status — bar chart). Screenshot at 1600 × 900.

---

## Step 21 — Chart 2: a second chart

**Image:** `img/21-chart-2.jpg`  
**Title:** 84 charts, all from one model file  
**Description:** The 84 charts span every entity that has report directives.
One model file, two applications, 116 reports, 84 charts and a live database
— all from a description of a business.  
**Hotspot centre:** x 50, y 50  
**CTA:** See the full application at appwithai.org/guide/run-in-browser.html

> **Capture:** A second chart view — e.g. Deals closed by month (line chart)
> or Contacts by industry (pie). Screenshot at 1600 × 900.

---

## Screenshot inventory

All 21 steps have screenshots. All screenshots are 1600 × 900 from
`appwithai.org/guide/run-in-browser.html` using the CRM model, named "Best CRM".

Optional enhancement: `img/10b-record-help.jpg` — record form scrolled to show field help text.

---

## Existing image inventory

| # | File | Current demo step ID | Used in this list |
|---|------|----------------------|-------------------|
| 01 | `img/01-try-it-yourself.jpg` | try-it-yourself | Step 1 |
| 02 | `img/02-model.jpg` | model | Step 2 |
| 03 | `img/03-name.jpg` | name | Step 3 |
| 04 | `img/04-generated.jpg` | generated | Step 4 |
| 05 | `img/05-run.jpg` | run | Step 5 |
| 06 | `img/06-booted.jpg` | booted | Step 6 |
| 07 | `img/07-signin.jpg` | signin | Step 7 |
| 08 | `img/08-dashboard.jpg` | dashboard | Step 8 |
| 09 | `img/09-lead-list.jpg` | lead-list | Step 9 |
| 10 | `img/10-record.jpg` | record | Steps 10, 11 |
| 11 | `img/11-manual-button.jpg` | manual-button | Step 12 |
| 12 | `img/12-manual.jpg` | manual | Step 13 |
| 13 | `img/13-reporting-card.jpg` | reporting-card | Step 15 |
| 14 | `img/14-reporting-signin.jpg` | reporting-signin | Step 16 |
| 15 | `img/15-reporting.jpg` | reporting | Step 17 |
| 16 | `img/16-role-pick.jpg` | role-pick | Step 14 |
| 17 | `img/17-support.jpg` | support | (not in this flow — available for a "restricted view" bonus step) |
| 18 | `img/18-zip.jpg` | zip | (not in this flow — available for a "deploy to production" closing step) |
