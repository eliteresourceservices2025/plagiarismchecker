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
  /** True when a verbatim-matched sentence isn't wrapped in quotation marks
   * in the submitted draft — a direct quote missing its quote marks. */
  missingQuotes?: boolean;
}

export interface FormattingWarning {
  type: string;
  message: string;
}

export interface SelfMatch {
  index: number;
  original: string;
  wordCount: number;
  score: number; // 0-100
  matchedCheckId: string;
  matchedCheckDate: string;
  matchedPreview: string;
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
  formattingWarnings: FormattingWarning[];
  /** Populated client-side (compared against LocalStorage check history) —
   * always empty in the server's own response, since the server has no
   * access to it. See hooks/usePlagiarismCheck.ts. */
  selfMatches: SelfMatch[];
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
  /** Pre-gathered results from one or more /api/search batch calls. When
   * present, /api/check skips searching entirely and goes straight to
   * ranking sources + fetching + comparing — this is what keeps each
   * request well under a serverless function's execution time limit. */
  searchResults?: SearchProviderResult[];
}

export interface SearchBatchRequestBody {
  queries: SearchQuery[];
  serperKey?: string;
  serpapiKey?: string;
  cachedResults?: Record<string, SearchResultItem[]>;
}

export interface SearchBatchResponse {
  results: SearchProviderResult[];
  freshResults: { phrase: string; results: SearchResultItem[] }[];
  queriesUsed: { serper: number; serpapi: number };
  cacheHits: number;
  errors: string[];
  exhausted: { serper: boolean; serpapi: boolean };
}

// --- Credit tracking (lib/creditTracker.ts, lib/creditStore.ts) ---
//
// Shared, server-side, real-time state (Upstash Redis) — every viewer sees
// the same numbers, incremented by the server itself at the moment a real
// Serper/SerpApi call succeeds (not self-reported by the client, so it
// can't drift). `configured: false` means the Upstash Redis integration
// hasn't been set up yet — the app still works, tracking is just inactive.

export interface CreditState {
  configured: boolean;
  serper: {
    total: number; // scales with how many SERPER_API_KEY[_2] are configured
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
  /** Whether WINSTON_API_KEY is set on the server — separate from Redis
   * `configured`, since the Winston *feature* can exist without shared
   * usage tracking. Controls whether the engine picker / AI-detection UI
   * shows up at all. */
  winstonKeyConfigured: boolean;
  winston: {
    used: number; // cumulative credits consumed, tallied from each response's credits_used
    /** Latest `credits_remaining` Winston itself reported — authoritative,
     * unlike serper/serpapi's totals which are estimated from constants. */
    remaining: number | null;
    lastUpdated: string | null;
  };
  lastUpdated: string;
}

export interface CreditSummary {
  configured: boolean;
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
  winstonKeyConfigured: boolean;
  /** null until Winston has been called at least once (no known total yet). */
  winstonRemaining: number | null;
  winstonPercentUsed: number | null;
  winstonExhausted: boolean;
}

// --- Winston AI (lib/winston.ts) ---
//
// A separate, optional integration — gowinston.ai's Plagiarism and AI
// Content Detection APIs. Kept as its own result shape rather than merged
// into CheckResult/SentenceMatch: Winston does its own web-search-and-match
// pipeline server-side (unlike Serper/SerpApi, which only return URLs for
// this app's own comparator to score), so its output isn't apples-to-apples
// with the sentence-by-sentence breakdown above.

export interface WinstonPlagiarismSource {
  url: string;
  title: string;
  score: number; // 0-100, this source's share of the plagiarism found
  plagiarismWords: number;
  identicalWordCounts: number;
  similarWordCounts: number;
  totalNumberOfWords: number;
  author: string | null;
  publishedDate: number | null;
  citation: boolean;
  canAccess: boolean;
}

export interface WinstonPlagiarismResult {
  score: number; // 0-100 plagiarism score (higher = more plagiarized)
  textWordCount: number;
  totalPlagiarismWords: number;
  identicalWordCount: number;
  similarWordCount: number;
  sources: WinstonPlagiarismSource[];
  attackDetected: { zeroWidthSpace: boolean; homoglyphAttack: boolean };
  creditsUsed: number;
  creditsRemaining: number;
}

export interface WinstonAIDetectionSentence {
  text: string;
  score: number; // 0-100 human-likelihood for this sentence
}

export interface WinstonAIDetectionResult {
  score: number; // 0-100 overall "Human Score" (higher = more human-like)
  sentences: WinstonAIDetectionSentence[];
  readabilityScore: number;
  creditsUsed: number;
  creditsRemaining: number;
}

export type PlagiarismEngine = "web" | "winston";

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
  text: string; // full checked text, kept for self-plagiarism comparison
  originalityScore: number;
  totalWords: number;
  sourceCount: number;
}
