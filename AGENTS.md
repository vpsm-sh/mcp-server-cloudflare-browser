# AGENTS.md — Cloudflare Browser Rendering MCP Server

Guidance for agentic coding assistants working in this repository.

---

## Project Overview

A Model Context Protocol (MCP) server that exposes a single tool — `render_markdown` — which
fetches a URL and renders it as Markdown via the Cloudflare Browser Rendering API. The server
runs over stdio and is intended to be invoked by MCP-compatible clients (e.g., Claude Desktop,
OpenCode).

**Stack:** TypeScript 5 · Node.js 18+ · ESM · `@modelcontextprotocol/sdk` · Zod

**npm package:** `@vpsm-sh/mcp-server-cloudflare-browser`
**Repository:** https://github.com/vpsm/mcp-server-cloudflare-browser

---

## Build & Run Commands

```bash
# Install dependencies
npm install

# Compile TypeScript → dist/
npm run build

# Run the compiled server
npm start
# equivalent: node dist/index.js

# Test interactively with the MCP Inspector
npm run inspector
```

The `dist/` directory is **gitignored** — always rebuild after editing `src/`. CI builds
from source on every push.

There is **no watch mode, no dev server, no bundler**. Build is raw `tsc` only.
The build script also runs `chmod +x dist/index.js` to mark the entry point executable,
which is required for `npx` and global installs on Unix.

---

## Tests & Linting

**There are currently no tests and no linter/formatter configured.**

When adding tests, prefer **Vitest** (compatible with ESM and NodeNext module resolution
without additional transforms). Add a `test` script to `package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

To run a single test file:
```bash
npx vitest run src/__tests__/myTool.test.ts
```

No ESLint or Prettier config exists. If adding them, use flat config (`eslint.config.js`)
and target ES2022 / NodeNext. Until a formatter is configured, match the existing style
manually (see Style section below).

---

## Environment Variables

The server requires two env vars at runtime (read inside each tool handler — not at startup):

| Variable | Purpose |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account identifier |
| `CLOUDFLARE_API_TOKEN` | Bearer token with Browser Rendering permission |

These must be injected by the MCP client's configuration — not stored in the repository.

---

## Architecture

The server is split across four source files, each registering related tools:

- **`src/index.ts`** — server setup, imports all tool registration functions, starts stdio transport.
- **`src/utils.ts`** — shared helpers (`getCredentials`, `callBrowserRun`, `callBrowserRunBinary`, `callBrowserRunGet`, `withCredentials`, `errorResult`, `textResult`, `imageResult`) and reusable Zod schemas (`commonParams`, `gotoOptionsSchema`, `viewportSchema`, etc.).
  `callBrowserRun` implements the local `waitUntil: 'auto'` strategy: try `domcontentloaded`
  first, retry with `networkidle0` if the visible text is under `autoMinTextLength` chars.
  `'auto'` is never sent to the Cloudflare API — binary endpoints (screenshot/PDF) and
  `snapshot` resolve it to `networkidle0` since visuals need a full page load.
- **`src/tools/render.ts`** — `render_markdown`, `render_content`, `take_screenshot`, `render_pdf`, `take_snapshot`, `get_accessibility_tree`.
- **`src/tools/extract.ts`** — `extract_links`, `scrape_elements`, `extract_json`.
- **`src/tools/crawl.ts`** — `start_crawl`, `get_crawl_status`.

Each tool file exports a `register<Name>Tools(server)` function called from `index.ts`.

**Entry point flow:**
1. `src/index.ts` opens with a `#!/usr/bin/env node` shebang — required for `npx` execution.
2. Instantiate `McpServer` with name/version metadata.
3. Call each `register*Tools(server)` function to register all tools.
4. `run()` creates a `StdioServerTransport`, connects the server, logs to stderr.
5. `run().catch(...)` exits with code 1 on fatal failure.

---

## Code Style

### Modules & Imports

