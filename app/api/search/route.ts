import { NextRequest, NextResponse } from "next/server";
import { runSearchesWithCache } from "@/lib/searcher";
import { resolveKeys } from "@/lib/serverKeys";
import type { SearchBatchRequestBody, SearchBatchResponse } from "@/lib/types";

// Small, fast on its own — the client only ever sends a handful of queries
// per call (see BATCH_SIZE in hooks/usePlagiarismCheck.ts) so this stays
// well under Vercel's serverless timeout even on the free Hobby tier.
export const maxDuration = 25;

export async function POST(req: NextRequest) {
  let body: SearchBatchRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { queries, cachedResults } = body;
  const { serperKey, serpapiKey } = resolveKeys(body.serperKey, body.serpapiKey);

  if (!queries || queries.length === 0) {
    return NextResponse.json({ error: "No queries provided" }, { status: 400 });
  }

  if (!serperKey && !serpapiKey) {
    return NextResponse.json(
      {
        error:
          "No search API key configured. Ask an admin to set SERPER_API_KEY / SERPAPI_API_KEY, or add your own key in Settings.",
      },
      { status: 400 }
    );
  }

  const outcome = await runSearchesWithCache(queries, cachedResults ?? {}, {
    serperKey,
    serpapiKey,
  });

  const response: SearchBatchResponse = {
    results: outcome.results,
    freshResults: outcome.freshResults,
    queriesUsed: outcome.queriesUsed,
    cacheHits: outcome.cacheHits,
    errors: outcome.errors,
    exhausted: outcome.exhausted,
  };

  return NextResponse.json(response);
}
