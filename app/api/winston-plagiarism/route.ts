import { NextRequest, NextResponse } from "next/server";
import { checkPlagiarismWithWinston, WinstonCreditError } from "@/lib/winston";
import { recordWinstonUsage } from "@/lib/creditStore";
import { getServerWinstonKey } from "@/lib/serverKeys";

// Winston does its own web-search-and-match server-side, so this is a
// single outbound call rather than this app's own multi-batch pipeline —
// no chunking needed.
export const maxDuration = 60;

const MIN_WORDS_TO_CHECK = 100;

interface WinstonCheckRequestBody {
  text: string;
  excludeUrls?: string[];
}

export async function POST(req: NextRequest) {
  let body: WinstonCheckRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text, excludeUrls } = body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount < MIN_WORDS_TO_CHECK) {
    return NextResponse.json(
      { error: `Text is very short (${wordCount} words). Add more text before checking.` },
      { status: 400 }
    );
  }

  const apiKey = getServerWinstonKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Winston AI isn't configured. Ask an admin to set WINSTON_API_KEY." },
      { status: 400 }
    );
  }

  try {
    const result = await checkPlagiarismWithWinston(text, apiKey, excludeUrls ?? []);
    await recordWinstonUsage(result.creditsUsed, result.creditsRemaining);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof WinstonCreditError) {
      return NextResponse.json(
        { error: `Winston AI credits appear to be exhausted: ${err.message}` },
        { status: 402 }
      );
    }
    const message = err instanceof Error ? err.message : "Winston plagiarism check failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
