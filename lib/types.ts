// Shared TypeScript interfaces for the plagiarism checker.

export interface SentenceInfo {
  index: number;
  original: string;
  normalized: string;
  wordCount: number;
}

export interface ScoredSentence extends SentenceInfo {
  distinctiveness: number;
}

export interface SearchQuery {
  sentenceIndex: number;
  phrase: string;
}

export interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchProviderResult {
  provider: "serper" | "serpapi" | "cache";
  query: string;
  results: SearchResultItem[];
}

export interface SourceContent {
  url: string;
  title: string;
  cleanText: string;
  fetchFailed?: boolean;
}

export type MatchClassification = "original" | "paraphrased" | "matched";

export interface SentenceMatch {
  index: number;
  original: string;
  wordCount: number;
  classification: MatchClassification;
  score: number; // 0-100
  sourceUrl?: string;
  sourceTitle?: string;
}

export interface SourceBreakdown {
  url: string;
  title: string;
  matchedWordCount: number;
  matchPercent: number; // relative to total words in submitted text
}

export interface CheckResult {
  originalityScore: number; // 0-100
  totalWords: number;
  sentenceCount: number;
  sentencesChecked: number; // how many were sampled/searched
  breakdown: {
    originalPercent: number;
    paraphrasedPercent: number;
    matchedPercent: number;
  };
  sentences: SentenceMatch[];
  sources: SourceBreakdown[];
  queriesUsed: {
    serper: number;
    serpapi: number;
  };
  cacheHits: number;
  freshResults: { phrase: string; results: SearchResultItem[] }[];
  exhausted: {
    serper: boolean;
    serpapi: boolean;
  };
  warnings: string[];
}

export interface CheckRequestBody {
  text: string;
  serperKey?: string;
  serpapiKey?: string;
  excludeUrls?: string[];
  /** Client-precomputed sample queries (from lib/sampler.ts) so the client
   * can decide which ones are already cached before the server ever sees
   * them. Falls back to server-side sampling if omitted. */
  queries?: SearchQuery[];
  /** Cache hits the client already has for some of `queries`, keyed by
   * normalized phrase — the server skips live search for these entirely. */
  cachedResults?: Record<string, SearchResultItem[]>;
}

// --- Credit tracking (lib/creditTracker.ts) ---

export interface CreditState {
  serper: {
    total: number;
    used: number;
    firstUsedAt: string | null;
    expiresAt: string | null;
  };
  serpapi: {
    monthlyLimit: number;
    usedThisMonth: number;
    currentMonth: string; // "YYYY-MM"
    resetsOn: string; // ISO date
  };
  lastUpdated: string;
}

export interface CreditSummary {
  serperRemaining: number;
  serperPercentUsed: number;
  serpapiRemaining: number;
  serpapiPercentUsed: number;
  combinedRemaining: number;
  serperExhausted: boolean;
  serpapiExhausted: boolean;
  allExhausted: boolean;
  daysUntilSerperExpiry: number | null;
  serpapiResetsOn: string;
}

// --- Result cache (lib/resultCache.ts) ---

export interface CacheEntry {
  results: SearchResultItem[];
  cachedAt: number; // epoch ms
  ttl: number; // ms
}

export type ResultCache = Record<string, CacheEntry>;

// --- Check history (lib/history.ts) ---

export interface HistoryEntry {
  id: string;
  createdAt: string;
  preview: string; // first ~120 chars of the checked text
  originalityScore: number;
  totalWords: number;
  sourceCount: number;
}
