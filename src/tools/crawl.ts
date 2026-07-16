import { z } from 'zod';
import type { McpServer } from '../utils.js';
import {
  callBrowserRun,
  callBrowserRunGet,
  commonParams,
  textResult,
  withCredentials,
} from '../utils.js';

export function registerCrawlTools(server: McpServer): void {
  server.registerTool(
    'start_crawl',
    {
      title: 'Start Crawl',
      description:
        'Initiates an async crawl job that scrapes content from a starting URL and follows links across the site. Returns a job ID to poll for results.',
      inputSchema: z.object({
        url: z.string().describe('The starting URL to crawl.'),
        limit: z
          .number()
          .optional()
          .describe('Max pages to crawl. Default: 10. Max: 100000.'),
        depth: z
          .number()
          .optional()
          .describe('Max link depth from starting URL. Default: 100000.'),
        formats: z
          .array(z.enum(['html', 'markdown', 'json']))
          .optional()
          .describe("Response format per page. Default: ['html']. Use 'markdown' for text content."),
        render: z
          .boolean()
          .optional()
          .describe(
            'If true (default), uses headless browser to render JS. If false, fast HTML fetch without JS.',
          ),
        source: z
          .enum(['all', 'sitemaps', 'links'])
          .optional()
          .describe(
            'How URLs are discovered. "all" (default) uses sitemaps + page links.',
          ),
        maxAge: z
          .number()
          .optional()
          .describe('Max cache age in seconds. Default: 86400. Max: 604800.'),
        modifiedSince: z
          .number()
          .optional()
          .describe('Unix timestamp (seconds). Only crawl pages modified since this time.'),
        crawlPurposes: z
          .array(z.enum(['search', 'ai-input', 'ai-train']))
          .optional()
          .describe(
            'Declared purposes per Content Signals. Default: all three. Narrow if site disallows some uses.',
          ),
        includeExternalLinks: z
          .boolean()
          .optional()
          .describe('Follow links to external domains. Default: false.'),
        includeSubdomains: z
          .boolean()
          .optional()
          .describe('Follow links to subdomains. Default: false.'),
        includePatterns: z
          .array(z.string())
          .optional()
          .describe(
            'Only visit URLs matching these wildcard patterns. Use * for path segments, ** for any chars.',
          ),
        excludePatterns: z
          .array(z.string())
          .optional()
          .describe('Skip URLs matching these wildcard patterns. Higher priority than includePatterns.'),
        rejectResourceTypes: z
          .array(z.string())
          .optional()
          .describe(
            "Block resource types (e.g., 'image', 'media', 'font', 'stylesheet') to speed up crawling. Only when render is true.",
          ),
        cookies: commonParams.cookies,
        authenticate: commonParams.authenticate,
        userAgent: commonParams.userAgent,
        gotoOptions: commonParams.gotoOptions,
        waitForSelector: commonParams.waitForSelector,
      }),
    },
    withCredentials(async (creds, args) => {
      const {
        includeExternalLinks,
        includeSubdomains,
        includePatterns,
        excludePatterns,
        ...rest
      } = args;

      const body: Record<string, unknown> = { ...rest };

      const options: Record<string, unknown> = {};
      if (includeExternalLinks !== undefined)
        options.includeExternalLinks = includeExternalLinks;
      if (includeSubdomains !== undefined)
        options.includeSubdomains = includeSubdomains;
      if (includePatterns !== undefined) options.includePatterns = includePatterns;
      if (excludePatterns !== undefined) options.excludePatterns = excludePatterns;
      if (Object.keys(options).length > 0) body.options = options;

      const result = await callBrowserRun(
        creds.accountId,
        creds.apiToken,
        'crawl',
        body,
      );
      return textResult(
        `Crawl job started. Job ID: ${result}\n\nUse get_crawl_status with this job ID to check status and retrieve results.`,
      );
    }),
  );

  server.registerTool(
    'get_crawl_status',
    {
      title: 'Get Crawl Status',
      description:
        'Checks the status or retrieves results of an async crawl job. Poll until status is "completed", then fetch full results.',
      inputSchema: z.object({
        jobId: z.string().describe('The crawl job ID returned by start_crawl.'),
        status: z
          .enum(['queued', 'completed', 'disallowed', 'skipped', 'errored', 'cancelled'])
          .optional()
          .describe('Filter records by URL status.'),
        cursor: z
          .string()
          .optional()
          .describe('Pagination cursor from a previous response.'),
        limit: z
          .number()
          .optional()
          .describe('Max records to return. Use limit=1 with status checks to stay lightweight.'),
      }),
    },
    withCredentials(async (creds, args) => {
      const { jobId, status, cursor, limit } = args;

      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (cursor) params.set('cursor', cursor);
      if (limit !== undefined) params.set('limit', String(limit));
      const queryString = params.toString();

      const endpoint = `crawl/${jobId}${queryString ? `?${queryString}` : ''}`;
      const result = await callBrowserRunGet(
        creds.accountId,
        creds.apiToken,
        endpoint,
      );
      return textResult(JSON.stringify(result, null, 2));
    }),
  );
}
