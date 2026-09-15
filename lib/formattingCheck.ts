import type { FormattingWarning } from "./types";

const INVISIBLE_CHARS_RE = /[​‌‍﻿­]/g;
const STRAIGHT_QUOTES_RE = /["']/;
const CURLY_QUOTES_RE = /[“”‘’]/;
const IRREGULAR_SPACING_RE = /[ \t]{2,}|\t/;
const PARENTHETICAL_CITATION_RE =
  /\([A-Z][a-zA-Z'-]+(?:\s+(?:et al\.|and|&)\s+[A-Z][a-zA-Z'-]+)?,?\s+\d{4}\)/;
const NUMBERED_CITATION_RE = /\[\d+\]/;

/**
 * Scans the raw submitted text for classic copy-paste tells: hidden
 * Unicode characters, mixed quote styles, irregular spacing, and mixed
 * citation conventions. These don't affect the originality score — they're
 * surfaced as separate quality warnings.
 */
export function checkFormatting(text: string): FormattingWarning[] {
  const warnings: FormattingWarning[] = [];

  const invisibleMatches = text.match(INVISIBLE_CHARS_RE);
  if (invisibleMatches && invisibleMatches.length > 0) {
    warnings.push({
      type: "hidden-characters",
      message: `Found ${invisibleMatches.length} hidden/invisible character${
        invisibleMatches.length === 1 ? "" : "s"
      } (zero-width spaces, soft hyphens) — often left behind when copying from formatted documents or PDFs.`,
    });
  }

  if (STRAIGHT_QUOTES_RE.test(text) && CURLY_QUOTES_RE.test(text)) {
    warnings.push({
      type: "mixed-quotes",
      message:
        'Mixes straight (" \') and curly (“ ’) quotation marks — can indicate text pasted in from different sources.',
    });
  }

  if (IRREGULAR_SPACING_RE.test(text)) {
    warnings.push({
      type: "irregular-spacing",
      message:
        "Contains irregular spacing (multiple consecutive spaces or tab characters) — a common copy-paste artifact.",
    });
  }

  if (PARENTHETICAL_CITATION_RE.test(text) && NUMBERED_CITATION_RE.test(text)) {
    warnings.push({
      type: "mixed-citation-style",
      message:
        "Mixes parenthetical (Author, Year) citations with numbered [1] citations — inconsistent referencing style.",
    });
  }

  return warnings;
}
