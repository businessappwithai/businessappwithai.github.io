# AppWithAI for ChatGPT — model contents never reach AppWithAI

```
www.appwithai.org ──(checker.js, fixer.js, panel code only)──────► ChatGPT client
user's .mmd ── browser / ChatGPT session only ────────────────────X  never to AppWithAI
```

| Piece | What it does | Where it runs |
|---|---|---|
| `plugin/appwithai-eml.js` | `analyze(source, file)` — check, safe repair, re-check, the 22-point audit, summary figures. Imports the published `guide/checker.js`, `guide/fixer.js`, `guide/audit-model.mjs` and `viewers/eml-model.js`; no copy, no build | the user's browser / ChatGPT panel |
| `plugin/app.js`, `app.css` | The panel: open, check, show problems, save | the same |
| `plugin/index.html` | The panel as a standalone page, `https://www.appwithai.org/plugin/`, under a CSP of `connect-src 'none'` | any browser |
| `plugin/manifest.js` | EML version and the SHA-256 of every file the panel runs, shown under each result | generated |
| `service/mcp/server.js` | The MCP server ChatGPT needs to register the app and its panel. **Two tools, neither takes any input** (a third, the file entrypoint, is opt-in — below); the panel resource (`text/html;profile=mcp-app`) allows scripts from `www.appwithai.org` and connections to no AppWithAI domain | Cloudflare Workers / Node |
| `guide/audit-model.mjs` | The 22-point audit. It now exports `audit(source, { check, checkAndFix, file })` — the function its command line runs — so the panel scores a model with the published runner's own code | everywhere |

**Why there is no `check_model(source)` tool.** A tool's arguments are sent to
the MCP server, so any tool that accepted a model would carry it to AppWithAI.
The panel reads the model itself, through ChatGPT's file functions, and checks
it there. `scripts/check-plugin.mjs` (run in CI) fails if a tool ever declares an
input, if the panel's code gains any way to send, or if the page's CSP is
loosened.

## Deploy

1. The panel is served by GitHub Pages once this is on `main`:
   `https://www.appwithai.org/plugin/`.
2. The MCP server (once):
   ```sh
   cd service/mcp && npx wrangler login && npx wrangler deploy
   ```
   or `PORT=8787 node service/mcp/node-server.mjs` on any Node 18+ host.
3. In ChatGPT, add the deployed URL as an app's MCP server (developer mode),
   then invoke AppWithAI in a chat.

## How a model reaches the panel

All three are implemented to OpenAI's documented API and were exercised in
Chromium against a mock host that speaks the same protocol. None has been run
inside a live ChatGPT yet; that needs the deployment above.

| Path | Protocol | Saving |
|---|---|---|
| **Open AppWithAI** from the plugin/sidebar/thread, then choose a ChatGPT file | `window.openai.selectFiles()` → `[{ fileId, fileName }]`, then `getFileDownloadUrl({ fileId })` → one credential-less GET to ChatGPT/OpenAI | `window.openai.uploadFile(file)` into the current ChatGPT session; no Library persistence requested |
| **Open .mmd… / drop / paste** | the browser's own file APIs | session save through `uploadFile` when available, otherwise a local download |
| **Open with AppWithAI** on an `.mmd` (optional desktop-only entrypoint) | MCP resource bridge: `ui/notifications/tool-input` → `resources/read`, intercepted by ChatGPT | `openai/resources/write` only when ChatGPT marks the resource writable |

The panel loads cross-origin from `www.appwithai.org`; GitHub Pages serves
every file with `access-control-allow-origin: *` and `.mjs` as
`text/javascript`, which a module import needs.

## "Open with AppWithAI" for `.mmd` — optional desktop-only entrypoint

OpenAI currently supports file-extension entrypoints on desktop, not ChatGPT web,
iOS or Android. The primary cross-platform path is therefore the global/thread
AppWithAI entrypoint plus the ChatGPT file helpers above. The optional desktop
file entrypoint (`_meta["openai/ui"].entrypoints: [{ type: "file",
extensions: [".mmd"] }]`) makes ChatGPT call the app's tool with
`{ file: { name, resourceUri } }`. The **contents** never reach this server —
the panel reads them through ChatGPT — but the **file name** does, and the
privacy rule lists the file name as something AppWithAI must not receive. So it
is off unless the deployment sets `FILE_ENTRYPOINT=1`:

```sh
npx wrangler deploy --var FILE_ENTRYPOINT:1     # Workers
FILE_ENTRYPOINT=1 node service/mcp/node-server.mjs
```

The server never reads, stores or logs that tool's arguments. Keep this entrypoint
disabled when the policy is that even file-name metadata must not reach AppWithAI.
