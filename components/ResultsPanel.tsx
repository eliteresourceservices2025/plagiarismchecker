"use client";

import { FileSearch } from "lucide-react";
import DonutChart from "./DonutChart";
import SourceList from "./SourceList";
import QualityChecks from "./QualityChecks";
import WinstonResultCard from "./WinstonResultCard";
import AIDetectionCard from "./AIDetectionCard";
import { CITATION_STYLES, type CitationStyle } from "@/lib/citations";
import type { CheckResult, WinstonAIDetectionResult, WinstonPlagiarismResult } from "@/lib/types";

interface ResultsPanelProps {
  result: CheckResult | null;
  winstonResult?: WinstonPlagiarismResult | null;
  aiDetection?: WinstonAIDetectionResult | null;
  citationStyle: CitationStyle;
  onCitationStyleChange: (style: CitationStyle) => void;
}

export default function ResultsPanel({
  result,
  winstonResult,
  aiDetection,
  citationStyle,
  onCitationStyleChange,
}: ResultsPanelProps) {
  if (!result && !winstonResult) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-800/60 p-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-light text-brand">
          <FileSearch size={22} />
        </span>
        <p className="max-w-[220px] text-sm text-slate-500 dark:text-slate-400">
          Your originality score and matched sources will appear here.
        </p>
      </div>
    );
  }

  // Each engine has its own result shape (Winston does its own
  // web-search-and-match server-side, so its score/sources aren't computed
  // the same way as this app's own comparator) — shown as separate cards,
  // both at once when both engines ran, rather than forced together.
  const showBoth = Boolean(result && winstonResult);

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {aiDetection && <AIDetectionCard result={aiDetection} />}

      {winstonResult && (
        <div className="flex flex-col gap-2">
          {showBoth && (
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Winston AI
            </h3>
          )}
          <WinstonResultCard result={winstonResult} />
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-2">
          {showBoth && (
            <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Web Search
            </h3>
          )}
          <WebResult result={result} citationStyle={citationStyle} onCitationStyleChange={onCitationStyleChange} />
        </div>
      )}
    </div>
  );
}

function WebResult({
  result,
  citationStyle,
  onCitationStyleChange,
}: {
  result: CheckResult;
  citationStyle: CitationStyle;
  onCitationStyleChange: (style: CitationStyle) => void;
}) {
  const { breakdown } = result;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-sm">
        <DonutChart
          centerValue={`${Math.round(result.originalityScore)}%`}
          centerLabel="original"
          segments={[
            { label: "Original", value: breakdown.originalPercent, color: "#22C55E" },
            { label: "Paraphrased", value: breakdown.paraphrasedPercent, color: "#F59E0B" },
            { label: "Matched", value: breakdown.matchedPercent, color: "#EF4444" },
          ]}
        />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Matched Sources
          </h3>
          <div className="flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-700 p-0.5 text-xs">
            {CITATION_STYLES.map((s) => (
              <button
                key={s.value}
                onClick={() => onCitationStyleChange(s.value)}
                title={`Cite as ${s.label}`}
                className={`rounded px-2 py-0.5 font-medium transition ${
                  citationStyle === s.value
                    ? "bg-white dark:bg-slate-800 text-brand shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
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

      <div className="flex flex-col gap-1 px-1 text-xs text-slate-400 dark:text-slate-500">
        <span>
          {result.totalWords} words · {result.sentenceCount} sentences · {result.sentencesChecked} searched
        </span>
        <span>
          Queries used — Serper: {result.queriesUsed.serper}, SerpApi: {result.queriesUsed.serpapi}
        </span>
      </div>

      {result.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 text-xs text-amber-700 dark:text-amber-400">
          {result.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}
    </div>
  );
}
