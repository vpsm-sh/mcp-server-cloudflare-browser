# mcp-server-cloudflare-browser

[![npm version](https://img.shields.io/npm/v/@vpsm-sh/mcp-server-cloudflare-browser)](https://www.npmjs.com/package/@vpsm-sh/mcp-server-cloudflare-browser)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/node/v/@vpsm-sh/mcp-server-cloudflare-browser)](https://nodejs.org)
[![CI](https://github.com/vpsm/mcp-server-cloudflare-browser/actions/workflows/ci.yml/badge.svg)](https://github.com/vpsm/mcp-server-cloudflare-browser/actions/workflows/ci.yml)

An [MCP](https://modelcontextprotocol.io) server that fetches any URL and returns it as clean Markdown, powered by the [Cloudflare Browser Rendering API](https://developers.cloudflare.com/browser-rendering/). Useful for giving LLMs access to live web content without the noise of raw HTML.

## Features

Eleven tools covering the full Cloudflare Browser Run Quick Actions API:

| Tool | Description |
|---|---|
| `render_markdown` | URL → clean Markdown (JS-rendered) |
| `render_content` | URL → fully rendered HTML after JS execution |
| `take_screenshot` | URL → PNG screenshot |
| `render_pdf` | URL or HTML → PDF (base64) |
| `take_snapshot` | URL → multiple formats in one call (HTML + screenshot + markdown + a11y tree) |
| `get_accessibility_tree` | URL → accessibility tree (roles, names, states) |
| `extract_links` | URL → all links on the page |
| `scrape_elements` | URL + CSS selectors → structured element data |
| `extract_json` | URL + prompt/schema → AI-powered structured JSON |
| `start_crawl` | URL → async crawl job (follow links, up to N pages) |
| `get_crawl_status` | Poll crawl job status and retrieve results |

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
| `url` | `string` | One of | The URL to fetch and render |
| `html` | `string` | One of | Raw HTML to convert to Markdown |
| `gotoOptions` | `object` | No | Control page load behavior (`waitUntil`, `timeout`) |
| `rejectResourceTypes` | `string[]` | No | Block resource types (e.g., `["image", "stylesheet"]`) |

**Example:** _"Fetch https://developers.cloudflare.com/browser-rendering/ and summarize it."_

### `render_content`

Fetches a URL and returns the fully rendered HTML after JavaScript execution.

### `take_screenshot`

Captures a screenshot of a fully rendered webpage. Returns a PNG image.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` or `html` | `string` | Yes | URL to screenshot or HTML to render |
| `screenshotOptions` | `object` | No | `fullPage`, `omitBackground`, `type`, `quality` |
| `selector` | `string` | No | CSS selector to screenshot a specific element |
| `viewport` | `object` | No | `width`, `height`, `deviceScaleFactor` |

### `render_pdf`

Generates a PDF from a webpage or custom HTML. Returns base64-encoded PDF data.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` or `html` | `string` | Yes | URL or HTML to convert to PDF |
| `pdfOptions` | `object` | No | `format`, `landscape`, `printBackground`, `displayHeaderFooter`, `headerTemplate`, `footerTemplate`, `margin`, `scale` |

### `take_snapshot`

Captures multiple formats in a single request: HTML, screenshot, Markdown, and/or accessibility tree.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` or `html` | `string` | Yes | URL or HTML to snapshot |
| `formats` | `string[]` | No | At least two of: `content`, `screenshot`, `markdown`, `accessibilityTree` |

### `get_accessibility_tree`

Captures the accessibility tree of a webpage after JavaScript execution.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` or `html` | `string` | Yes | URL or HTML |
| `interestingOnly` | `boolean` | No | Only semantically meaningful nodes (default: true) |
| `root` | `string` | No | CSS selector to anchor to a subtree |

### `extract_links`

Extracts all links from a webpage, including hidden ones.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` or `html` | `string` | Yes | URL or HTML |
| `visibleLinksOnly` | `boolean` | No | Only return visible links (default: false) |
| `excludeExternalLinks` | `boolean` | No | Exclude external domain links (default: false) |

### `scrape_elements`

Extracts structured data from specific elements using CSS selectors.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` or `html` | `string` | Yes | URL or HTML |
| `elements` | `object[]` | Yes | Array of `{ selector: string }` |

### `extract_json`

Extracts structured JSON data from a webpage using AI.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` or `html` | `string` | Yes | URL or HTML |
| `prompt` | `string` | No | Natural language prompt describing what to extract |
| `response_format` | `object` | No | JSON schema for structured output |
| `custom_ai` | `object[]` | No | Custom AI models with fallback support |

### `start_crawl`

Initiates an async crawl job that follows links across a site.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `url` | `string` | Yes | Starting URL |
| `limit` | `number` | No | Max pages (default: 10, max: 100000) |
| `depth` | `number` | No | Max link depth |
| `formats` | `string[]` | No | `html`, `markdown`, or `json` (default: html) |
| `render` | `boolean` | No | Use headless browser (default: true) |
| `includePatterns` | `string[]` | No | Wildcard patterns to include |
| `excludePatterns` | `string[]` | No | Wildcard patterns to exclude |

### `get_crawl_status`

Checks status or retrieves results of an async crawl job.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `jobId` | `string` | Yes | Crawl job ID from `start_crawl` |
| `status` | `string` | No | Filter records by status |
| `cursor` | `string` | No | Pagination cursor |
| `limit` | `number` | No | Max records (use 1 for status checks) |

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
