# The checker as a service — for ChatGPT and other assistants with no sandbox network

ChatGPT's code sandbox refuses every outbound connection, so it can never
download `guide/checker.js`. A **GPT Action** is different: it is an HTTP call
made from OpenAI's servers, not from the sandbox. This directory is the service
such an Action calls: `POST /check` with a model, get the official checker's
verdict back.

It reimplements nothing. `worker.js` imports `../../guide/checker.js` and
`../../guide/fixer.js` — the bytes the site publishes — and runs §1.3's passes
exactly as `guide/check-model.mjs` does. `node scripts/check-service.mjs` (run by
CI) holds its verdict and exit code to the runner's on every published model.

## Deploy (once)

**Cloudflare Workers** (free tier is enough):

```sh
cd service/check
npx wrangler login
npx wrangler deploy          # → https://appwithai-check.<account>.workers.dev
```

Optional: give it a custom domain such as `https://check.appwithai.org`
(Workers → the worker → Settings → Domains & Routes).

**Anything that runs Node 18+** (a VM, a container, Render, Fly.io):

```sh
PORT=8787 node service/check/node-server.mjs
```

Redeploy whenever `guide/checker.js` or `guide/fixer.js` is re-vendored; the
deploy bundles them.

## API

```
GET  /               what this is
GET  /openapi.json   the schema for a GPT Action
POST /check          {"model": "<the .mmd text>", "maxIssues": 100, "full": false}
                     or the raw .mmd as text/plain
```

The response always carries `verdict` (the checker's final line, verbatim),
`ok`, `exitCode` (0/1, as the CLI), `counts` and `repaired`. `issues` is the
first `maxIssues` diagnostics, errors first; `full: true` adds every diagnostic,
the full report text and the repaired model. A ceiling exists because a model
with hundreds of diagnostics produces a report of hundreds of kilobytes, which
is more than an Action's response can carry.

## Wire it into ChatGPT (once)

1. ChatGPT → Explore GPTs → Create → Configure.
2. **Actions → Create new action → Import from URL**:
   `https://<your deployment>/openapi.json`. Authentication: none.
3. **Instructions** — paste:

   > You write and change AppWithAI EML models following
   > https://www.appwithai.org/llms-full.txt. Never try to download the checker
   > in your code sandbox — it has no network. After every version of the model,
   > call the `checkModel` action with the complete .mmd text and report its
   > `verdict` field verbatim with `counts` and `exitCode`. Fix every error it
   > lists and call it again until `exitCode` is 0. Never invent counts.

4. Save and share the GPT. Every check after that is automatic: no download,
   no attachment, nothing for the person using it to do.
