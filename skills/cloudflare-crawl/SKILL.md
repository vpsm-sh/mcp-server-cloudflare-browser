---
name: cloudflare-crawl
description: |
  Crawl a website and extract content from multiple pages following links. Use when the user wants to crawl a site, bulk extract pages, build a knowledge base from a docs section, or says "crawl", "get all pages", "extract everything under /docs", or "scrape the whole site". Returns markdown, HTML, or JSON for each page. Handles JavaScript-rendered SPAs.
---

# cloudflare crawl

Crawl a website starting from a URL, following links across the site up to a configurable depth or page limit. Crawl jobs run asynchronously — you start a job, then poll for results.

## When to use

- Need content from many pages on the same site (e.g., all /docs/ pages)
- Building a knowledge base or RAG dataset from a docs section
- Bulk extraction where calling `render_markdown` page-by-page is too slow

## Quick start

### 1. Start a crawl

```
start_crawl({
  url: "https://example.com/docs/",
  limit: 50,
  formats: ["markdown"]
})
```

Returns a job ID. The job runs asynchronously — you poll for results.

### 2. Poll for status

```
get_crawl_status({
  jobId: "<job-id-from-step-1>",
  limit: 1
})
```

Use `limit: 1` for lightweight status checks — you only need the `status` field, not all records. Poll every 5-10 seconds. The job is done when `status` is `"completed"`, `"cancelled_due_to_timeout"`, `"cancelled_due_to_limits"`, or `"errored"`.

### 3. Fetch results

Once status is `"completed"`, fetch full results:

```
get_crawl_status({
  jobId: "<job-id>"
})
```

The response includes a `records` array, each with `url`, `status`, `markdown` (or `html`), and `metadata`.

## Parameters

### start_crawl

| Parameter | Description |
|---|---|
| `url` | Starting URL to crawl (required) |
| `limit` | Max pages to crawl. Default: 10. Max: 100000 |
| `depth` | Max link depth from starting URL. Default: 100000 |
| `formats` | Response format per page: `["html"]`, `["markdown"]`, or `["json"]`. Default: `["html"]` |
| `render` | `true` (default) uses headless browser for JS. `false` does fast HTML fetch without JS |
| `source` | URL discovery: `"all"` (sitemaps + links), `"sitemaps"`, or `"links"`. Default: `"all"` |
| `includePatterns` | Only visit URLs matching these wildcard patterns. Use `*` for path segments, `**` for any chars |
| `excludePatterns` | Skip URLs matching these patterns. Higher priority than includePatterns |
| `includeExternalLinks` | Follow links to external domains. Default: false |
| `includeSubdomains` | Follow links to subdomains. Default: false |
| `crawlPurposes` | Declared use: `["search", "ai-input", "ai-train"]`. Narrow if site's robots.txt disallows some uses |
| `maxAge` | Max cache age in seconds. Default: 86400 (1 day) |
| `modifiedSince` | Unix timestamp (seconds). Only crawl pages modified since this time |

### get_crawl_status

| Parameter | Description |
|---|---|
| `jobId` | Crawl job ID from `start_crawl` (required) |
| `status` | Filter records: `queued`, `completed`, `disallowed`, `skipped`, `errored`, `cancelled` |
| `cursor` | Pagination cursor from a previous response |
| `limit` | Max records to return. Use `1` for status-only checks |

## Tips

- **Use `render: false` for static sites.** If content is in the initial HTML (no JS rendering needed), `render: false` is much faster and doesn't consume browser time.
- **Use `includePatterns` to scope crawls.** Crawl only docs: `includePatterns: ["https://example.com/docs/**"]`. Exclude changelogs: `excludePatterns: ["https://example.com/docs/changelog/**"]`.
- **Respects robots.txt.** The crawler respects `robots.txt` directives including `crawl-delay`. Blocked URLs appear with `"status": "disallowed"`. The crawler does not bypass CAPTCHAs or bot protection.
- **Content Signals:** Sites can declare allowed uses via `robots.txt` Content-Signal directives. If a site sets `ai-train=no` and your `crawlPurposes` includes `"ai-train"`, the crawl is rejected with 400. Narrow `crawlPurposes` to only what you need.
- **Pagination:** If the response exceeds 10 MB, a `cursor` value is included. Pass it as the `cursor` parameter to get the next page of results.
- **View errored pages:** Filter with `status: "errored"` to see which URLs returned HTTP errors (403, 500, etc.).
- **Free plan limits:** Workers Free plan is capped at 10 minutes of browser use per day. Use `render: false` to avoid consuming browser time.

## See also

- [cloudflare-browser](../cloudflare-browser/SKILL.md) — overview and escalation pattern
- [cloudflare-render](../cloudflare-render/SKILL.md) — render a single page as markdown, HTML, screenshot, or PDF
- [cloudflare-extract](../cloudflare-extract/SKILL.md) — extract links, elements, or structured JSON from a single page
