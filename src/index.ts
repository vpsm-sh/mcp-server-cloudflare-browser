#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerRenderTools } from './tools/render.js';
import { registerExtractTools } from './tools/extract.js';
import { registerCrawlTools } from './tools/crawl.js';
import { registerSearchTools } from './tools/search.js';

const server = new McpServer({
  name: 'cloudflare-browser-rendering-mcp',
  version: '1.1.0',
});

registerRenderTools(server);
registerExtractTools(server);
registerCrawlTools(server);
registerSearchTools(server);

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Cloudflare Browser Rendering MCP server running on stdio');
}

run().catch((error) => {
  console.error('Fatal error starting server:', error);
  process.exit(1);
});
