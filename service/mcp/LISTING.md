# AppWithAI — ChatGPT app directory submission

Everything the OpenAI app submission asks for, in one place. Field names on
OpenAI's form may differ; the content is what matters.

## Identity

| Field | Value |
|---|---|
| Name | AppWithAI |
| MCP server URL | `https://mcp.appwithai.org` (or the `*.workers.dev` address until the custom domain is set) |
| Authentication | None |
| Website | https://www.appwithai.org |
| Privacy policy | https://www.appwithai.org/privacy.html#chatgpt-app |
| Icon | https://www.appwithai.org/favicon.svg |
| Category | Developer tools / Productivity |

## Short description (one line)

Check, repair and audit AppWithAI EML models in ChatGPT without sending model contents to AppWithAI.

## Long description

AppWithAI turns a business model, written as an EML `.mmd` file (Mermaid plus
`%%` directives), into a complete application. This app runs the official
AppWithAI checker, fixer and 22-point audit on your model inside ChatGPT:

- **Check** every line against EML 1.2.0, with the line, its text and the fix
  for each problem.
- **Repair** what can be repaired safely, and show the counts before and after.
- **Audit** the model against the 22-point checklist: keys, foreign keys, enum
  bindings, state machines, rules, hooks, access rules and help text.
- **Save** the repaired model back into your chat.

All model processing happens in the browser/ChatGPT client. The app's code comes
from www.appwithai.org; model contents are never sent to AppWithAI. Each result names
the exact engine that produced it: the EML version and the SHA-256 of every
file it ran.

## Example prompts

1. "Open AppWithAI and check my model." (with an `.mmd` attached)
2. "Check this .mmd with AppWithAI and fix whatever can be fixed safely."
3. "Use AppWithAI to audit my wealth-management model and tell me what fails."
4. "Which EML version does AppWithAI check against?"

## Notes for the reviewer

- **Tools.** `open_appwithai` opens the panel; `get_eml_engine` returns the EML
  version and file hashes. Both are read-only and take no input.
- **Data.** The app has no tool that accepts model contents. The cross-platform
  panel reads a user-authorized file through ChatGPT's file helpers
  (`selectFiles`, `getFileDownloadUrl`) or the browser's local file input,
  checks it client-side, and saves through `uploadFile` without requesting
  persistent ChatGPT Library storage. Its runtime CSP permits connections only
  to ChatGPT/OpenAI file hosts; model contents are never sent to AppWithAI.
- **Web/mobile.** Open AppWithAI from its global or thread entrypoint, then choose
  an existing ChatGPT file or a local `.mmd`. File-extension "Open with"
  integration is an optional desktop-only path.
- **To test.** Attach or choose any `.mmd`, for example
  https://www.appwithai.org/guide/models/crm.eml.mmd, which passes with
  `OK — 0 errors, 0 warnings (EML 1.2.0)` and `22 passed, 0 failed`. Or attach a
  broken file to see the problems list and the repair.
- **No account, no login, no payment.** Nothing is stored server-side.
