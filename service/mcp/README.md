# AppWithAI for ChatGPT — the model never leaves the user's device

```
www.appwithai.org ──(checker.js, fixer.js, the panel: code only)──► ChatGPT client
user's .mmd ───────────────────────────────────────────────────────X  never to AppWithAI
```

| Piece | What it does | Where it runs |
|---|---|---|
| `plugin/appwithai-eml.js` | `analyze(source)` — check, safe repair, re-check, summary figures. Imports the published `guide/checker.js`, `guide/fixer.js` and `viewers/eml-model.js`; no copy, no build | the user's browser / ChatGPT panel |
| `plugin/app.js`, `app.css` | The panel: open, check, show problems, save | the same |
| `plugin/index.html` | The panel as a standalone page, `https://www.appwithai.org/plugin/`, under a CSP of `connect-src 'none'` | any browser |
| `plugin/manifest.js` | EML version and the SHA-256 of every file the panel runs, shown under each result | generated |
| `service/mcp/server.js` | The MCP server ChatGPT needs to register the app and its panel. **Two tools, neither takes any input**; the panel resource allows scripts from `www.appwithai.org` and connections to no AppWithAI domain | Cloudflare Workers / Node |

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

## Not yet verified against a live ChatGPT

The panel feature-detects `window.openai.selectFiles`, `getFileDownloadUrl` and
`uploadFile`, and accepts a file reference in `toolInput`, `toolOutput` or
`widgetState`. Their exact shapes have not been checked against a live ChatGPT,
so the panel always also offers *Open .mmd…*, drop and paste, which work in any
browser. Registering `.mmd` as a file type the app opens ("Open with AppWithAI")
is a setting made when publishing the app on OpenAI's side.

The 22-point audit is not in the panel yet. It lives in `guide/audit-model.mjs`
as a command-line script, not a library.
