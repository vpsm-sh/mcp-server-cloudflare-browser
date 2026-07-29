---
name: cloudflare-extract
description: |
  Search the web, extract structured data, and pull links from any URL using AI or CSS selectors. Use when the user wants to search the web, find pages, extract specific data from a webpage, pull out a pricing table, get all links, extract product info as JSON, or says "search for", "find pages about", "extract", "get the links", "pull out the data from", or "get structured data from". Supports web search via DuckDuckGo, AI-powered JSON extraction with schema enforcement, and CSS selector-based element scraping.
disable-model-invocation: true
---

# cloudflare extract

Search the web, extract links, scrape elements by CSS selector, or use AI to pull structured JSON from any URL. Each tool uses a real headless browser, so JavaScript-rendered content is captured.

## When to use

- Need to find pages but don't have a URL yet (search)
- Need all links from a page (for crawling, site mapping, or validation)
- Know which CSS selectors you want (headings, prices, product cards)
- Want structured JSON from a page using a natural language prompt
- Need to enforce a specific output schema on extracted data

## search_web

Search the web using DuckDuckGo and return structured results (title, URL, snippet). No API key required — uses the headless browser to load DuckDuckGo's HTML endpoint.

```
search_web({ query: "react hooks tutorial" })
```

With a result limit:
```
search_web({ query: "cloudflare workers documentation", limit: 5 })
```

Returns JSON: `[{ title, url, snippet }]`. Pair with `render_markdown` to read a result page, or `start_crawl` to crawl a result site.

## extract_links

Get all links from a page, including hidden ones.

```
extract_links({ url: "https://example.com" })
```

Only visible links:
```
extract_links({
  url: "https://example.com",
  visibleLinksOnly: true
})
```

Only same-domain links:
```
extract_links({
  url: "https://example.com",
  excludeExternalLinks: true
})
```

Returns a JSON array of URLs.

## scrape_elements

Extract structured data from specific elements using CSS selectors. Returns text, HTML, attributes, and dimensions for each match.

```
scrape_elements({
  url: "https://example.com",
  elements: [
    { selector: "h1" },
    { selector: "a" },
    { selector: ".price" }
  ]
})
```

Response includes per-selector results with `text`, `html`, `attributes` (e.g., `href` for links), and `height`/`width`/`top`/`left` positioning.

## extract_json

Extract structured JSON from a page using AI. Provide a prompt and optionally a JSON schema to enforce output structure. Uses Workers AI (Llama 3.3 70B) by default.

### With a prompt only

```
extract_json({
  url: "https://developers.cloudflare.com/",
  prompt: "Get the list of AI products"
})
```

### With a prompt and JSON schema

```
extract_json({
  url: "https://developers.cloudflare.com/",
  prompt: "Get the list of AI products",
  response_format: {
    type: "json_schema",
    json_schema: {
      type: "object",
      properties: {
        products: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              link: { type: "string" }
            },
            required: ["name"]
          }
        }
      }
    }
  }
})
```

### With a custom AI model

Use a different model (e.g., Claude, GPT-4o) by providing credentials:

```
extract_json({
  url: "https://example.com",
  prompt: "Extract the product name, price, and description",
  response_format: { type: "json_schema", json_schema: { ... } },
  custom_ai: [{
    model: "anthropic/claude-sonnet-4-20250514",
    authorization: "Bearer <ANTHROPIC_API_KEY>"
  }]
})
```

List multiple models for automatic failover — the API tries them in order until one succeeds.

## Tips

- **`extract_json` with a schema is more reliable than prompt-only.** The schema enforces output structure, reducing null or malformed results.
- **Use `scrape_elements` when you know the CSS selectors.** It's deterministic and fast — no AI involved. Use `extract_json` when you don't know the page structure and need AI to find the data.
- **Use `extract_links` before crawling.** Get all links from a page, then use `start_crawl` with `includePatterns` to scope the crawl to relevant URLs.
- **For JS-heavy SPAs,** add `gotoOptions: { waitUntil: "networkidle0" }` to any tool to wait for JavaScript rendering.
- **Be specific in prompts.** "Extract the product name, price, and description from the main product section" works better than "get product info".
- **`response_format` is the JSON schema object.** Pass it as `{ type: "json_schema", json_schema: { ...your JSON schema... } }`.

## See also

- [cloudflare-browser](../cloudflare-browser/SKILL.md) — overview and escalation pattern
- [cloudflare-render](../cloudflare-render/SKILL.md) — render a single page as markdown, HTML, screenshot, or PDF
- [cloudflare-crawl](../cloudflare-crawl/SKILL.md) — bulk extract many pages from a site
