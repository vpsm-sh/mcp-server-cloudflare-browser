# mcp-server-cloudflare-browser

[![npm version](https://img.shields.io/npm/v/@vpsm-sh/mcp-server-cloudflare-browser)](https://www.npmjs.com/package/@vpsm-sh/mcp-server-cloudflare-browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/node/v/@vpsm-sh/mcp-server-cloudflare-browser)](https://nodejs.org)
[![CI](https://github.com/vpsm/mcp-server-cloudflare-browser/actions/workflows/ci.yml/badge.svg)](https://github.com/vpsm/mcp-server-cloudflare-browser/actions/workflows/ci.yml)

An [MCP](https://modelcontextprotocol.io) server that fetches any URL and returns it as clean Markdown, powered by the [Cloudflare Browser Rendering API](https://developers.cloudflare.com/browser-rendering/). Useful for giving LLMs access to live web content without the noise of raw HTML.

## Features

- **`render_markdown`** — fetches a URL using a real headless browser and returns the page as Markdown

## Requirements

- Node.js 18+
- A Cloudflare account with [Browser Rendering](https://developers.cloudflare.com/browser-rendering/) enabled
- A Cloudflare API token with **Workers AI** or **Browser Rendering** permission

## Quick Start

No installation needed. Run directly with `npx`:

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id \
CLOUDFLARE_API_TOKEN=your-api-token \
npx -y @vpsm-sh/mcp-server-cloudflare-browser
```

## Configuration

| Variable | Required | Description |
|---|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Yes | Your Cloudflare account ID (found in the dashboard sidebar) |
| `CLOUDFLARE_API_TOKEN` | Yes | API token with Browser Rendering read permission |

To create an API token: Cloudflare Dashboard → My Profile → API Tokens → Create Token → use the **Read all resources** template or create a custom token with Browser Rendering access.

## Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cloudflare-browser": {
      "command": "npx",
      "args": ["-y", "@vpsm-sh/mcp-server-cloudflare-browser@latest"],
      "env": {
        "CLOUDFLARE_ACCOUNT_ID": "your-account-id",
        "CLOUDFLARE_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

**Config file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

## Usage with VS Code

Add this to your `.vscode/mcp.json` (or user-level `settings.json` under `"mcp.servers"`):

```json
{
  "servers": {
    "cloudflare-browser": {
      "command": "npx",
      "args": ["-y", "@vpsm-sh/mcp-server-cloudflare-browser@latest"],
      "env": {
        "CLOUDFLARE_ACCOUNT_ID": "${input:cloudflareAccountId}",
        "CLOUDFLARE_API_TOKEN": "${input:cloudflareApiToken}"
      }
    }
  }
}
```

VS Code will prompt for the values on first connect.

## Usage with OpenCode

Add to your `~/.config/opencode/config.json`:

```json
{
  "mcp": {
    "cloudflare-browser": {
      "type": "local",
      "command": ["npx", "-y", "@vpsm-sh/mcp-server-cloudflare-browser@latest"],
      "env": {
        "CLOUDFLARE_ACCOUNT_ID": "your-account-id",
        "CLOUDFLARE_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Available Tools

### `render_markdown`

Fetches a URL using a headless browser and returns the rendered page as Markdown.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` | `string` | Yes | The URL to fetch and render |

**Example prompt:** _"Fetch https://developers.cloudflare.com/browser-rendering/ and summarize it."_

The tool handles JavaScript-rendered pages — it uses a real browser, not a simple HTTP fetch, so dynamic content is captured.

## Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run the server
npm start

# Test interactively with the MCP Inspector
npm run inspector
```

After editing `src/index.ts`, always run `npm run build` before testing.

### Testing with MCP Inspector

```bash
npm run inspector
```

This opens a web UI where you can call `render_markdown` manually and inspect requests/responses.

### Adding Tools

See [AGENTS.md](AGENTS.md) for the full code style guide and tool-handler contract.

## License

[MIT](LICENSE) — Copyright (c) 2026 Nathan Beddoe