- The project is **ESM** (`"type": "module"` in `package.json`).
- `moduleResolution` is `NodeNext` — **all relative imports must include the `.js` extension**,
  even when the source file is `.ts`:
  ```ts
  import { helper } from "./utils.js"; // correct
  import { helper } from "./utils";    // wrong — will not resolve at runtime
  ```
- Third-party imports use bare specifiers with the package's own extension convention:
  ```ts
  import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
  import { z } from "zod";
  ```
- Group imports: SDK/framework first, then third-party, then local. No blank lines between
  groups in small files — keep it flat if there are fewer than ~10 imports total.

### Naming

| Construct | Convention |
|---|---|
| Variables, functions, parameters | `camelCase` |
| Classes, type aliases, interfaces | `PascalCase` |
| Constants (module-level) | `camelCase` (not `SCREAMING_SNAKE`) |
| MCP tool names | `snake_case` strings (e.g., `"render_markdown"`) |
| Environment variable names | `SCREAMING_SNAKE_CASE` |

### TypeScript

- `strict: true` is enabled — do not disable any strict checks.
- Use Zod schemas as the primary validation and type layer. Derive TypeScript types from
  schemas with `z.infer<typeof MySchema>` rather than defining parallel interfaces.
- Provide explicit return types on exported functions. Handler callbacks may use inferred
  types since the SDK provides them.
- Avoid `any` except in `catch (error: any)` blocks where the MCP error pattern requires it.
  Prefer `unknown` with a type guard when possible.
- Do not use `// @ts-ignore` or `// @ts-expect-error` without a comment explaining why.

### Tool Handlers

Every `server.registerTool()` handler must:

1. **Validate env vars first**, before any network I/O. Return `isError: true` immediately
   if they are absent.
2. **Wrap all network calls in try/catch.** Never let an unhandled exception propagate out
   of a tool handler.
3. **Return structured errors**, never throw:
   ```ts
   return {
     content: [{ type: "text", text: "Error: <message>" }],
     isError: true,
   };
   ```
4. **Return structured success**:
   ```ts
   return {
     content: [{ type: "text", text: data.result }],
   };
   ```

### Error Handling Hierarchy

```
1. Missing config  →  return isError (before any I/O)
2. API-level error →  check !response.ok || !data.success → return isError
3. Network/thrown  →  catch (error: any) → return isError with error.message
4. Fatal startup   →  run().catch(...) → console.error + process.exit(1)
```

### Logging

- **`console.error`** — the only permitted logging channel. Stdout is the MCP wire protocol;
  any `console.log` call will corrupt the stdio transport.
- Log operational messages (server started, fatal errors) with `console.error`.
- Do not add verbose per-request logging unless behind an env flag (e.g., `DEBUG=1`).

### Formatting

No auto-formatter is configured. Follow these conventions manually:

- 2-space indentation.
- Single quotes for strings in TypeScript source. Double quotes in JSON.
- Trailing commas in multi-line objects and arrays.
- Long string concatenation: split across lines with `+` at the start of continuation lines,
  or use a template literal if interpolation is needed.
- `async/await` over raw Promises everywhere except the top-level `run().catch(...)` pattern.

---

## Adding a New Tool

1. Call `server.registerTool()` in `src/index.ts` (or in a `src/tools/<name>.ts` module if the file
   gets long).
2. Define the input schema using `z.object({...})` passed as `inputSchema` in the config object.
3. Follow the env-check → try/catch → structured return pattern shown above.
4. Rebuild: `npm run build`.
5. Test manually by running the server and sending a JSON-RPC call over stdin, or by
   integrating with an MCP client.

---

## Key Dependencies

| Package | Role |
|---|---|
| `@modelcontextprotocol/sdk` | MCP server primitives (`McpServer`, `StdioServerTransport`) |
| `zod` | Runtime schema validation and TypeScript type inference |
| `typescript` | Compiler (dev) |
| `@types/node` | Node.js type definitions (dev) |

Do not add runtime dependencies without a clear reason. This server has no framework,
no ORM, and no bundler by design. Prefer the built-in `fetch` (Node 22) over `axios`/`node-fetch`.
