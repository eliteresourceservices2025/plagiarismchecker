import stringSimilarity from "string-similarity";
import { normalize } from "./tokenizer";
import type { SentenceInfo, SourceContent } from "./types";

export interface BestMatch {
  score: number; // 0-100
  sourceUrl?: string;
  sourceTitle?: string;
}

const MATCH_THRESHOLD = 80;
const PARAPHRASE_THRESHOLD = 40;

/**
 * Compares one sentence against all fetched source texts and returns the
 * best (highest-scoring) match, using a three-method approach:
 *   A) exact phrase match  -> 100% if found verbatim
 *   B) n-gram Jaccard overlap (word-level, catches rearranged text)
 *   C) Dice coefficient (character bigrams, catches paraphrasing)
 */
export function findBestMatch(
  sentence: SentenceInfo,
  sources: SourceContent[]
): BestMatch {
  let best: BestMatch = { score: 0 };

  for (const source of sources) {
    if (source.fetchFailed || !source.cleanText) continue;

    const normalizedSource = normalize(source.cleanText);

    // Method A: exact match (sentence or a long substring appears verbatim).
    if (exactPhraseMatch(sentence.normalized, normalizedSource)) {
      return { score: 100, sourceUrl: source.url, sourceTitle: source.title };
    }

    // Method B: n-gram Jaccard similarity (3-word and 5-word n-grams).
    const jaccard = bestNgramJaccard(sentence.normalized, normalizedSource);

    // Method C: Dice coefficient via character-bigram string similarity,
    // computed against the best-aligned window of the source text.
    const dice = bestDiceWindow(sentence.normalized, normalizedSource);

    const combined = Math.max(jaccard * 0.6, dice * 0.4) * 100;

    if (combined > best.score) {
      best = { score: combined, sourceUrl: source.url, sourceTitle: source.title };
    }
  }

  return best;
}

export function classify(score: number): "original" | "paraphrased" | "matched" {
  if (score >= MATCH_THRESHOLD) return "matched";
  if (score >= PARAPHRASE_THRESHOLD) return "paraphrased";
  return "original";
}

function exactPhraseMatch(normalizedSentence: string, normalizedSource: string): boolean {
  if (normalizedSentence.length < 15) return false;
  if (normalizedSource.includes(normalizedSentence)) return true;

  // Also check 5+ word substrings in case only part of the sentence was copied.
  const words = normalizedSentence.split(" ");
  if (words.length < 5) return false;

  for (let i = 0; i <= words.length - 5; i++) {
    const chunk = words.slice(i, i + 8).join(" ");
    if (chunk.length >= 20 && normalizedSource.includes(chunk)) return true;
  }

  return false;
}

function getNgrams(text: string, n: number): Set<string> {
  const words = text.split(" ").filter(Boolean);
  const grams = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    grams.add(words.slice(i, i + n).join(" "));
  }
  return grams;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const gram of a) {
    if (b.has(gram)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function bestNgramJaccard(sentence: string, source: string): number {
  const sentence3 = getNgrams(sentence, 3);
  const sentence5 = getNgrams(sentence, 5);
  const source3 = getNgrams(source, 3);
  const source5 = getNgrams(source, 5);

  const score3 = jaccardSimilarity(sentence3, source3);
  const score5 = jaccardSimilarity(sentence5, source5);

  return Math.max(score3, score5);
}

/**
 * Slides a window (roughly the sentence's length) across the source text
 * and returns the highest Dice coefficient found, so a match buried in a
 * long article isn't diluted by comparing against the whole page at once.
 */
function bestDiceWindow(sentence: string, source: string): number {
  const sentenceWords = sentence.split(" ").filter(Boolean);
  const sourceWords = source.split(" ").filter(Boolean);

  if (sourceWords.length === 0) return 0;

  // For short sources, just compare directly.
  if (sourceWords.length <= sentenceWords.length * 2) {
    return stringSimilarity.compareTwoStrings(sentence, source);
  }

  const windowSize = Math.max(sentenceWords.length, 6);
  const step = Math.max(Math.floor(windowSize / 2), 3);
  let best = 0;

  for (let i = 0; i <= sourceWords.length - windowSize; i += step) {
    const window = sourceWords.slice(i, i + windowSize).join(" ");
    const score = stringSimilarity.compareTwoStrings(sentence, window);
    if (score > best) best = score;
    if (best >= 0.99) break;
  }

  return best;
}
