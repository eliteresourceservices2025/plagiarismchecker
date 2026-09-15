import type { WinstonAIDetectionResult, WinstonPlagiarismResult } from "./types";

const API_BASE = "https://api.gowinston.ai/v2";

export class WinstonCreditError extends Error {}

function isCreditError(status: number, message: string): boolean {
  return status === 402 || status === 429 || /credit|quota|limit/i.test(message);
}

/**
 * Logs the full raw error response server-side (status + body — safe, none
 * of this can contain the API key) so a failure like a 403 can actually be
 * diagnosed from Vercel's function logs later, instead of only ever seeing
 * the generic message that goes to the client.
 */
async function throwForFailedResponse(path: string, res: Response): Promise<never> {
  const rawBody = await res.text();
  console.error(`Winston AI ${path} returned HTTP ${res.status}:`, rawBody || "(empty body)");

  let parsed: { message?: string } = {};
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    // non-JSON error body — message stays undefined, generic fallback used below
  }

  const message = parsed.message || `Winston ${path} API HTTP ${res.status}`;
  if (isCreditError(res.status, message)) throw new WinstonCreditError(message);
  throw new Error(message);
}

/**
 * fetch() itself can throw before a response is ever received — e.g. the
 * Authorization header being rejected as malformed. Those thrown errors can
 * echo the actual header value (i.e. the API key) back in their message, so
 * they must never be forwarded to the client as-is. Log the real cause
 * server-side only and surface a generic, safe message instead.
 */
async function postToWinston(path: string, apiKey: string, body: unknown): Promise<Response> {
  try {
    return await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error(`Winston AI request to ${path} failed before a response was received:`, err);
    throw new Error(
      "Couldn't reach Winston AI — check that WINSTON_API_KEY is set correctly (no extra whitespace or line breaks)."
    );
  }
}

interface RawPlagiarismSource {
  score: number;
  canAccess: boolean;
  url: string;
  title: string;
  plagiarismWords: number;
  identicalWordCounts: number;
  similarWordCounts: number;
  totalNumberOfWords: number;
  author: string | null;
  publishedDate: number | null;
  citation: boolean;
}

interface RawPlagiarismResponse {
  result: {
    score: number;
    textWordCounts: number;
    totalPlagiarismWords: number;
    identicalWordCounts: number;
    similarWordCounts: number;
  };
  sources: RawPlagiarismSource[];
  attackDetected: { zero_width_space: boolean; homoglyph_attack: boolean };
  credits_used: number;
  credits_remaining: number;
}

export async function checkPlagiarismWithWinston(
  text: string,
  apiKey: string,
  excludedSources: string[] = []
): Promise<WinstonPlagiarismResult> {
  const res = await postToWinston("/plagiarism", apiKey, {
    text,
    ...(excludedSources.length > 0 ? { excluded_sources: excludedSources } : {}),
  });

  if (!res.ok) await throwForFailedResponse("/plagiarism", res);
  const data = (await res.json()) as RawPlagiarismResponse;

  return {
    score: data.result.score,
    textWordCount: data.result.textWordCounts,
    totalPlagiarismWords: data.result.totalPlagiarismWords,
    identicalWordCount: data.result.identicalWordCounts,
    similarWordCount: data.result.similarWordCounts,
    sources: (data.sources ?? []).map((s) => ({
      url: s.url,
      title: s.title,
      score: s.score,
      plagiarismWords: s.plagiarismWords,
      identicalWordCounts: s.identicalWordCounts,
      similarWordCounts: s.similarWordCounts,
      totalNumberOfWords: s.totalNumberOfWords,
      author: s.author,
      publishedDate: s.publishedDate,
      citation: s.citation,
      canAccess: s.canAccess,
    })),
    attackDetected: {
      zeroWidthSpace: Boolean(data.attackDetected?.zero_width_space),
      homoglyphAttack: Boolean(data.attackDetected?.homoglyph_attack),
    },
    creditsUsed: data.credits_used,
    creditsRemaining: data.credits_remaining,
  };
}

interface RawAIDetectionResponse {
  score: number;
  sentences: { text: string; score: number }[];
  readability_score: number;
  credits_used: number;
  credits_remaining: number;
}

const MIN_AI_DETECTION_CHARS = 300;

export async function detectAIContent(text: string, apiKey: string): Promise<WinstonAIDetectionResult> {
  if (text.length < MIN_AI_DETECTION_CHARS) {
    throw new Error(
      `Text is too short for AI detection (needs at least ${MIN_AI_DETECTION_CHARS} characters).`
    );
  }

  const res = await postToWinston("/ai-content-detection", apiKey, { text, sentences: true });

  if (!res.ok) await throwForFailedResponse("/ai-content-detection", res);
  const data = (await res.json()) as RawAIDetectionResponse;

  return {
    score: data.score,
    sentences: (data.sentences ?? []).map((s) => ({ text: s.text, score: s.score })),
    readabilityScore: data.readability_score,
    creditsUsed: data.credits_used,
    creditsRemaining: data.credits_remaining,
  };
}
