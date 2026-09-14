import type { ScoredSentence, SearchQuery, SentenceInfo } from "./types";

const MAX_QUERIES = 20;
const SAMPLE_RATIO = 0.25;
const PHRASE_WORD_TARGET = 7; // 6-8 word distinctive phrase

const GENERIC_PATTERNS = [
  /^in this (article|post|blog|guide)/i,
  /^this (article|post|blog|guide) (will|is going to)/i,
  /^welcome to/i,
  /^let'?s (dive|get started|take a look)/i,
  /^without further ado/i,
  /^as (mentioned|discussed|stated) (above|earlier|before)/i,
  /^in conclusion/i,
  /^to sum(marize| up)/i,
];

/**
 * Scores sentences by how "distinctive" they are, so we spend our limited
 * search-API budget on the phrases most likely to reveal plagiarism.
 */
export function scoreDistinctiveness(sentences: SentenceInfo[]): ScoredSentence[] {
  return sentences.map((sentence) => {
    let score = 0;

    // Longer sentences tend to have more unique phrasing.
    score += Math.min(sentence.wordCount, 40) * 0.5;

    // Proper nouns (capitalized words not at sentence start) suggest
    // specific, searchable content.
    const words = sentence.original.split(/\s+/);
    const properNouns = words.filter((w, i) => i > 0 && /^[A-Z][a-z]+/.test(w));
    score += properNouns.length * 4;

    // Numbers/statistics are distinctive and easy to exact-match.
    const numbers = sentence.original.match(/\b\d+([.,]\d+)?%?\b/g);
    score += (numbers?.length ?? 0) * 3;

    // Longer average word length suggests technical/specific vocabulary.
    const avgWordLen =
      words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);
    score += avgWordLen * 2;

    // Penalize generic filler openers.
    if (GENERIC_PATTERNS.some((re) => re.test(sentence.original))) {
      score -= 25;
    }

    return { ...sentence, distinctiveness: score };
  });
}

/**
 * Selects the top N most distinctive sentences and extracts a short quoted
 * phrase from each, suitable for exact-match web search.
 */
export function selectSearchQueries(sentences: SentenceInfo[]): SearchQuery[] {
  if (sentences.length === 0) return [];

  const scored = scoreDistinctiveness(sentences);
  const n = Math.min(MAX_QUERIES, Math.ceil(sentences.length * SAMPLE_RATIO) || 1);

  const top = [...scored]
    .sort((a, b) => b.distinctiveness - a.distinctiveness)
    .slice(0, n)
    .sort((a, b) => a.index - b.index); // restore reading order

  const seen = new Set<string>();
  const queries: SearchQuery[] = [];

  for (const sentence of top) {
    const phrase = extractDistinctivePhrase(sentence.original);
    const key = phrase.toLowerCase();
    if (!phrase || seen.has(key)) continue; // dedupe near-identical phrases
    seen.add(key);
    queries.push({ sentenceIndex: sentence.index, phrase });
  }

  return queries;
}

function extractDistinctivePhrase(sentence: string): string {
  const words = sentence
    .replace(/["“”]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length <= PHRASE_WORD_TARGET) {
    return words.join(" ");
  }

  // Prefer a window starting after the first couple of words (skip common
  // sentence openers) while staying within bounds.
  const start = Math.min(2, words.length - PHRASE_WORD_TARGET);
  return words.slice(start, start + PHRASE_WORD_TARGET).join(" ");
}
