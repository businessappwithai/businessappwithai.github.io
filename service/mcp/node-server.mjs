#!/usr/bin/env node
// The same MCP server on plain Node 18+:  PORT=8787 node service/mcp/node-server.mjs
import { createServer } from "node:http";
import { handle } from "./server.js";

const port = Number(process.env.PORT ?? 8787);
createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(chunks);
  const response = await handle(new Request(`http://${req.headers.host ?? "localhost"}${req.url}`, { method: req.method, headers: req.headers, body }));
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`AppWithAI MCP server on :${port}`));
