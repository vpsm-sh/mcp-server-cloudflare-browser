import { z } from 'zod';
import type { McpServer } from '../utils.js';
import {
  callBrowserRun,
  callBrowserRunBinary,
  commonParams,
  errorResult,
  imageResult,
  textResult,
  urlOrHtmlMessage,
  urlOrHtmlRefine,
  withCredentials,
  type ContentItem,
  type ToolResult,
} from '../utils.js';

export function registerRenderTools(server: McpServer): void {
  server.registerTool(
    'render_markdown',
    {
      title: 'Render Markdown',
      description:
        'Fetches a URL using a headless browser and returns the page as Markdown. Handles JavaScript-rendered SPAs.',
      inputSchema: z
        .object({
          ...commonParams,
          rejectRequestPattern: z
            .array(z.string())
            .optional()
            .describe('Block requests matching these regex patterns.'),
        })
        .refine(urlOrHtmlRefine, urlOrHtmlMessage),
    },
    withCredentials(async (creds, args) => {
      const result = await callBrowserRun(
        creds.accountId,
        creds.apiToken,
        'markdown',
        args,
      );
      return textResult(String(result));
    }),
  );

  server.registerTool(
    'render_content',
    {
      title: 'Render Content',
      description:
        'Fetches a URL using a headless browser and returns the fully rendered HTML after JavaScript execution.',
      inputSchema: z
        .object({
          ...commonParams,
          addScriptTag: z
            .array(
              z.object({
                content: z.string().optional(),
                url: z.string().optional(),
              }),
            )
            .optional()
            .describe('Inject JavaScript into the page before capture.'),
          addStyleTag: z
            .array(
              z.object({
                content: z.string().optional(),
                url: z.string().optional(),
              }),
            )
            .optional()
            .describe('Inject CSS styles into the page before capture.'),
        })
        .refine(urlOrHtmlRefine, urlOrHtmlMessage),
    },
    withCredentials(async (creds, args) => {
      const result = await callBrowserRun(
        creds.accountId,
        creds.apiToken,
        'content',
        args,
      );
      return textResult(String(result));
    }),
  );

  server.registerTool(
    'take_screenshot',
    {
      title: 'Take Screenshot',
      description:
        'Captures a screenshot of a fully rendered webpage. Returns a PNG image.',
      inputSchema: z
        .object({
          ...commonParams,
          screenshotOptions: z
            .object({
              fullPage: z
                .boolean()
                .optional()
                .describe('Capture the entire scrollable page.'),
              omitBackground: z
                .boolean()
                .optional()
                .describe('Capture with transparent background.'),
              type: z
                .enum(['png', 'jpeg'])
                .optional()
                .describe('Image format. Default: png.'),
              quality: z
                .number()
                .optional()
                .describe('JPEG quality (0-100). Only for jpeg type.'),
            })
            .optional()
            .describe('Screenshot capture options.'),
          selector: z
            .string()
            .optional()
            .describe('CSS selector to screenshot a specific element only.'),
        })
        .refine(urlOrHtmlRefine, urlOrHtmlMessage),
    },
    withCredentials(async (creds, args) => {
      const buffer = await callBrowserRunBinary(
        creds.accountId,
        creds.apiToken,
        'screenshot',
        args,
      );
      const format =
        (args.screenshotOptions as { type?: string } | undefined)?.type || 'png';
      return imageResult(
        buffer.toString('base64'),
        format === 'jpeg' ? 'image/jpeg' : 'image/png',
      );
    }),
  );

  server.registerTool(
    'render_pdf',
    {
      title: 'Render PDF',
      description:
        'Generates a PDF from a webpage or custom HTML using a headless browser. Returns base64-encoded PDF data.',
      inputSchema: z
        .object({
          ...commonParams,
          pdfOptions: z
            .object({
              format: z
                .string()
                .optional()
                .describe("Page size: 'a4', 'a5', 'letter', 'legal', etc."),
              landscape: z.boolean().optional().describe('Use landscape orientation.'),
              printBackground: z
                .boolean()
                .optional()
                .describe('Include background graphics.'),
              displayHeaderFooter: z
                .boolean()
                .optional()
                .describe('Show header and footer.'),
              headerTemplate: z
                .string()
                .optional()
                .describe('HTML template for page headers.'),
              footerTemplate: z
                .string()
                .optional()
                .describe('HTML template for page footers.'),
              margin: z
                .object({
                  top: z.string().optional(),
                  bottom: z.string().optional(),
                  left: z.string().optional(),
                  right: z.string().optional(),
                })
                .optional()
                .describe('Page margins (e.g., "70px").'),
              scale: z.number().optional().describe('Scale factor (0.1-2.0).'),
            })
            .optional()
            .describe('PDF generation options.'),
          addStyleTag: z
            .array(
              z.object({
                content: z.string().optional(),
                url: z.string().optional(),
              }),
            )
            .optional()
            .describe('Inject CSS styles before PDF generation.'),
        })
        .refine(urlOrHtmlRefine, urlOrHtmlMessage),
    },
    withCredentials(async (creds, args) => {
      const buffer = await callBrowserRunBinary(
        creds.accountId,
        creds.apiToken,
        'pdf',
        args,
      );
      const base64 = buffer.toString('base64');
      return textResult(
        `data:application/pdf;base64,${base64}`,
      );
    }),
  );

  server.registerTool(
    'take_snapshot',
    {
      title: 'Take Snapshot',
      description:
        'Captures multiple formats from a webpage in a single request: HTML, screenshot, Markdown, and/or accessibility tree.',
      inputSchema: z
        .object({
          ...commonParams,
          formats: z
            .array(
              z.enum(['content', 'screenshot', 'markdown', 'accessibilityTree']),
            )
            .optional()
            .describe(
              "Which formats to capture (at least two). Default: ['content', 'screenshot'].",
            ),
          screenshotOptions: z
            .object({
              fullPage: z.boolean().optional(),
              omitBackground: z.boolean().optional(),
            })
            .optional()
            .describe('Screenshot options within the snapshot.'),
          setJavaScriptEnabled: z
            .boolean()
            .optional()
            .describe('Enable or disable JavaScript execution.'),
          addScriptTag: z
            .array(
              z.object({
                content: z.string().optional(),
                url: z.string().optional(),
              }),
            )
            .optional()
            .describe('Inject JavaScript into the page before capture.'),
        })
        .refine(urlOrHtmlRefine, urlOrHtmlMessage),
    },
    withCredentials(async (creds, args) => {
      const result = (await callBrowserRun(
        creds.accountId,
        creds.apiToken,
        'snapshot',
        args,
      )) as Record<string, unknown>;

      const screenshot = result.screenshot as string | undefined;
      const rest = { ...result };
      delete rest.screenshot;

      const content: ContentItem[] = [
        { type: 'text', text: JSON.stringify(rest, null, 2) },
      ];

      if (screenshot) {
        content.push({ type: 'image', data: screenshot, mimeType: 'image/png' });
      }

      return { content };
    }),
  );

  server.registerTool(
    'get_accessibility_tree',
    {
      title: 'Get Accessibility Tree',
      description:
        'Captures the accessibility tree of a webpage after JavaScript execution. Useful for AI agents that need to understand page structure for automation.',
      inputSchema: z
        .object({
          ...commonParams,
          interestingOnly: z
            .boolean()
            .optional()
            .describe(
              'Return only semantically meaningful nodes. Default: true.',
            ),
          root: z
            .string()
            .optional()
            .describe(
              'CSS selector to anchor the tree to a subtree. Returns null if no match.',
            ),
        })
        .refine(urlOrHtmlRefine, urlOrHtmlMessage),
    },
    withCredentials(async (creds, args) => {
      const result = await callBrowserRun(
        creds.accountId,
        creds.apiToken,
        'accessibilityTree',
        args,
      );
      return textResult(JSON.stringify(result, null, 2));
    }),
  );
}
