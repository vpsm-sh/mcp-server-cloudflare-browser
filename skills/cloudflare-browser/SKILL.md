---
name: cloudflare-browser
description: |
  Render, crawl, and extract data from any URL using a real headless browser via Cloudflare Browser Run. Use when the user wants web content rendered, a site crawled, structured data extracted from a page, a screenshot taken, or a PDF generated. Handles JavaScript-rendered SPAs and dynamic content. Triggers on "render this page", "fetch this URL", "get the content of", "crawl this site", "extract data from", "take a screenshot", "generate a PDF", or "read this webpage".
---

# Cloudflare Browser Run

Render, crawl, and extract data from any URL using a real headless browser. Handles JavaScript-rendered SPAs and dynamic content. All tools use the Cloudflare Browser Rendering API behind a single MCP server.

## Prerequisites

Requires two environment variables configured by the MCP client:

- `CLOUDFLARE_ACCOUNT_ID` — Cloudflare account identifier
- `CLOUDFLARE_API_TOKEN` — API token with Browser Rendering permission

If either is missing, every tool returns a configuration error. Tell the user to set them.

## Workflow

Follow this escalation pattern:

| Need | Tool | When |
|---|---|---|
| Find pages on a topic | `search_web` | No specific URL yet — get URLs first |
| Page content as text | `render_markdown` | Have a URL, want readable text |
| Page content as HTML | `render_content` | Need the full DOM after JS execution |
| All links on a page | `extract_links` | Discovering URLs for crawling or site mapping |
| Specific elements by CSS selector | `scrape_elements` | Know which selectors you want (headings, prices, links) |
| Structured data via AI | `extract_json` | Want JSON output with a prompt and optional schema |
| Bulk content from a site section | `start_crawl` + `get_crawl_status` | Need many pages (e.g., all /docs/) |
| Visual capture | `take_screenshot` | Need an image of the rendered page |
| PDF generation | `render_pdf` | Need a downloadable PDF from a URL or HTML |
| Multiple formats at once | `take_snapshot` | Want HTML + screenshot + markdown in one call |
| Page structure for automation | `get_accessibility_tree` | AI agent needs to understand interactive elements |

**Escalation:** `search_web` to find URLs → `render_markdown` to read one page → `start_crawl` to get many pages → `extract_json` to pull structured data.

## Common parameters

Most tools accept these optional parameters:

- `gotoOptions.waitUntil` — Set to `"networkidle0"` for JS-heavy SPAs that render content after load
- `waitForSelector` — Wait for a specific CSS selector before capturing (faster than networkidle for known elements)
- `rejectResourceTypes` — Block `["image", "stylesheet", "font"]` to speed up text-only extraction
- `cookies` — Session cookies for authenticated pages
- `authenticate` — HTTP Basic Auth credentials
- `userAgent` — Custom User-Agent string

## See also

- [cloudflare-render](../cloudflare-render/SKILL.md) — markdown, HTML, screenshots, PDFs, snapshots, accessibility trees
- [cloudflare-crawl](../cloudflare-crawl/SKILL.md) — async site crawling with job polling
- [cloudflare-extract](../cloudflare-extract/SKILL.md) — search, links, CSS selector scraping, AI-powered JSON extraction
