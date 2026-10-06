/**
 * The AppWithAI ChatGPT app's MCP server — and deliberately almost nothing else.
 *
 * ChatGPT discovers an app, and the panel it shows, through an MCP server. This
 * one registers the panel and answers questions about the engine. It has NO
 * tool that takes a model: no check_model(source), no fix_model(source). A tool
 * argument is sent to this server, so a tool that accepted a model would carry
 * the model to AppWithAI — the one thing the design forbids. Checking happens
 * in the panel, in the user's ChatGPT client, with code downloaded from
 * https://www.appwithai.org. scripts/check-plugin.mjs fails CI if a tool ever
 * declares an input.
 *
 * "Open with AppWithAI" for .mmd files is a file entrypoint, and it is OFF by
 * default. When ChatGPT opens a file with an app it calls that app's entrypoint
 * tool with `{ file: { name, resourceUri } }` — never the contents, but the
 * file's NAME does reach this server, and the privacy rule lists the file name
 * as something AppWithAI must not receive. So it is a deployment decision:
 * set FILE_ENTRYPOINT=1 to register it. This server ignores those arguments and
 * stores and logs nothing; the panel reads the contents from ChatGPT itself.
 *
 * Transport: MCP Streamable HTTP, JSON responses, no session state. Written as a
 * plain fetch(request) handler with no dependencies — Cloudflare Workers
 * (`export default { fetch }`), Deno Deploy, or Node via node-server.mjs.
 */
import { MANIFEST } from "../../plugin/manifest.js";
import { WIDGET_MAIN } from "../../plugin/widget-markup.js";

const ORIGIN = "https://www.appwithai.org";
const WIDGET_URI = "ui://widget/appwithai.html";

const WIDGET_HTML = `<link rel="stylesheet" href="${ORIGIN}/plugin/app.css">
${WIDGET_MAIN}
<script type="module" src="${ORIGIN}/plugin/app.js"></script>`;

const NO_INPUT = { type: "object", properties: {}, additionalProperties: false };

const OPEN_FILE_TOOL = {
  name: "open_mmd_file",
  title: "Open with AppWithAI",
  description: "Opens an .mmd file in the AppWithAI panel, which checks it on the user's device.",
  inputSchema: {
    type: "object",
    properties: {
      file: {
        type: "object",
        properties: { name: { type: "string" }, resourceUri: { type: "string" } },
        required: ["name", "resourceUri"],
        additionalProperties: false,
      },
    },
    required: ["file"],
    additionalProperties: false,
  },
  annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  _meta: {
    ui: { resourceUri: WIDGET_URI, visibility: ["app"] },
    "openai/outputTemplate": WIDGET_URI,
    "openai/ui": { entrypoints: [{ type: "file", extensions: [".mmd"] }] },
  },
};

const TOOLS = [
  {
    name: "open_appwithai",
    title: "Open the AppWithAI model checker",
    description:
      "Opens the AppWithAI panel, which checks and repairs an EML .mmd model inside the user's ChatGPT client. Never pass the model to this tool — it takes no input; the panel reads the file itself and nothing is sent to AppWithAI.",
    inputSchema: NO_INPUT,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
    _meta: {
      ui: { resourceUri: WIDGET_URI },
      "openai/outputTemplate": WIDGET_URI,
      "openai/ui": { entrypoints: [{ type: "global" }, { type: "thread" }] },
      "openai/toolInvocation/invoking": "Opening the AppWithAI checker…",
      "openai/toolInvocation/invoked": "AppWithAI checker ready",
    },
  },
  {
    name: "get_eml_engine",
    title: "AppWithAI EML engine version",
    description: "The EML language version and the SHA-256 of each published file the AppWithAI panel runs.",
    inputSchema: NO_INPUT,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  },
];

