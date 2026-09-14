import type { SentenceMatch, SourceBreakdown } from "./types";

export interface ScoreSummary {
  originalityScore: number;
  totalWords: number;
  breakdown: {
    originalPercent: number;
    paraphrasedPercent: number;
    matchedPercent: number;
  };
  sources: SourceBreakdown[];
}

/**
 * Computes the overall originality score (word-weighted) and per-source
 * match breakdown from classified sentences.
 */
export function computeScore(
  sentences: SentenceMatch[],
  sourceTitles: Map<string, string>
): ScoreSummary {
  const totalWords = sentences.reduce((sum, s) => sum + s.wordCount, 0) || 1;

  let originalWords = 0;
  let paraphrasedWords = 0;
  let matchedWords = 0;

  const sourceWordCounts = new Map<string, number>();

  for (const sentence of sentences) {
    if (sentence.classification === "original") {
      originalWords += sentence.wordCount;
    } else if (sentence.classification === "paraphrased") {
      paraphrasedWords += sentence.wordCount;
    } else {
      matchedWords += sentence.wordCount;
    }

    if (sentence.classification !== "original" && sentence.sourceUrl) {
      sourceWordCounts.set(
        sentence.sourceUrl,
        (sourceWordCounts.get(sentence.sourceUrl) ?? 0) + sentence.wordCount
      );
    }
  }

  const sources: SourceBreakdown[] = Array.from(sourceWordCounts.entries())
    .map(([url, matchedWordCount]) => ({
      url,
      title: sourceTitles.get(url) ?? url,
      matchedWordCount,
      matchPercent: (matchedWordCount / totalWords) * 100,
    }))
    .sort((a, b) => b.matchPercent - a.matchPercent);

  const originalityScore = (originalWords / totalWords) * 100;

  return {
    originalityScore: Math.round(originalityScore * 10) / 10,
    totalWords,
    breakdown: {
      originalPercent: Math.round((originalWords / totalWords) * 1000) / 10,
      paraphrasedPercent: Math.round((paraphrasedWords / totalWords) * 1000) / 10,
      matchedPercent: Math.round((matchedWords / totalWords) * 1000) / 10,
    },
    sources,
  };
}
