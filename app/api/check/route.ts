import { NextRequest, NextResponse } from "next/server";
import { tokenizeSentences } from "@/lib/tokenizer";
import { selectSearchQueries } from "@/lib/sampler";
import { runSearchesWithCache, rankTopUrls } from "@/lib/searcher";
import { resolveKeys } from "@/lib/serverKeys";
import { fetchAllSources } from "@/lib/fetcher";
import { findBestMatch, classify } from "@/lib/comparator";
import { computeScore } from "@/lib/scorer";
import type { CheckRequestBody, CheckResult, SearchProviderResult, SentenceMatch } from "@/lib/types";

// Kept generous for the legacy single-shot path (small texts / direct API
// callers). The normal client flow now pre-searches via /api/search in
// small batches and passes `searchResults` here, so this call only ranks
// URLs, fetches source pages, and compares — comfortably under 10s even on
// Vercel's Hobby tier. See README for the full chunked-request rationale.
export const maxDuration = 60;

const MIN_WORDS_TO_CHECK = 100;

export async function POST(req: NextRequest) {
  let body: CheckRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    text,
    excludeUrls,
    queries: clientQueries,
    cachedResults,
    searchResults: preGatheredResults,
  } = body;
  const { serperKey, serpapiKey } = resolveKeys(body.serperKey, body.serpapiKey);

  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const usingPreGatheredResults = Array.isArray(preGatheredResults);

  if (!usingPreGatheredResults && !serperKey && !serpapiKey) {
    return NextResponse.json(
      {
        error:
          "No search API key configured. Ask an admin to set SERPER_API_KEY / SERPAPI_API_KEY, or add your own key in Settings.",
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

  // Step 2 & 3: sampling + web search. Skipped entirely when the client
  // already gathered results itself via one or more /api/search batches —
  // that's the normal path and what keeps this request fast.
  let combinedResults: SearchProviderResult[];
  let queriesChecked: number;
  let queriesUsedThisCall = { serper: 0, serpapi: 0 };
  let cacheHitsThisCall = 0;
  let freshResultsThisCall: CheckResult["freshResults"] = [];
  let exhaustedThisCall = { serper: false, serpapi: false };

  if (usingPreGatheredResults) {
    combinedResults = preGatheredResults;
    queriesChecked = combinedResults.length;
  } else {
    const queries =
      clientQueries && clientQueries.length > 0 ? clientQueries : selectSearchQueries(sentences);
    const searchOutcome = await runSearchesWithCache(queries, cachedResults ?? {}, {
      serperKey,
      serpapiKey,
    });
    warnings.push(...searchOutcome.errors);
    if (searchOutcome.exhausted.serper && searchOutcome.exhausted.serpapi) {
      warnings.push("All configured search API credits appear to be depleted.");
    }
    combinedResults = searchOutcome.results;
    queriesChecked = queries.length;
    queriesUsedThisCall = searchOutcome.queriesUsed;
    cacheHitsThisCall = searchOutcome.cacheHits;
    freshResultsThisCall = searchOutcome.freshResults;
    exhaustedThisCall = searchOutcome.exhausted;
  }

  // Rank and dedupe top matching URLs across all queries.
  const topUrls = rankTopUrls(combinedResults, excludeUrls ?? [], 15);

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
    sentencesChecked: queriesChecked,
    breakdown: scoreSummary.breakdown,
    sentences: sentenceMatches,
    sources: scoreSummary.sources,
    // When the client pre-gathered results, these are all zero/empty here —
    // the client already has the real totals from its /api/search calls and
    // merges them in before recording credit usage / history.
    queriesUsed: queriesUsedThisCall,
    cacheHits: cacheHitsThisCall,
    freshResults: freshResultsThisCall,
    exhausted: exhaustedThisCall,
    warnings,
  };

  return NextResponse.json(result);
}
