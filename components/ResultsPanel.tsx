"use client";

import { FileSearch } from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import SourceList from "./SourceList";
import QualityChecks from "./QualityChecks";
import { CITATION_STYLES, type CitationStyle } from "@/lib/citations";
import type { CheckResult } from "@/lib/types";

interface ResultsPanelProps {
  result: CheckResult | null;
  citationStyle: CitationStyle;
  onCitationStyleChange: (style: CitationStyle) => void;
}

export default function ResultsPanel({ result, citationStyle, onCitationStyleChange }: ResultsPanelProps) {
  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand">
          <FileSearch size={22} />
        </span>
        <p className="max-w-[220px] text-sm text-slate-500">
          Your originality score and matched sources will appear here.
        </p>
      </div>
    );
  }

  const { breakdown } = result;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col items-center gap-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ScoreGauge score={result.originalityScore} />
        <div className="flex w-full flex-col gap-2 text-sm">
          <LegendRow color="#22C55E" label="Original" percent={breakdown.originalPercent} />
          <LegendRow color="#F59E0B" label="Paraphrased" percent={breakdown.paraphrasedPercent} />
          <LegendRow color="#EF4444" label="Matched" percent={breakdown.matchedPercent} />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Matched Sources
          </h3>
          <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5 text-xs">
            {CITATION_STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => onCitationStyleChange(s.value)}
                title={`Cite as ${s.label}`}
                className={`rounded px-2 py-0.5 font-medium transition ${
                  citationStyle === s.value
                    ? "bg-white text-brand shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <SourceList sources={result.sources} citationStyle={citationStyle} />
      </div>

      <QualityChecks result={result} />

      <div className="flex flex-col gap-1 px-1 text-xs text-slate-400">
        <span>
          {result.totalWords} words · {result.sentenceCount} sentences · {result.sentencesChecked} searched
        </span>
        <span>
          Queries used — Serper: {result.queriesUsed.serper}, SerpApi: {result.queriesUsed.serpapi}
        </span>
      </div>

      {result.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
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
    <div className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50">
      <span className="flex items-center gap-2 text-slate-600">
        <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className="font-medium text-slate-700">{percent.toFixed(1)}%</span>
    </div>
  );
}
