// Controller for demo/index.html: a click-through of real Best CRM screenshots.
// No model logic lives here; the screenshots were taken from the application the vendored generator produced.
(function () {
  var STEPS = [
    {“id”: “try-it-yourself”, “img”: “img/01-try-it-yourself.jpg”, “box”: {“x”: 39.22, “y”: 72.73, “w”: 20.25, “h”: 8.53}, “title”: “Start on Try It Yourself”, “text”: “appwithai.org/try-it-yourself takes you from an idea to a running application. You describe your business to an AI assistant, it writes one model file, and the platform builds the application from it. Pick the ready-made CRM to follow along.”, “cta”: “Click “Or run the ready-made CRM””},
    {“id”: “model”, “img”: “img/02-model.jpg”, “box”: {“x”: 24.19, “y”: 47.98, “w”: 69.62, “h”: 4.06}, “title”: “The CRM model is loaded and checked”, “text”: “The model is read and checked inside your browser, so nothing is sent to a server. It holds 17 entities, plus the state machines, rules, roles and access restrictions listed here. The checker reports zero errors.”, “cta”: “Click the model summary to continue”},
    {“id”: “name”, “img”: “img/03-name.jpg”, “box”: {“x”: 24.19, “y”: 13.82, “w”: 17.31, “h”: 5.82}, “title”: “Name the application “Best CRM””, “text”: “The name goes onto the sign-in screen, the header and the seeded account emails. Ten sample records per entity are generated too, so every list and dropdown has something to show.”, “cta”: “Click the name field, then Generate”},
    {“id”: “generated”, “img”: “img/04-generated.jpg”, “box”: {“x”: 24.19, “y”: 21.34, “w”: 69.62, “h”: 57.27}, “title”: “Generated in seconds”, “text”: “The same parser and compilers the command-line tool uses ran in your browser. The result lists what was built: the database schema, API, screens, rules, roles and seed data. You can download it as files or as a deployable .zip with Docker Compose.”, “cta”: “Click the result to continue”},
    {“id”: “run”, “img”: “img/05-run.jpg”, “box”: {“x”: 24.19, “y”: 46.79, “w”: 11.79, “h”: 6.35}, “title”: “Run it”, “text”: “PostgreSQL runs inside this tab, compiled to WebAssembly. Running creates the database, applies the migrations and seeds the dictionary and sample records.”, “cta”: “Click “Run the application””},
    {“id”: “booted”, “img”: “img/06-booted.jpg”, “box”: {“x”: 85.25, “y”: 26.87, “w”: 9.0, “h”: 4.89}, “title”: “Best CRM is running”, “text”: “The application booted in the frame. It seeded nine accounts: one for each role the model declares, plus the administrator. Open it full screen to see more.”, “cta”: “Click “Open in a new tab””},
    {“id”: “signin”, “img”: “img/07-signin.jpg”, “box”: {“x”: 4.62, “y”: 41.69, “w”: 24.5, “h”: 5.42}, “title”: “Sign in as the administrator”, “text”: “The sign-in screen lists every seeded account. Each role sees only its own entities. The Administrator sees all 17, the Support Agent 5 and the Sales Manager 13. Access comes straight from the model.”, “cta”: “Click Sign in”},
    {“id”: “dashboard”, “img”: “img/08-dashboard.jpg”, “box”: {“x”: 2.31, “y”: 48.08, “w”: 16.77, “h”: 3.56}, “title”: “The dashboard”, “text”: “The 17 entities are grouped by business area: accounts and contacts, demand generation, sales pipeline, customer service and more. Each already has 10 sample records. Open Lead.”, “cta”: “Click the Lead card”},
    {“id”: “lead-list”, “img”: “img/09-lead-list.jpg”, “box”: {“x”: 1.06, “y”: 31.6, “w”: 98.94, “h”: 6.23}, “title”: “A complete list for every entity”, “text”: “Sorting, filtering, CSV export and every column the model declared: status, owner, campaign, score and a timestamp for each stage the lead has passed through. Open a record.”, “cta”: “Click the first row”},
    {“id”: “record”, “img”: “img/10-record.jpg”, “box”: {“x”: 6.02, “y”: 22.47, “w”: 5.81, “h”: 4.13}, “title”: “The record form”, “text”: “The form is laid out in headed sections, two columns wide, as the model’s section lines describe. The status is system-managed. A record moves only through its action buttons, and only for the roles the model allows.”, “cta”: “Click the status”},
    {“id”: “manual-button”, “img”: “img/11-manual-button.jpg”, “box”: {“x”: 88.59, “y”: 23.89, “w”: 9.22, “h”: 5.42}, “title”: “A manual comes with it”, “text”: “Every application gets a manual written from the same model.”, “cta”: “Click “Open the manual””},
    {“id”: “manual”, “img”: “img/12-manual.jpg”, “box”: {“x”: 21.12, “y”: 19.15, “w”: 57.75, “h”: 61.64}, “title”: “The generated manual”, “text”: “It covers each entity, every field with its control type, constraints and help text, plus relationships, state machines and roles. It is written from the model’s own help text, so it can’t drift from the application.”, “cta”: “Click the contents table”},
    {“id”: “reporting-card”, “img”: “img/13-reporting-card.jpg”, “box”: {“x”: 5.44, “y”: 48.03, “w”: 7.45, “h”: 3.91}, “title”: “A second application: Enterprise Reporting”, “text”: “The same model also produces a reporting application with its own sign-in and its own accounts.”, “cta”: “Click “Open reporting””},
    {“id”: “reporting-signin”, “img”: “img/14-reporting-signin.jpg”, “box”: {“x”: 37.12, “y”: 43.33, “w”: 25.75, “h”: 5.56}, “title”: “Its own sign-in”, “text”: “Reporting roles mirror the application’s roles and decide which tables each person’s queries may read.”, “cta”: “Click Sign in”},
    {“id”: “reporting”, “img”: “img/18-report-1.jpg”, “box”: {“x”: 3.38, “y”: 24, “w”: 4.0, “h”: 3.56}, “title”: “116 reports, 84 charts — from one model file”, “text”: “The reporting application opens with every report and chart the model declared. 116 tabular reports, 84 visualisations and a live dashboard — none written by hand, all derived from the model’s report lines.”, “cta”: “Click Reports to see live query results”},
    {“id”: “report-data”, “img”: “img/19-report-2.jpg”, “box”: {“x”: 15, “y”: 52, “w”: 72, “h”: 18}, “title”: “Reports that run live queries against your data”, “text”: “Open Pipeline Value by Stage queried the live database and returned three rows in under 50 milliseconds: proposal, needs analysis and negotiation — with deal counts and total values. The SQL came from the model’s report directives, not from a query editor.”, “cta”: “Click Charts in the sidebar”},
    {“id”: “charts-list”, “img”: “img/20-chart-1.jpg”, “box”: {“x”: 80, “y”: 32, “w”: 12, “h”: 5}, “title”: “84 charts, none built by hand”, “text”: “Every chart in this list is specified in the model with a name, chart type and the report it draws from. The platform derived all 84 — bar, line and pie — from those declarations. No drag-and-drop, no configuration panel.”, “cta”: “Click View to open a chart”},
    {“id”: “chart-view”, “img”: “img/21-chart-2.jpg”, “box”: {“x”: 18, “y”: 42, “w”: 60, “h”: 32}, “title”: “A rendered chart — live data, model-defined”, “text”: ““Why deals were lost” ran its query, returned two rows and drew the pie. The chart title and description come directly from the model’s help text. One model file; two applications; 116 reports, 84 charts and a live database.”, “cta”: “Back to the main application to see another role”},
    {“id”: “role-pick”, “img”: “img/16-role-pick.jpg”, “box”: {“x”: 5.38, “y”: 71.63, “w”: 23, “h”: 3.56}, “title”: “See what another role sees”, “text”: “Back in the application, sign out and pick the Support Agent, one of the seeded roles.”, “cta”: “Click “Support Agent””},
    {“id”: “support”, “img”: “img/17-support.jpg”, “box”: {“x”: 2.31, “y”: 48.1, “w”: 16.77, “h”: 3.56}, “title”: “Five of seventeen entities”, “text”: “The Support Agent sees support cases, SLA policies, accounts, contacts and activities. Nothing else is visible or reachable.”, “cta”: “Click Support Case”},
    {“id”: “zip”, “img”: “img/18-zip.jpg”, “box”: {“x”: 36.68, “y”: 45.94, “w”: 26.63, “h”: 8.09}, “title”: “Take it to production”, “text”: “The browser run is the demo. The real application is the .zip: NestJS, TanStack Start, PostgreSQL and Docker Compose. Unzip it, run docker compose up --build, and you have Best CRM with its API, front end, database and reporting platform.”, “cta”: “Click “Generate a model and download the app””}
  ];
  var shot = document.getElementById('shot'), hot = document.getElementById('hot'), stage = document.getElementById('stage');
  var titleEl = document.getElementById('title'), textEl = document.getElementById('text'), ctaEl = document.getElementById('cta');
  var countEl = document.getElementById('count'), rail = document.getElementById('rail'), nudge = document.getElementById('nudge');
  var back = document.getElementById('back'), next = document.getElementById('next');
  var i = 0, nudgeTimer = null;

  STEPS.forEach(function (s, n) {
    var b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', 'Step ' + (n + 1) + ': ' + s.title);
    b.addEventListener('click', function () { go(n); });
    rail.appendChild(b);
  });

  function fromHash() {
    var m = /^#step-(\d+)$/.exec(location.hash);
    var n = m ? parseInt(m[1], 10) - 1 : 0;
    return n >= 0 && n < STEPS.length ? n : 0;
  }
  function render() {
    var s = STEPS[i];
    shot.src = s.img; shot.alt = 'Screenshot of Best CRM: ' + s.title;
    titleEl.textContent = s.title; textEl.textContent = s.text; ctaEl.textContent = s.cta;
    countEl.textContent = 'Step ' + (i + 1) + ' of ' + STEPS.length;
    hot.style.left = s.box.x + '%'; hot.style.top = s.box.y + '%';
    hot.style.width = s.box.w + '%'; hot.style.height = s.box.h + '%';
    hot.setAttribute('aria-label', s.cta);
    Array.prototype.forEach.call(rail.children, function (b, n) { b.className = n < i ? 'done' : n === i ? 'now' : ''; });
    back.disabled = i === 0;
    var last = i === STEPS.length - 1;
    next.textContent = last ? 'Start again' : 'Next';
    nudge.classList.remove('show');
    var pre = STEPS[i + 1]; if (pre) { var im = new Image(); im.src = pre.img; }
  }
  function go(n) {
    i = Math.max(0, Math.min(STEPS.length - 1, n));
    try { history.replaceState(null, '', i === 0 ? location.pathname + location.search : '#step-' + (i + 1)); } catch (e) {}
    render();
  }
  function advance() { go(i === STEPS.length - 1 ? 0 : i + 1); }

  hot.addEventListener('click', function (e) { e.stopPropagation(); advance(); });
  stage.addEventListener('click', function () {
    nudge.classList.add('show'); clearTimeout(nudgeTimer);
    nudgeTimer = setTimeout(function () { nudge.classList.remove('show'); }, 1800);
  });
  next.addEventListener('click', advance);
  back.addEventListener('click', function () { go(i - 1); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { advance(); }
    else if (e.key === 'ArrowLeft') { go(i - 1); }
  });
  window.addEventListener('hashchange', function () { i = fromHash(); render(); });

  i = fromHash(); render();
})();

// Copy the voiceover script (the "Copy the script" button in #script).
(function () {
  var btn = document.getElementById('copy-vo'), st = document.getElementById('vo-status');
  if (!btn) return;
  function text() {
    var out = ['BEST CRM DEMO - VOICEOVER SCRIPT', ''];
    document.querySelectorAll('.dm-seg').forEach(function (s) {
      out.push('[' + s.querySelector('.dm-tc').textContent.replace(/\s+/g, ' ').trim() + '] ' + s.querySelector('h3').textContent);
      out.push(s.querySelector('.dm-line').textContent, '');
    });
    return out.join('\n');
  }
  btn.addEventListener('click', function () {
    function fallback() {
      var r = document.createRange(); r.selectNodeContents(document.querySelector('.dm-segs'));
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      st.textContent = 'Selected. Press Ctrl+C or Cmd+C to copy.';
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text()).then(function () { st.textContent = 'Copied.'; }, fallback);
    } else { fallback(); }
  });
})();
