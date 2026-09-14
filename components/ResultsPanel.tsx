"use client";

import ScoreGauge from "./ScoreGauge";
import SourceList from "./SourceList";
import type { CheckResult } from "@/lib/types";

interface ResultsPanelProps {
  result: CheckResult | null;
}

export default function ResultsPanel({ result }: ResultsPanelProps) {
  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-400">
        <p className="text-sm">Your originality score and matched sources will appear here.</p>
      </div>
    );
  }

  const { breakdown } = result;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-6">
        <ScoreGauge score={result.originalityScore} />
        <div className="flex w-full flex-col gap-1.5 text-sm">
          <LegendRow color="#22C55E" label="Original" percent={breakdown.originalPercent} />
          <LegendRow color="#F59E0B" label="Paraphrased" percent={breakdown.paraphrasedPercent} />
          <LegendRow color="#EF4444" label="Matched" percent={breakdown.matchedPercent} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Matched Sources
        </h3>
        <SourceList sources={result.sources} />
      </div>

      <div className="flex flex-col gap-1 text-xs text-slate-400">
        <span>
          {result.totalWords} words · {result.sentenceCount} sentences · {result.sentencesChecked} searched
        </span>
        <span>
          Queries used — Serper: {result.queriesUsed.serper}, SerpApi: {result.queriesUsed.serpapi}
        </span>
      </div>

      {result.warnings.length > 0 && (
        <div className="rounded-md bg-amber-50 p-3 text-xs text-amber-700">
          {result.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function LegendRow({ color, label, percent }: { color: string; label: string; percent: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-slate-600">
        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-medium text-slate-700">{percent.toFixed(1)}%</span>
    </div>
  );
}
