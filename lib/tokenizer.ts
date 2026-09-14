import type { SentenceInfo } from "./types";

// Basic abbreviations that shouldn't be treated as sentence boundaries.
const ABBREVIATIONS = [
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "sr",
  "jr",
  "vs",
  "etc",
  "e.g",
  "i.e",
  "inc",
  "ltd",
  "co",
  "u.s",
  "u.k",
  "a.m",
  "p.m",
];

const MIN_WORDS = 8;

/**
 * Splits raw text into sentences, preserving the original text (for exact
 * highlight positioning) alongside a normalized version used for comparison.
 */
export function tokenizeSentences(rawText: string): SentenceInfo[] {
  const text = rawText.trim();
  if (!text) return [];

  const sentences = splitIntoSentences(text);

  const results: SentenceInfo[] = [];
  let index = 0;

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    const wordCount = countWords(trimmed);
    if (wordCount < MIN_WORDS) continue; // too short/common to be meaningful

    results.push({
      index: index++,
      original: trimmed,
      normalized: normalize(trimmed),
      wordCount,
    });
  }

  return results;
}

function splitIntoSentences(text: string): string[] {
  // Protect abbreviations from being treated as sentence-ending periods.
  let protectedText = text;
  ABBREVIATIONS.forEach((abbr) => {
    const re = new RegExp(`\\b${abbr}\\.`, "gi");
    protectedText = protectedText.replace(re, `${abbr}<PERIOD>`);
  });

  // Protect decimal numbers (e.g. 3.14) from splitting.
  protectedText = protectedText.replace(/(\d)\.(\d)/g, "$1<PERIOD>$2");

  // Split on sentence-ending punctuation followed by whitespace + capital
  // letter or end of string.
  const rawSplits = protectedText
    .replace(/([.!?])\s+(?=[A-Z0-9"'“(])/g, "$1|||")
    .split("|||");

  return rawSplits.map((s) => s.replace(/<PERIOD>/g, "."));
}

function countWords(text: string): number {
  const matches = text.match(/[A-Za-z0-9'-]+/g);
  return matches ? matches.length : 0;
}

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
