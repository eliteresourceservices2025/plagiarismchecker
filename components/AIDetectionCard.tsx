"use client";

import { useState } from "react";
import { Bot, ChevronDown, ChevronUp } from "lucide-react";
import type { WinstonAIDetectionResult } from "@/lib/types";

interface AIDetectionCardProps {
  result: WinstonAIDetectionResult;
}

/** Winston AI's "Human Score" — a feature this app has no equivalent of at
 * all (Serper/SerpApi only ever found web-sourced matches, never judged
 * whether text itself reads as AI-generated). Runs alongside either
 * plagiarism engine whenever a Winston key is configured. */
export default function AIDetectionCard({ result }: AIDetectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const aiLikelihood = Math.max(0, 100 - result.score);
  const tone = aiLikelihood >= 70 ? "red" : aiLikelihood >= 40 ? "amber" : "green";
  const toneClasses = {
    green: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900",
    amber: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900",
    red: "bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900",
  }[tone];

  const flaggedSentences = result.sentences.filter((s) => 100 - s.score >= 50);

  return (
    <div className={`flex flex-col gap-3 rounded-xl border p-4 shadow-sm ${toneClasses}`}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
          <Bot size={14} />
          AI Content Detection
        </h3>
        <span className="text-lg font-bold">{aiLikelihood.toFixed(0)}%</span>
      </div>
      <p className="text-xs">
        Estimated likelihood this text is AI-generated ({result.score.toFixed(0)}% human score,
        via Winston AI).
      </p>

      {flaggedSentences.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 self-start text-xs font-medium underline-offset-2 hover:underline"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {flaggedSentences.length} sentence{flaggedSentences.length === 1 ? "" : "s"} flagged as
            likely AI-generated
          </button>
          {expanded && (
            <ul className="flex flex-col gap-1">
              {flaggedSentences.map((s, i) => (
                <li key={i} className="rounded-lg bg-white/60 dark:bg-black/20 px-3 py-2 text-xs">
                  {s.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
