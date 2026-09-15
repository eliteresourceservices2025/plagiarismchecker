import { NextRequest, NextResponse } from "next/server";
import { detectAIContent, WinstonCreditError } from "@/lib/winston";
import { recordWinstonUsage } from "@/lib/creditStore";
import { getServerWinstonKey } from "@/lib/serverKeys";

export const maxDuration = 30;

interface AIDetectRequestBody {
  text: string;
}

export async function POST(req: NextRequest) {
  let body: AIDetectRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { text } = body;

  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const apiKey = getServerWinstonKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Winston AI isn't configured. Ask an admin to set WINSTON_API_KEY." },
      { status: 400 }
    );
  }

  try {
    const result = await detectAIContent(text, apiKey);
    await recordWinstonUsage(result.creditsUsed, result.creditsRemaining);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof WinstonCreditError) {
      return NextResponse.json(
        { error: `Winston AI credits appear to be exhausted: ${err.message}` },
        { status: 402 }
      );
    }
    const message = err instanceof Error ? err.message : "AI content detection failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
