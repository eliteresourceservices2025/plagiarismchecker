"use client";

import { useCallback, useState } from "react";
import { tokenizeSentences } from "@/lib/tokenizer";
import { selectSearchQueries } from "@/lib/sampler";
import { getCached, normalizeQueryKey, purgeExpired, setCached } from "@/lib/resultCache";
import type {
  CheckResult,
  ResultCache,
  SearchBatchResponse,
  SearchProviderResult,
  SearchQuery,
} from "@/lib/types";

export type CheckStage =
  | "idle"
  | "analyzing"
  | "searching"
  | "comparing"
  | "done"
  | "error";

const CACHE_STORAGE_KEY = "plagcheck_result_cache";

// Queries are sent to /api/search in small batches (not all 20 at once) so
// each request stays comfortably under a serverless function's execution
// time limit — the plan's "chunked processing" recommendation for
// surviving Vercel's Hobby-tier 10s cap.
const BATCH_SIZE = 5;

interface RunCheckArgs {
  text: string;
  serperKey?: string;
  serpapiKey?: string;
  excludeUrls?: string[];
}

interface SearchProgress {
  completedBatches: number;
  totalBatches: number;
}

function readCache(): ResultCache {
  try {
    const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ResultCache) : {};
  } catch {
    return {};
  }
}

function writeCache(cache: ResultCache) {
  try {
    window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // storage full/unavailable — caching just won't persist this session
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Orchestrates a plagiarism check across several small requests instead of
 * one long one:
 *   1. sample queries + check the LocalStorage result cache client-side
 *   2. send cache-miss queries to /api/search in batches of BATCH_SIZE
 *   3. send the merged search results to /api/check for ranking, source
 *      fetching, and comparison
 * Cache hits never touch the network and never count against API credits.
 */
export function usePlagiarismCheck() {
  const [stage, setStage] = useState<CheckStage>("idle");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchProgress, setSearchProgress] = useState<SearchProgress | null>(null);

  const runCheck = useCallback(async ({ text, serperKey, serpapiKey, excludeUrls }: RunCheckArgs) => {
    setError(null);
    setResult(null);
    setSearchProgress(null);
    setStage("analyzing");

    try {
      // --- Sample + check cache ---
      const sentences = tokenizeSentences(text);
      const queries = selectSearchQueries(sentences);

      const { cache: liveCache } = purgeExpired(readCache());
      let workingCache = liveCache;

      const combinedResults: SearchProviderResult[] = [];
      const missQueries: SearchQuery[] = [];

      for (const q of queries) {
        const hit = getCached(workingCache, q.phrase);
        if (hit) {
          combinedResults.push({ provider: "cache", query: q.phrase, results: hit });
        } else {
          missQueries.push(q);
        }
      }

      // --- Search cache misses in small batches ---
      const totals = { serper: 0, serpapi: 0 };
      let cacheHits = queries.length - missQueries.length;
      const exhausted = { serper: false, serpapi: false };
      const searchErrors: string[] = [];

      if (missQueries.length > 0) {
        setStage("searching");
        const batches = chunk(missQueries, BATCH_SIZE);
        setSearchProgress({ completedBatches: 0, totalBatches: batches.length });

        for (const batch of batches) {
          const res = await fetch("/api/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ queries: batch, serperKey, serpapiKey }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || `Search request failed (${res.status})`);
          }

          const batchResult = data as SearchBatchResponse;
          combinedResults.push(...batchResult.results);
          totals.serper += batchResult.queriesUsed.serper;
          totals.serpapi += batchResult.queriesUsed.serpapi;
          cacheHits += batchResult.cacheHits;
          searchErrors.push(...batchResult.errors);
          exhausted.serper = exhausted.serper || batchResult.exhausted.serper;
          exhausted.serpapi = exhausted.serpapi || batchResult.exhausted.serpapi;

          for (const fresh of batchResult.freshResults) {
            workingCache = setCached(workingCache, fresh.phrase, fresh.results);
          }

          setSearchProgress((prev) =>
            prev ? { ...prev, completedBatches: prev.completedBatches + 1 } : prev
          );

          // If both providers are exhausted, no point sending further batches.
          if (exhausted.serper && exhausted.serpapi) break;
        }

        writeCache(workingCache);

        // If every single live search attempt failed (bad/expired key,
        // provider outage, etc.), don't silently hand back a "100%
        // original" result — that would misrepresent a check that never
        // actually ran. Fail loudly instead.
        const liveSuccesses = totals.serper + totals.serpapi;
        if (liveSuccesses === 0) {
          const detail = searchErrors[0] ?? "Search requests failed.";
          throw new Error(
            `Couldn't search the web for this check: ${detail} Check the API key in Settings (or ask an admin to check the shared key).`
          );
        }
      }

      // --- Rank + fetch + compare (server does this part) ---
      setStage("comparing");
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, excludeUrls, searchResults: combinedResults }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const serverResult = data as CheckResult;

      // The server's queriesUsed/cacheHits/exhausted are 0/empty for the
      // pre-gathered path — overlay the real totals accumulated above.
      const finalResult: CheckResult = {
        ...serverResult,
        queriesUsed: totals,
        cacheHits,
        exhausted,
        warnings: [...searchErrors, ...serverResult.warnings],
      };
      if (exhausted.serper && exhausted.serpapi) {
        finalResult.warnings.push("All configured search API credits appear to be depleted.");
      }

      setResult(finalResult);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("error");
    } finally {
      setSearchProgress(null);
    }
  }, []);

  const reset = useCallback(() => {
    setStage("idle");
    setResult(null);
    setError(null);
    setSearchProgress(null);
  }, []);

  return { stage, result, error, runCheck, reset, searchProgress };
}
