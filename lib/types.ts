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
  provider: "serper" | "serpapi";
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
  warnings: string[];
}

export interface CheckRequestBody {
  text: string;
  serperKey?: string;
  serpapiKey?: string;
  excludeUrls?: string[];
}
