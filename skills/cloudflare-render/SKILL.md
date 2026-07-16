---
name: cloudflare-render
description: |
  Render any URL as markdown, HTML, screenshot, or PDF via a real headless browser. Use when the user provides a URL and wants its content, says "render this page", "fetch this URL", "take a screenshot", "generate a PDF", "get the HTML", or "read this webpage". Handles JavaScript-rendered SPAs and dynamic content.
---

# cloudflare render

Render pages as markdown, HTML, screenshots, PDFs, snapshots, or accessibility trees. Each tool calls the Cloudflare Browser Run API, which uses a real headless browser — JavaScript-rendered SPAs and dynamic content are captured.

## When to use

- You have a specific URL and want its content
- The page is a JS-rendered SPA or loads content dynamically
- You need a screenshot, PDF, or multi-format snapshot

## render_markdown

Fetch a URL and return clean markdown. Best for reading page content.

```
render_markdown({ url: "https://example.com" })
```

For JS-heavy SPAs, add `gotoOptions`:
```
render_markdown({
  url: "https://example.com",
  gotoOptions: { waitUntil: "networkidle0" }
})
```

Speed up text-only extraction by blocking images and stylesheets:
```
render_markdown({
  url: "https://example.com",
  rejectResourceTypes: ["image", "stylesheet", "font"]
})
```

Can also convert raw HTML:
```
render_markdown({ html: "<div>Hello World</div>" })
```

## render_content

Fetch a URL and return the fully rendered HTML after JavaScript execution. Use when you need the DOM structure, not readable text.

```
render_content({ url: "https://example.com" })
```

Inject custom JS or CSS before capture:
```
render_content({
  url: "https://example.com",
  addScriptTag: [{ content: "document.querySelector('h1').innerText = 'Modified'" }],
  addStyleTag: [{ content: "body { font-family: Arial; }" }]
})
```

## take_screenshot

Capture a screenshot of the rendered page. Returns a PNG image.

```
take_screenshot({ url: "https://example.com" })
```

Full-page screenshot with custom viewport:
```
take_screenshot({
  url: "https://example.com",
  screenshotOptions: { fullPage: true },
  viewport: { width: 1280, height: 720, deviceScaleFactor: 2 }
})
```

Screenshot a specific element:
```
take_screenshot({
  url: "https://example.com",
  selector: "#hero-section"
})
```

## render_pdf

Generate a PDF from a URL or HTML. Returns base64-encoded PDF data.

```
render_pdf({ url: "https://example.com" })
```

With headers, footers, and page size:
```
render_pdf({
  url: "https://example.com",
  pdfOptions: {
    format: "a4",
    displayHeaderFooter: true,
    headerTemplate: "<div style='text-align:center;font-size:10px;'>Company Name</div>",
    footerTemplate: "<div style='text-align:center;font-size:10px;'>Page <span class='pageNumber'></span></div>",
    margin: { top: "70px", bottom: "70px" }
  }
})
```

## take_snapshot

Capture multiple formats in one call: HTML, screenshot, markdown, and/or accessibility tree. Must request at least two formats.

```
take_snapshot({
  url: "https://example.com",
  formats: ["screenshot", "markdown", "accessibilityTree"]
})
```

Default formats are `["content", "screenshot"]` (HTML + screenshot).

## get_accessibility_tree

Capture the accessibility tree — roles, names, states, and hierarchy of page elements. Useful for AI agents that need to understand page structure for automation.

```
get_accessibility_tree({ url: "https://example.com" })
```

Limit to a subtree with a CSS selector:
```
get_accessibility_tree({
  url: "https://example.com",
  root: "nav",
  interestingOnly: true
})
```

## Tips

- **Use `gotoOptions.waitUntil: "networkidle0"` for SPAs.** The browser considers a page loaded before JS finishes rendering. `networkidle0` waits until no network activity for 500ms.
- **Use `waitForSelector` for faster SPA rendering.** If you know which element indicates content is loaded, waiting for that selector is faster than waiting for all network activity to stop.
- **Block resources for speed.** `rejectResourceTypes: ["image", "stylesheet", "font"]` speeds up text extraction significantly.
- **Always quote URLs** when writing them in code — `?` and `&` are special characters.
- **Multiple URLs:** Call the tool N times. There is no batch mode — each call is independent.

## See also

- [cloudflare-browser](../cloudflare-browser/SKILL.md) — overview and escalation pattern
- [cloudflare-crawl](../cloudflare-crawl/SKILL.md) — bulk extract many pages from a site
- [cloudflare-extract](../cloudflare-extract/SKILL.md) — links, CSS selectors, AI-powered JSON extraction
