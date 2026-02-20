#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Initialize the modern MCP Server
const server = new McpServer({
  name: "cloudflare-browser-rendering-mcp",
  version: "1.0.0",
});

// Register the tool using the current registerTool() API
server.registerTool(
  "render_markdown",
  {
    title: "Render Markdown",
    description: "Fetches a URL and renders it as markdown using the Cloudflare Browser Rendering API.",
    inputSchema: z.object({
      url: z.string().describe("The dynamic URL to render into markdown."),
    }),
  },
  async ({ url }) => {
    // Read secrets securely from environment variables
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return {
        content: [
          {
            type: "text",
            text:
              "Server Configuration Error: CLOUDFLARE_ACCOUNT_ID and " +
              "CLOUDFLARE_API_TOKEN environment variables must be set.",
          },
        ],
        isError: true,
      };
    }

    try {
      const apiUrl =
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/` +
        `browser-rendering/markdown`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          content: [
            {
              type: "text",
              text: `Cloudflare API Error: ${JSON.stringify(
                data.errors || data
              )}`,
            },
          ],
          isError: true,
        };
      }

      // Return the successful markdown result back to the model
      return {
        content: [
          {
            type: "text",
            text: data.result,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Network or Server Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server using stdio transport
async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Cloudflare Browser Rendering MCP server running on stdio");
}

run().catch((error) => {
  console.error("Fatal error starting server:", error);
  process.exit(1);
});
