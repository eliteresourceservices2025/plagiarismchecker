"use client";

import { useCallback, useState } from "react";
import { tokenizeSentences } from "@/lib/tokenizer";
import { selectSearchQueries } from "@/lib/sampler";
import { getCached, normalizeQueryKey, purgeExpired, setCached } from "@/lib/resultCache";
import type { CheckResult, ResultCache, SearchResultItem } from "@/lib/types";

export type CheckStage =
  | "idle"
  | "analyzing"
  | "searching"
  | "comparing"
  | "done"
  | "error";

const CACHE_STORAGE_KEY = "plagcheck_result_cache";

interface RunCheckArgs {
  text: string;
  serperKey?: string;
  serpapiKey?: string;
  excludeUrls?: string[];
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

/**
 * Orchestrates a plagiarism check: samples search queries client-side so it
 * can check the 24h LocalStorage result cache first (cache hits never touch
 * /api/check or count against API credits), sends only cache misses to the
 * server, then merges freshly-fetched results back into the cache.
 */
export function usePlagiarismCheck() {
  const [stage, setStage] = useState<CheckStage>("idle");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async ({ text, serperKey, serpapiKey, excludeUrls }: RunCheckArgs) => {
    setError(null);
    setResult(null);
    setStage("analyzing");

    const searchingTimer = setTimeout(() => setStage("searching"), 600);
    const comparingTimer = setTimeout(() => setStage("comparing"), 3000);

    try {
      // Pre-sample on the client (same logic the server would otherwise run)
      // so we can check the result cache before spending any API credits.
      const sentences = tokenizeSentences(text);
      const queries = selectSearchQueries(sentences);

      const { cache: liveCache } = purgeExpired(readCache());
      const cachedResults: Record<string, SearchResultItem[]> = {};
      for (const q of queries) {
        const hit = getCached(liveCache, q.phrase);
        if (hit) cachedResults[normalizeQueryKey(q.phrase)] = hit;
      }

      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, serperKey, serpapiKey, excludeUrls, queries, cachedResults }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const checkResult = data as CheckResult;

      // Persist freshly-fetched results into the cache for next time.
      let nextCache = liveCache;
      for (const fresh of checkResult.freshResults) {
        nextCache = setCached(nextCache, fresh.phrase, fresh.results);
      }
      writeCache(nextCache);

      setResult(checkResult);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("error");
    } finally {
      clearTimeout(searchingTimer);
      clearTimeout(comparingTimer);
    }
  }, []);

  const reset = useCallback(() => {
    setStage("idle");
    setResult(null);
    setError(null);
  }, []);

  return { stage, result, error, runCheck, reset };
}
