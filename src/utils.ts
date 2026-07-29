import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const API_BASE = 'https://api.cloudflare.com/client/v4/accounts';

export type ContentItem =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string };

export type ToolResult = {
  content: ContentItem[];
  isError?: boolean;
};

export function getCredentials(): { accountId: string; apiToken: string } | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

export function errorResult(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

export function textResult(text: string): ToolResult {
  return {
    content: [{ type: 'text', text }],
  };
}

export function imageResult(data: string, mimeType: string): ToolResult {
  return {
    content: [{ type: 'image', data, mimeType }],
  };
}

function withDefaultGotoOptions(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...body };
  const existing = result.gotoOptions as Record<string, unknown> | undefined;

  if (!existing) {
    result.gotoOptions = { waitUntil: 'networkidle0', timeout: 30000 };
  } else {
    result.gotoOptions = {
      ...existing,
      waitUntil: existing.waitUntil ?? 'networkidle0',
      timeout: existing.timeout ?? 30000,
    };
  }

  return result;
}

const autoMinTextLength = 500;

function resolveWaitUntil(
  body: Record<string, unknown>,
  waitUntil: string,
): Record<string, unknown> {
  const existing = (body.gotoOptions as Record<string, unknown> | undefined) ?? {};
  return { ...body, gotoOptions: { ...existing, waitUntil } };
}

function visibleTextLength(result: unknown): number {
  const raw = typeof result === 'string' ? result : JSON.stringify(result) ?? '';
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

async function callBrowserRunOnce(
  accountId: string,
  apiToken: string,
  endpoint: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const apiUrl = `${API_BASE}/${accountId}/browser-rendering/${endpoint}`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(withDefaultGotoOptions(body)),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(`Cloudflare API Error: ${JSON.stringify(data.errors || data)}`);
  }

  return data.result;
}

export async function callBrowserRun(
  accountId: string,
  apiToken: string,
  endpoint: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const gotoOptions = body.gotoOptions as Record<string, unknown> | undefined;

  if (gotoOptions?.waitUntil !== 'auto') {
    return callBrowserRunOnce(accountId, apiToken, endpoint, body);
  }

  // 'auto' is a local strategy, not a Cloudflare API value. The snapshot
  // endpoint captures visuals, which need a full page load regardless.
  if (endpoint === 'snapshot') {
    return callBrowserRunOnce(
      accountId,
      apiToken,
      endpoint,
      resolveWaitUntil(body, 'networkidle0'),
    );
  }

  const result = await callBrowserRunOnce(
    accountId,
    apiToken,
    endpoint,
    resolveWaitUntil(body, 'domcontentloaded'),
  );

  if (visibleTextLength(result) >= autoMinTextLength) {
    return result;
  }

  console.error(
    `waitUntil=auto: '${endpoint}' returned little content at domcontentloaded; ` +
      'retrying with networkidle0',
  );
  return callBrowserRunOnce(
    accountId,
    apiToken,
    endpoint,
    resolveWaitUntil(body, 'networkidle0'),
  );
}

export async function callBrowserRunGet(
  accountId: string,
  apiToken: string,
  endpoint: string,
): Promise<unknown> {
  const apiUrl = `${API_BASE}/${accountId}/browser-rendering/${endpoint}`;

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(`Cloudflare API Error: ${JSON.stringify(data.errors || data)}`);
  }

  return data.result;
}

