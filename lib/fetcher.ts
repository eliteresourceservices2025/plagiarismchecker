import * as cheerio from "cheerio";
import type { SourceContent } from "./types";

const FETCH_TIMEOUT_MS = 6000;

const CONTENT_SELECTORS = [
  "article",
  "main",
  ".post-content",
  ".entry-content",
  ".article-content",
  ".article-body",
  "#content",
];

const STRIP_SELECTORS = [
  "nav",
  "header",
  "footer",
  "aside",
  "script",
  "script",
  "style",
  "noscript",
  "iframe",
  ".sidebar",
  ".advertisement",
  ".ad",
  ".ads",
  ".comments",
  ".related-posts",
];

/**
 * Fetches a page server-side and extracts clean article text, stripping
 * navigation/ads/etc. Fails gracefully (returns fetchFailed) on timeouts,
 * non-200s, or paywalls rather than throwing.
 */
export async function fetchSourceContent(url: string): Promise<SourceContent> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PlagCheckBot/1.0; +https://plagcheck.local)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { url, title: "", cleanText: "", fetchFailed: true };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      return { url, title: "", cleanText: "", fetchFailed: true };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const title = $("title").first().text().trim();

    STRIP_SELECTORS.forEach((sel) => $(sel).remove());

    let mainText = "";
    for (const sel of CONTENT_SELECTORS) {
      const el = $(sel).first();
      if (el.length && el.text().trim().length > 200) {
        mainText = el.text();
        break;
      }
    }

    if (!mainText) {
      mainText = $("body").text();
    }

    const cleanText = mainText.replace(/\s+/g, " ").trim();

    if (cleanText.length < 100) {
      return { url, title, cleanText: "", fetchFailed: true };
    }

    return { url, title, cleanText };
  } catch {
    return { url, title: "", cleanText: "", fetchFailed: true };
  }
}

export async function fetchAllSources(
  urls: { url: string; title: string }[]
): Promise<SourceContent[]> {
  const results = await Promise.all(urls.map((u) => fetchSourceContent(u.url)));
  // Prefer the search-result title when the page didn't provide one.
  return results.map((r, i) => ({
    ...r,
    title: r.title || urls[i].title,
  }));
}
