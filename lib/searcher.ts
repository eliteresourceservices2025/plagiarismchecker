import { normalizeQueryKey } from "./resultCache";
import type { SearchProviderResult, SearchQuery, SearchResultItem } from "./types";

export interface SearcherKeys {
  serperKey?: string;
  serpapiKey?: string;
}

export interface SearchOutcome {
  results: SearchProviderResult[];
  queriesUsed: { serper: number; serpapi: number };
  errors: string[];
  exhausted: { serper: boolean; serpapi: boolean };
}

export interface CachedSearchOutcome extends SearchOutcome {
  /** Newly-fetched (non-cache) results, for the caller to persist into its cache. */
  freshResults: { phrase: string; results: SearchResultItem[] }[];
  cacheHits: number;
}

/**
 * Like `runSearches`, but first checks a client-supplied cache of
 * previously-fetched results (keyed by normalized query phrase) and only
 * hits the live search APIs for cache misses — cache hits never count
 * against either API's credit usage.
 */
export async function runSearchesWithCache(
  queries: SearchQuery[],
  cachedResults: Record<string, SearchResultItem[]>,
  keys: SearcherKeys
): Promise<CachedSearchOutcome> {
  const results: SearchProviderResult[] = [];
  const toSearch: SearchQuery[] = [];
  let cacheHits = 0;

  for (const q of queries) {
    const cached = cachedResults[normalizeQueryKey(q.phrase)];
    if (cached) {
      results.push({ provider: "cache", query: q.phrase, results: cached });
      cacheHits++;
    } else {
      toSearch.push(q);
    }
  }

  const liveOutcome = await runSearches(toSearch, keys);
  results.push(...liveOutcome.results);

  const freshResults = liveOutcome.results.map((r) => ({ phrase: r.query, results: r.results }));

  return { ...liveOutcome, results, freshResults, cacheHits };
}

/**
 * Runs each search query against Serper.dev first, falling back to SerpApi
 * when Serper is unavailable/exhausted/errors out, per the multi-API
 * stacking strategy. Queries run concurrently (not one-at-a-time) so a
 * batch of several queries stays comfortably under a serverless function's
 * execution time limit — see the plan's "chunked processing" recommendation.
 */
export async function runSearches(
  queries: SearchQuery[],
  keys: SearcherKeys
): Promise<SearchOutcome> {
  const results: SearchProviderResult[] = [];
  const errors: string[] = [];
  const queriesUsed = { serper: 0, serpapi: 0 };
  // Shared across concurrent attempts — a small, harmless race (an extra
  // wasted call or two right as a key exhausts) in exchange for real
  // parallelism within a batch.
  const exhausted = { serper: false, serpapi: false };

  await Promise.all(
    queries.map(async (q) => {
      const searchPhrase = `"${q.phrase}"`;
      let handled = false;

      if (keys.serperKey && !exhausted.serper) {
        try {
          const items = await searchSerper(searchPhrase, keys.serperKey);
          queriesUsed.serper++;
          results.push({ provider: "serper", query: q.phrase, results: items });
          handled = true;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (isCreditError(message)) {
            exhausted.serper = true;
          }
          errors.push(`Serper query failed for "${q.phrase}": ${message}`);
        }
      }

      if (!handled && keys.serpapiKey && !exhausted.serpapi) {
        try {
          const items = await searchSerpApi(searchPhrase, keys.serpapiKey);
          queriesUsed.serpapi++;
          results.push({ provider: "serpapi", query: q.phrase, results: items });
          handled = true;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (isCreditError(message)) {
            exhausted.serpapi = true;
          }
          errors.push(`SerpApi query failed for "${q.phrase}": ${message}`);
        }
      }

      if (!handled) {
        errors.push(`No search provider available for "${q.phrase}"`);
      }
    })
  );

  return { results, queriesUsed, errors, exhausted };
}

function isCreditError(message: string): boolean {
  return /credit|quota|limit|429|402|payment/i.test(message);
}

async function searchSerper(query: string, apiKey: string): Promise<SearchResultItem[]> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num: 10 }),
  });

  if (!res.ok) {
    throw new Error(`Serper HTTP ${res.status}`);
  }

  const data = await res.json();
  const organic = Array.isArray(data.organic) ? data.organic : [];

  return organic.slice(0, 10).map(
    (item: { title?: string; link?: string; snippet?: string }): SearchResultItem => ({
      title: item.title ?? "",
      url: item.link ?? "",
      snippet: item.snippet ?? "",
    })
  );
}

async function searchSerpApi(query: string, apiKey: string): Promise<SearchResultItem[]> {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("engine", "google");
  url.searchParams.set("num", "10");

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(`SerpApi HTTP ${res.status}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(String(data.error));
  }

  const organic = Array.isArray(data.organic_results) ? data.organic_results : [];

  return organic.slice(0, 10).map(
    (item: { title?: string; link?: string; snippet?: string }): SearchResultItem => ({
      title: item.title ?? "",
      url: item.link ?? "",
      snippet: item.snippet ?? "",
    })
  );
}

/**
 * Deduplicates URLs across all search results and ranks them by how many
 * distinct queries returned them (a proxy for relevance).
 */
export function rankTopUrls(
  providerResults: SearchProviderResult[],
  excludeUrls: string[] = [],
  limit = 15
): { url: string; title: string; hitCount: number }[] {
  const excludeSet = new Set(excludeUrls.map((u) => normalizeUrl(u)));
  const byUrl = new Map<string, { url: string; title: string; hitCount: number }>();

  for (const providerResult of providerResults) {
    const seenInThisQuery = new Set<string>();
    for (const item of providerResult.results) {
      if (!item.url) continue;
      const key = normalizeUrl(item.url);
      if (excludeSet.has(key) || seenInThisQuery.has(key)) continue;
      seenInThisQuery.add(key);

      const existing = byUrl.get(key);
      if (existing) {
        existing.hitCount++;
      } else {
        byUrl.set(key, { url: item.url, title: item.title, hitCount: 1 });
      }
    }
  }

  return Array.from(byUrl.values())
    .sort((a, b) => b.hitCount - a.hitCount)
    .slice(0, limit);
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
