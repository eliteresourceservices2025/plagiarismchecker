"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { tokenizeSentences } from "@/lib/tokenizer";
import { selectSearchQueries } from "@/lib/sampler";
import type { CreditSummary, PlagiarismEngine } from "@/lib/types";

interface PreCheckEstimateProps {
  text: string;
  summary: CreditSummary;
  engine: PlagiarismEngine;
}

const WINSTON_CREDITS_PER_WORD = 2; // plagiarism scan only — see lib/winston.ts

export default function PreCheckEstimate({ text, summary, engine }: PreCheckEstimateProps) {
  const wordCount = useMemo(() => {
    const trimmed = text.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [text]);

  const searchEstimate = useMemo(() => {
    if (!text.trim()) return 0;
    const sentences = tokenizeSentences(text);
    return selectSearchQueries(sentences).length;
  }, [text]);

  if (wordCount === 0) return null;

  const runsWeb = engine === "web" || engine === "both";
  const runsWinston = engine === "winston" || engine === "both";

  const parts: string[] = [];

  if (runsWeb) {
    const primary = summary.serperExhausted ? "SerpApi" : "Serper";
    const primaryRemaining = summary.serperExhausted ? summary.serpapiRemaining : summary.serperRemaining;
    parts.push(
      `~${searchEstimate} credit${searchEstimate === 1 ? "" : "s"} on ${primary} (${primaryRemaining} remaining)`
    );
  }

  if (runsWinston) {
    const winstonEstimate = wordCount * WINSTON_CREDITS_PER_WORD;
    parts.push(
      `~${winstonEstimate} Winston credit${winstonEstimate === 1 ? "" : "s"}` +
        (summary.winstonRemaining !== null ? ` (${summary.winstonRemaining} remaining)` : "")
    );
  }

  return (
    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
      <Info size={12} />
      This check will use {parts.join(" + ")}
      {runsWeb ? " (fewer search credits if some phrases are cached)" : ""}.
    </p>
  );
}