const RESOURCES = [
  {
    uri: WIDGET_URI,
    name: "AppWithAI model checker",
    mimeType: "text/html;profile=mcp-app",
    _meta: {
      // Static code comes from AppWithAI. The only allowed runtime connections are
      // to ChatGPT/OpenAI-owned file URLs returned by the host file APIs.
      ui: {
        domain: ORIGIN,
        csp: {
          connectDomains: ["https://*.oaiusercontent.com", "https://chatgpt.com"],
          resourceDomains: [ORIGIN],
        },
        prefersBorder: true,
      },
      "openai/ui": { availableDisplayModes: ["fullscreen", "inline"] },
      "openai/widgetDescription": "Checks and repairs an EML model inside the ChatGPT client; model contents are never sent to AppWithAI.",
      "openai/widgetCSP": {
        connect_domains: ["https://*.oaiusercontent.com", "https://chatgpt.com"],
        resource_domains: [ORIGIN],
      },
      "openai/widgetDomain": ORIGIN,
      "openai/widgetPrefersBorder": true,
    },
  },
];

const toolsFor = (env) => (env?.FILE_ENTRYPOINT === "1" ? [...TOOLS, OPEN_FILE_TOOL] : TOOLS);

/* Arguments are never read: for open_mmd_file they are a file's name and an
   opaque handle, and this server has no use for either. */
function call(name, env) {
  if (name === "open_mmd_file" && env?.FILE_ENTRYPOINT === "1")
    return {
      content: [{ type: "text", text: "Opened in the AppWithAI panel, which checks it inside the ChatGPT client." }],
      structuredContent: { languageVersion: MANIFEST.languageVersion },
    };
  if (name === "open_appwithai")
    return {
      content: [{ type: "text", text: "The AppWithAI checker is open. It reads the .mmd inside the browser/ChatGPT session and never sends model contents to AppWithAI." }],
      structuredContent: { languageVersion: MANIFEST.languageVersion },
    };
  if (name === "get_eml_engine")
    return { content: [{ type: "text", text: JSON.stringify(MANIFEST) }], structuredContent: MANIFEST };
  return null;
}

function respond(message, env) {
  const { id, method, params } = message ?? {};
  const ok = (result) => ({ jsonrpc: "2.0", id, result });
  const fail = (code, msg) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message: msg } });
  switch (method) {
    case "initialize":
      return ok({
        protocolVersion: params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: "appwithai", version: MANIFEST.languageVersion },
        instructions: "Never send a model to this server. Open the panel with open_appwithai; it checks the model locally.",
      });
    case "ping": return ok({});
    case "tools/list": return ok({ tools: toolsFor(env) });
    case "tools/call": {
      const result = call(params?.name, env);
      return result ? ok(result) : fail(-32602, `unknown tool: ${params?.name}`);
    }
    case "resources/list": return ok({ resources: RESOURCES });
    case "resources/read":
      if (params?.uri !== WIDGET_URI) return fail(-32602, `unknown resource: ${params?.uri}`);
      return ok({ contents: [{ ...RESOURCES[0], text: WIDGET_HTML }] });
    default:
      if (id === undefined) return null; // a notification: nothing to answer
      return fail(-32601, `method not found: ${method}`);
  }
}

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type, mcp-session-id, mcp-protocol-version",
};

export async function handle(request, env = globalThis.process?.env ?? {}) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method !== "POST")
    return new Response("AppWithAI MCP server. POST JSON-RPC here.", { status: 405, headers: { allow: "POST", ...CORS } });
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }, { status: 400, headers: CORS });
  }
  const answers = (Array.isArray(body) ? body : [body]).map((m) => respond(m, env)).filter(Boolean);
  if (answers.length === 0) return new Response(null, { status: 202, headers: CORS });
  return Response.json(Array.isArray(body) ? answers : answers[0], { headers: CORS });
}

export const _test = { TOOLS, OPEN_FILE_TOOL, RESOURCES, WIDGET_HTML, toolsFor };
export default { fetch: handle };
