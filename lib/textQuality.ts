const OPENING_QUOTES = ['"', "“", "'", "‘"];
const CLOSING_QUOTES = ['"', "”", "'", "’"];

/**
 * Heuristic check for whether a sentence is wrapped in quotation marks —
 * used to flag verbatim-matched sentences that read as a direct quote but
 * aren't actually punctuated as one.
 */
export function isQuoted(sentence: string): boolean {
  const trimmed = sentence.trim();
  if (trimmed.length < 2) return false;

  const first = trimmed[0];
  if (!OPENING_QUOTES.includes(first)) return false;

  // Allow a closing quote to be the very last character, or just before
  // trailing sentence punctuation (e.g. `"...quote."` or `"...quote,"`).
  const last = trimmed[trimmed.length - 1];
  const secondLast = trimmed[trimmed.length - 2];
  return CLOSING_QUOTES.includes(last) || CLOSING_QUOTES.includes(secondLast);
}
