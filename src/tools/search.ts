import { z } from 'zod';
import type { McpServer } from '../utils.js';
import {
  callBrowserRun,
  textResult,
  withCredentials,
} from '../utils.js';

interface ScrapeResult {
  selector: string;
  results: Array<{
    text: string;
    html: string;
    attributes: Array<{ name: string; value: string }>;
  }>;
}

function parseDuckDuckGoUrl(href: string): string {
  try {
    const url = new URL(href, 'https://html.duckduckgo.com');
    const uddg = url.searchParams.get('uddg');
    if (uddg) return decodeURIComponent(uddg);
    return href.startsWith('//') ? `https:${href}` : href;
  } catch {
    return href;
  }
}

export function registerSearchTools(server: McpServer): void {
  server.registerTool(
    'search_web',
    {
      title: 'Search Web',
      description:
        'Searches the web using DuckDuckGo and returns structured results (title, URL, snippet). Use when you need to find pages but do not have a specific URL. Pairs with render_markdown or start_crawl — search to find URLs, then render or crawl them.',
      inputSchema: z.object({
        query: z
          .string()
          .describe('The search query.'),
        limit: z
          .number()
          .optional()
          .describe('Max results to return. Default: 10.'),
      }),
    },
    withCredentials(async (creds, args) => {
      const { query, limit = 10 } = args;

      const searchUrl =
        'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query);

      const result = (await callBrowserRun(
        creds.accountId,
        creds.apiToken,
        'scrape',
        {
          url: searchUrl,
          elements: [
            { selector: '.result__a' },
            { selector: '.result__snippet' },
          ],
        },
      )) as ScrapeResult[];

      const linkResults = result[0]?.results ?? [];
      const snippetResults = result[1]?.results ?? [];

      const searchResults = linkResults.slice(0, limit).map((link, i) => {
        const href =
          link.attributes?.find((a) => a.name === 'href')?.value ?? '';
        return {
          title: link.text,
          url: parseDuckDuckGoUrl(href),
          snippet: snippetResults[i]?.text ?? '',
        };
      });

      if (searchResults.length === 0) {
        return textResult(
          'No results found. The search engine may have blocked the request ' +
            'or returned no results for this query. Try rephrasing the query.',
        );
      }

      return textResult(JSON.stringify(searchResults, null, 2));
    }),
  );
}
