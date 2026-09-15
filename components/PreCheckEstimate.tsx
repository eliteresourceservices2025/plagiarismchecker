"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { tokenizeSentences } from "@/lib/tokenizer";
import { selectSearchQueries } from "@/lib/sampler";
import type { CreditSummary } from "@/lib/types";

interface PreCheckEstimateProps {
  text: string;
  summary: CreditSummary;
}

export default function PreCheckEstimate({ text, summary }: PreCheckEstimateProps) {
  const estimate = useMemo(() => {
    if (!text.trim()) return 0;
    const sentences = tokenizeSentences(text);
    return selectSearchQueries(sentences).length;
  }, [text]);

  if (estimate === 0) return null;

  const primary = summary.serperExhausted ? "SerpApi" : "Serper";
  const primaryRemaining = summary.serperExhausted ? summary.serpapiRemaining : summary.serperRemaining;

  return (
    <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
      <Info size={12} />
      This check will use ~{estimate} credit{estimate === 1 ? "" : "s"} (fewer if some phrases
      are cached). You have {primaryRemaining} remaining on {primary}.
    </p>
  );
}
