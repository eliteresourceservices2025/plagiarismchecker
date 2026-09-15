export type CitationStyle = "apa" | "mla" | "chicago";

export const CITATION_STYLES: { value: CitationStyle; label: string }[] = [
  { value: "apa", label: "APA" },
  { value: "mla", label: "MLA" },
  { value: "chicago", label: "Chicago" },
];

interface CitableSource {
  title: string;
  url: string;
}

/**
 * Generates a citation for a web source. Author and publish date aren't
 * available from arbitrary scraped pages, so these follow each style's
 * standard fallback for a web page with no listed author/date (a "site
 * name" derived from the hostname stands in for a corporate/organizational
 * author, which all three style guides treat as valid).
 */
export function generateCitation(source: CitableSource, style: CitationStyle): string {
  const siteName = siteNameFromUrl(source.url);
  const title = (source.title || siteName).trim();
  const today = new Date();

  switch (style) {
    case "apa":
      // Title of page. (n.d.). Site Name. URL
      return `${ensureSentenceCase(title)}. (n.d.). ${siteName}. ${source.url}`;
    case "mla":
      // "Title of Page." Site Name, URL. Accessed Day Month Year.
      return `"${title}." ${siteName}, ${source.url}. Accessed ${formatDateMLA(today)}.`;
    case "chicago":
      // "Title of Page." Site Name. Accessed Month Day, Year. URL.
      return `"${title}." ${siteName}. Accessed ${formatDateChicago(today)}. ${source.url}.`;
  }
}

export function generateAllCitations(source: CitableSource): Record<CitationStyle, string> {
  return {
    apa: generateCitation(source, "apa"),
    mla: generateCitation(source, "mla"),
    chicago: generateCitation(source, "chicago"),
  };
}

function siteNameFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const base = hostname.split(".")[0];
    return base
      .split(/[-_]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  } catch {
    return url;
  }
}

function ensureSentenceCase(title: string): string {
  // APA titles are sentence-case; scraped page titles are usually already
  // title-case, so just make sure the first letter is capitalized without
  // otherwise rewriting the rest (rewriting title-case to true sentence
  // case would need knowing proper nouns, which we don't).
  return title.charAt(0).toUpperCase() + title.slice(1);
}

const MONTHS_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTHS_ABBR = [
  "Jan.",
  "Feb.",
  "Mar.",
  "Apr.",
  "May",
  "June",
  "July",
  "Aug.",
  "Sept.",
  "Oct.",
  "Nov.",
  "Dec.",
];

function formatDateMLA(date: Date): string {
  return `${date.getDate()} ${MONTHS_ABBR[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateChicago(date: Date): string {
  return `${MONTHS_FULL[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}
