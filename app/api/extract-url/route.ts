import { NextRequest, NextResponse } from "next/server";
import { fetchSourceContent } from "@/lib/fetcher";

export const maxDuration = 20;

interface ExtractUrlBody {
  url: string;
}

/**
 * Fetches a blog/article URL server-side and extracts its clean text —
 * reuses the same extraction logic already used to fetch candidate source
 * pages for comparison (lib/fetcher.ts), just pointed at a URL the user
 * wants to check instead of one found via search.
 */
export async function POST(req: NextRequest) {
  let body: ExtractUrlBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "No URL provided" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid URL." }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Only http(s) URLs are supported." }, { status: 400 });
  }

  const content = await fetchSourceContent(parsed.toString());
  if (content.fetchFailed || !content.cleanText) {
    return NextResponse.json(
      { error: "Couldn't extract readable article text from that URL (timeout, blocked, or paywalled)." },
      { status: 400 }
    );
  }

  return NextResponse.json({ title: content.title, text: content.cleanText });
}
