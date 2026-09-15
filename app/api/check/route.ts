import { NextRequest, NextResponse } from "next/server";
import { tokenizeSentences } from "@/lib/tokenizer";
import { selectSearchQueries } from "@/lib/sampler";
import { runSearchesWithCache, rankTopUrls } from "@/lib/searcher";
import { fetchAllSources } from "@/lib/fetcher";
import { findBestMatch, classify } from "@/lib/comparator";
import { computeScore } from "@/lib/scorer";
import type { CheckRequestBody, CheckResult, SentenceMatch } from "@/lib/types";

export const maxDuration = 60; // seconds (no-op on Hobby plan's hard 10s cap; documented limitation)

const MIN_WORDS_TO_CHECK = 100;

export async function POST(req: NextRequest) {
  let body: CheckRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, serperKey, serpapiKey, excludeUrls, queries: clientQueries, cachedResults } = body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  if (!serperKey && !serpapiKey) {
    return NextResponse.json(
      {
        error:
          "No search API key configured. Add a Serper.dev or SerpApi key in Settings.",
      },
      { status: 400 }
    );
  }

  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount < MIN_WORDS_TO_CHECK) {
    return NextResponse.json(
      {
        error: `Text is very short (${wordCount} words). Checking isn't necessary for content this short — add more text or proceed anyway with a direct paste elsewhere.`,
      },
      { status: 400 }
    );
  }

  const warnings: string[] = [];

  // Step 1: preprocess into sentences.
  const sentences = tokenizeSentences(text);
  if (sentences.length === 0) {
    return NextResponse.json(
      { error: "Couldn't find any checkable sentences (all too short)." },
      { status: 400 }
    );
  }

  // Step 2: smart sampling — pick distinctive phrases to search. The client
  // pre-samples using the same shared logic so it can check its own
  // LocalStorage result cache first; fall back to sampling here if it didn't.
  const queries = clientQueries && clientQueries.length > 0 ? clientQueries : selectSearchQueries(sentences);

  // Step 3: web search (Serper primary, SerpApi fallback), skipping any
  // queries the client already has fresh cached results for.
  const searchOutcome = await runSearchesWithCache(queries, cachedResults ?? {}, {
    serperKey,
    serpapiKey,
  });
  warnings.push(...searchOutcome.errors);

  if (searchOutcome.exhausted.serper && searchOutcome.exhausted.serpapi) {
    warnings.push("All configured search API credits appear to be depleted.");
  }

  // Rank and dedupe top matching URLs across all queries.
  const topUrls = rankTopUrls(searchOutcome.results, excludeUrls ?? [], 15);

  // Step 4: fetch + clean source page content.
  const sources = topUrls.length > 0 ? await fetchAllSources(topUrls) : [];
  const failedFetches = sources.filter((s) => s.fetchFailed).length;
  if (failedFetches > 0) {
    warnings.push(`${failedFetches} source page(s) couldn't be fetched (timeout/blocked/paywall) and were skipped.`);
  }

  const sourceTitles = new Map(sources.map((s) => [s.url, s.title]));

  // Step 5: compare every sentence against fetched sources.
  const sentenceMatches: SentenceMatch[] = sentences.map((sentence) => {
    const best = findBestMatch(sentence, sources);
    const classification = classify(best.score);
    return {
      index: sentence.index,
      original: sentence.original,
      wordCount: sentence.wordCount,
      classification,
      score: Math.round(best.score * 10) / 10,
      sourceUrl: classification === "original" ? undefined : best.sourceUrl,
      sourceTitle: classification === "original" ? undefined : best.sourceTitle,
    };
  });

  // Step 6: originality score + per-source breakdown.
  const scoreSummary = computeScore(sentenceMatches, sourceTitles);

  const result: CheckResult = {
    originalityScore: scoreSummary.originalityScore,
    totalWords: scoreSummary.totalWords,
    sentenceCount: sentences.length,
    sentencesChecked: queries.length,
    breakdown: scoreSummary.breakdown,
    sentences: sentenceMatches,
    sources: scoreSummary.sources,
    queriesUsed: searchOutcome.queriesUsed,
    cacheHits: searchOutcome.cacheHits,
    freshResults: searchOutcome.freshResults,
    exhausted: searchOutcome.exhausted,
    warnings,
  };

  return NextResponse.json(result);
}