export async function callBrowserRunBinary(
  accountId: string,
  apiToken: string,
  endpoint: string,
  body: Record<string, unknown>,
): Promise<Buffer> {
  const apiUrl = `${API_BASE}/${accountId}/browser-rendering/${endpoint}`;

  // 'auto' is a local strategy; screenshots and PDFs always need a full load.
  const resolvedBody =
    (body.gotoOptions as Record<string, unknown> | undefined)?.waitUntil === 'auto'
      ? resolveWaitUntil(body, 'networkidle0')
      : body;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(withDefaultGotoOptions(resolvedBody)),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `HTTP ${response.status}`,
    }));
    throw new Error(`Cloudflare API Error: ${JSON.stringify(errorData)}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function withCredentials<T extends Record<string, unknown>>(
  handler: (
    creds: { accountId: string; apiToken: string },
    args: T,
  ) => Promise<ToolResult>,
) {
  return async (args: T): Promise<ToolResult> => {
    const creds = getCredentials();
    if (!creds) {
      return errorResult(
        'Server Configuration Error: CLOUDFLARE_ACCOUNT_ID and ' +
          'CLOUDFLARE_API_TOKEN environment variables must be set.',
      );
    }
    try {
      return await handler(creds, args);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return errorResult(`Network or Server Error: ${message}`);
    }
  };
}

const gotoOptionsSchema = z
  .object({
    waitUntil: z
      .enum(['auto', 'load', 'domcontentloaded', 'networkidle0', 'networkidle2'])
      .optional()
      .describe(
        "When to consider navigation successful. Use 'networkidle0' for JS-heavy SPAs. " +
          "Use 'auto' to try 'domcontentloaded' first and automatically retry with " +
          "'networkidle0' when the page returns little content — faster on server-rendered pages.",
      ),
    timeout: z.number().optional().describe('Max navigation timeout in milliseconds.'),
  })
  .optional()
  .describe('Control page load behavior. Use for JS-heavy pages.');

const waitForSelectorSchema = z
  .object({
    selector: z.string().describe('CSS selector to wait for.'),
    timeout: z.number().optional().describe('Max wait time in milliseconds.'),
    visible: z.boolean().optional().describe('Wait for element to be visible.'),
  })
  .optional()
  .describe('Wait for a CSS selector to appear before capturing.');

const viewportSchema = z
  .object({
    width: z.number().describe('Viewport width in pixels.'),
    height: z.number().describe('Viewport height in pixels.'),
    deviceScaleFactor: z
      .number()
      .optional()
      .describe('Device scale factor. Increase for sharper screenshots.'),
  })
  .optional()
  .describe('Browser viewport dimensions.');

const cookiesSchema = z
  .array(
    z.object({
      name: z.string(),
      value: z.string(),
      domain: z.string().optional(),
      path: z.string().optional(),
    }),
  )
  .optional()
  .describe('Cookies to set before navigation.');

const authenticateSchema = z
  .object({
    username: z.string(),
    password: z.string(),
  })
  .optional()
  .describe('HTTP Basic Authentication credentials.');

const rejectResourceTypesSchema = z
  .array(z.string())
  .optional()
  .describe(
    "Block these resource types from loading (e.g., 'image', 'stylesheet', 'font') to speed up rendering.",
  );

const userAgentSchema = z
  .string()
  .optional()
  .describe('Custom User-Agent string.');

export const commonParams = {
  url: z
    .string()
    .optional()
    .describe(
      'REQUIRED: The URL to fetch and render. You must provide this unless you pass html instead.',
    ),
  html: z
    .string()
    .optional()
    .describe(
      'Raw HTML content to process. Provide this OR url — one of the two is required.',
    ),
  gotoOptions: gotoOptionsSchema,
  waitForSelector: waitForSelectorSchema,
  viewport: viewportSchema,
  cookies: cookiesSchema,
  authenticate: authenticateSchema,
  rejectResourceTypes: rejectResourceTypesSchema,
  userAgent: userAgentSchema,
} as const;

export function urlOrHtmlRefine(data: { url?: string; html?: string }) {
  return Boolean(data.url || data.html);
}

export const urlOrHtmlMessage = 'Either url or html is required.';

export type ToolHandler<T extends Record<string, unknown>> = (
  creds: { accountId: string; apiToken: string },
  args: T,
) => Promise<ToolResult>;

export type { McpServer };
