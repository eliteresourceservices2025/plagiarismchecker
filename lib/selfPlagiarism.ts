import { normalize } from "./tokenizer";
import type { HistoryEntry, SelfMatch, SentenceInfo } from "./types";

const SELF_MATCH_THRESHOLD = 80; // same "matched" bar as external sources

/**
 * Flags sentences in the current draft that substantially overlap with
 * text from a past check (stored in LocalStorage history) — catches
 * self-plagiarism / recycled content. Runs entirely client-side against
 * local history, so it costs no API credits and needs no network access.
 * Uses exact-phrase + n-gram overlap only (skipping the more expensive
 * sliding-window Dice comparison from lib/comparator.ts) since recycled
 * content is normally near-verbatim reuse, which n-grams catch well.
 */
export function findSelfMatches(
  sentences: SentenceInfo[],
  history: HistoryEntry[],
  currentText: string
): SelfMatch[] {
  if (history.length === 0) return [];

  // Never compare a check against itself (e.g. re-running the same text).
  const pastEntries = history.filter((h) => h.text && h.text.trim() !== currentText.trim());
  if (pastEntries.length === 0) return [];

  const normalizedPast = pastEntries.map((entry) => ({
    entry,
    normalized: normalize(entry.text),
  }));

  const matches: SelfMatch[] = [];

  for (const sentence of sentences) {
    let best: { score: number; entry: HistoryEntry } | null = null;

    for (const { entry, normalized } of normalizedPast) {
      const score = scoreSentenceAgainstText(sentence.normalized, normalized);
      if (score >= SELF_MATCH_THRESHOLD && (!best || score > best.score)) {
        best = { score, entry };
      }
    }

    if (best) {
      matches.push({
        index: sentence.index,
        original: sentence.original,
        wordCount: sentence.wordCount,
        score: Math.round(best.score * 10) / 10,
        matchedCheckId: best.entry.id,
        matchedCheckDate: best.entry.createdAt,
        matchedPreview: best.entry.preview,
      });
    }
  }

  return matches;
}

function scoreSentenceAgainstText(normalizedSentence: string, normalizedSource: string): number {
  if (normalizedSentence.length < 15) return 0;

  // Exact substring match — definitive.
  if (normalizedSource.includes(normalizedSentence)) return 100;

  // 3-word and 5-word n-gram Jaccard overlap.
  const sentence3 = ngrams(normalizedSentence, 3);
  const sentence5 = ngrams(normalizedSentence, 5);
  const source3 = ngrams(normalizedSource, 3);
  const source5 = ngrams(normalizedSource, 5);

  const score3 = jaccard(sentence3, source3);
  const score5 = jaccard(sentence5, source5);

  return Math.max(score3, score5) * 100;
}

function ngrams(text: string, n: number): Set<string> {
  const words = text.split(" ").filter(Boolean);
  const grams = new Set<string>();
  for (let i = 0; i <= words.length - n; i++) {
    grams.add(words.slice(i, i + n).join(" "));
  }
  return grams;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const gram of a) {
    if (b.has(gram)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
