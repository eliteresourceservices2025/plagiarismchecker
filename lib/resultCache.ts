import type { CacheEntry, ResultCache, SearchResultItem } from "./types";

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_BYTES = 5 * 1024 * 1024; // 5MB cap, evict oldest first (LRU)

export function normalizeQueryKey(phrase: string): string {
  return phrase.toLowerCase().trim();
}

export function getCached(cache: ResultCache, phrase: string): SearchResultItem[] | undefined {
  const entry = cache[normalizeQueryKey(phrase)];
  if (!entry) return undefined;
  if (Date.now() - entry.cachedAt > entry.ttl) return undefined; // expired
  return entry.results;
}

export function setCached(
  cache: ResultCache,
  phrase: string,
  results: SearchResultItem[]
): ResultCache {
  const entry: CacheEntry = { results, cachedAt: Date.now(), ttl: TTL_MS };
  const next: ResultCache = { ...cache, [normalizeQueryKey(phrase)]: entry };
  return enforceSizeCap(next);
}

export function purgeExpired(cache: ResultCache): { cache: ResultCache; removed: number } {
  const now = Date.now();
  let removed = 0;
  const next: ResultCache = {};
  for (const [key, entry] of Object.entries(cache)) {
    if (now - entry.cachedAt > entry.ttl) {
      removed++;
    } else {
      next[key] = entry;
    }
  }
  return { cache: next, removed };
}

export function cacheSizeBytes(cache: ResultCache): number {
  try {
    return new Blob([JSON.stringify(cache)]).size;
  } catch {
    return JSON.stringify(cache).length; // rough fallback (UTF-16 code units)
  }
}

function enforceSizeCap(cache: ResultCache): ResultCache {
  if (cacheSizeBytes(cache) <= MAX_CACHE_BYTES) return cache;

  // Evict oldest entries first until back under the cap.
  const entries = Object.entries(cache).sort((a, b) => a[1].cachedAt - b[1].cachedAt);
  const next: ResultCache = { ...cache };

  for (const [key] of entries) {
    delete next[key];
    if (cacheSizeBytes(next) <= MAX_CACHE_BYTES) break;
  }

  return next;
}
