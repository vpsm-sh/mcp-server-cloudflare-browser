import { z } from 'zod';
import type { McpServer } from '../utils.js';
import {
  callBrowserRun,
  commonParams,
  textResult,
  urlOrHtmlMessage,
  urlOrHtmlRefine,
  withCredentials,
} from '../utils.js';

export function registerExtractTools(server: McpServer): void {
  server.registerTool(
    'extract_links',
    {
      title: 'Extract Links',
      description:
        'Extracts all links from a webpage, including hidden ones. Useful for site discovery and crawling.',
      inputSchema: z
        .object({
          ...commonParams,
          visibleLinksOnly: z
            .boolean()
            .optional()
            .describe('Only return links visible on the page. Default: false.'),
          excludeExternalLinks: z
            .boolean()
            .optional()
            .describe('Exclude links pointing to external domains. Default: false.'),
        })
        .refine(urlOrHtmlRefine, urlOrHtmlMessage),
    },
    withCredentials(async (creds, args) => {
      const result = await callBrowserRun(
        creds.accountId,
        creds.apiToken,
        'links',
        args,
      );
      return textResult(JSON.stringify(result, null, 2));
    }),
  );

  server.registerTool(
    'scrape_elements',
    {
      title: 'Scrape Elements',
      description:
        'Extracts structured data from specific elements on a webpage using CSS selectors. Returns text, HTML, attributes, and dimensions for each match.',
      inputSchema: z
        .object({
          ...commonParams,
          elements: z
            .array(
              z.object({
                selector: z
                  .string()
                  .describe('CSS selector for elements to extract (e.g., "h1", "a", ".price").'),
              }),
            )
            .describe('Array of element selectors to extract from the page.'),
        })
        .refine(urlOrHtmlRefine, urlOrHtmlMessage),
    },
    withCredentials(async (creds, args) => {
      const result = await callBrowserRun(
        creds.accountId,
        creds.apiToken,
        'scrape',
        args,
      );
      return textResult(JSON.stringify(result, null, 2));
    }),
  );

  server.registerTool(
    'extract_json',
    {
      title: 'Extract JSON',
      description:
        'Extracts structured JSON data from a webpage using AI. Provide a prompt and optionally a JSON schema to enforce output structure. Uses Workers AI by default.',
      inputSchema: z
        .object({
          ...commonParams,
          prompt: z
            .string()
            .optional()
            .describe(
              'Natural language prompt describing what data to extract from the page.',
            ),
          response_format: z
            .record(z.string(), z.unknown())
            .optional()
            .describe(
              'JSON schema for structured output. Pass an object like ' +
                "{ type: 'json_schema', json_schema: { type: 'object', properties: {...} } } " +
                'to enforce the output structure.',
            ),
          custom_ai: z
            .array(
              z.object({
                model: z
                  .string()
                  .describe('Model in <provider>/<model> format (e.g., "anthropic/claude-sonnet-4-20250514").'),
                authorization: z
                  .string()
                  .describe('Bearer token or API key for the model provider.'),
              }),
            )
            .optional()
            .describe(
              'Use a custom AI model instead of the default Workers AI. ' +
                'List multiple models for automatic failover.',
            ),
        })
        .refine(urlOrHtmlRefine, urlOrHtmlMessage),
    },
    withCredentials(async (creds, args) => {
      const result = await callBrowserRun(
        creds.accountId,
        creds.apiToken,
        'json',
        args,
      );
      return textResult(JSON.stringify(result, null, 2));
    }),
  );
}
