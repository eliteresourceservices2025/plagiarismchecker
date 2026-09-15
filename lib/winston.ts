import type { WinstonAIDetectionResult, WinstonPlagiarismResult } from "./types";

const API_BASE = "https://api.gowinston.ai/v2";

export class WinstonCreditError extends Error {}

function isCreditError(status: number, message: string): boolean {
  return status === 402 || status === 429 || /credit|quota|limit/i.test(message);
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
  message?: string;
}

export async function checkPlagiarismWithWinston(
  text: string,
  apiKey: string,
  excludedSources: string[] = []
): Promise<WinstonPlagiarismResult> {
  const res = await fetch(`${API_BASE}/plagiarism`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      ...(excludedSources.length > 0 ? { excluded_sources: excludedSources } : {}),
    }),
  });

  const data = (await res.json().catch(() => ({}))) as RawPlagiarismResponse;

  if (!res.ok) {
    const message = data.message || `Winston plagiarism API HTTP ${res.status}`;
    if (isCreditError(res.status, message)) throw new WinstonCreditError(message);
    throw new Error(message);
  }

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
  message?: string;
}

const MIN_AI_DETECTION_CHARS = 300;

export async function detectAIContent(text: string, apiKey: string): Promise<WinstonAIDetectionResult> {
  if (text.length < MIN_AI_DETECTION_CHARS) {
    throw new Error(
      `Text is too short for AI detection (needs at least ${MIN_AI_DETECTION_CHARS} characters).`
    );
  }

  const res = await fetch(`${API_BASE}/ai-content-detection`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, sentences: true }),
  });

  const data = (await res.json().catch(() => ({}))) as RawAIDetectionResponse;

  if (!res.ok) {
    const message = data.message || `Winston AI detection API HTTP ${res.status}`;
    if (isCreditError(res.status, message)) throw new WinstonCreditError(message);
    throw new Error(message);
  }

  return {
    score: data.score,
    sentences: (data.sentences ?? []).map((s) => ({ text: s.text, score: s.score })),
    readabilityScore: data.readability_score,
    creditsUsed: data.credits_used,
    creditsRemaining: data.credits_remaining,
  };
}
