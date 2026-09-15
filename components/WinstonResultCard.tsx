"use client";

import { ExternalLink, ShieldAlert } from "lucide-react";
import type { WinstonPlagiarismResult } from "@/lib/types";

interface WinstonResultCardProps {
  result: WinstonPlagiarismResult;
}

/** Winston AI's plagiarism result, shown as its own card rather than merged
 * into the sentence-by-sentence breakdown the Serper/SerpApi engine
 * produces — Winston does its own web-search-and-match server-side, so its
 * score/sources aren't computed the same way as this app's own comparator. */
export default function WinstonResultCard({ result }: WinstonResultCardProps) {
  const originality = Math.max(0, 100 - result.score);
  const hasAttack = result.attackDetected.zeroWidthSpace || result.attackDetected.homoglyphAttack;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Winston AI Plagiarism Score
        </span>
        <span className="text-4xl font-bold text-slate-900">{originality.toFixed(0)}%</span>
        <span className="text-xs text-slate-400">
          originality · {result.score.toFixed(1)}% flagged as plagiarized
        </span>
        <div className="grid w-full grid-cols-3 gap-2 pt-2 text-center text-xs">
          <Stat label="Words checked" value={result.textWordCount} />
          <Stat label="Identical words" value={result.identicalWordCount} />
          <Stat label="Similar words" value={result.similarWordCount} />
        </div>
      </div>

      {hasAttack && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <span>
            Winston detected a possible evasion attack in this text
            {result.attackDetected.zeroWidthSpace ? " (zero-width spaces)" : ""}
            {result.attackDetected.zeroWidthSpace && result.attackDetected.homoglyphAttack ? " and" : ""}
            {result.attackDetected.homoglyphAttack ? " (homoglyph substitution)" : ""}.
          </span>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Matched Sources ({result.sources.length})
        </h3>
        {result.sources.length === 0 ? (
          <p className="text-sm text-slate-400">No matching sources found.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {result.sources.map((s) => (
              <li key={s.url} className="rounded-lg border border-slate-100 p-3 text-xs">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-medium text-brand hover:underline"
                >
                  {s.title || s.url}
                  <ExternalLink size={11} className="shrink-0" />
                </a>
                <p className="mt-1 truncate text-slate-400">{s.url}</p>
                <p className="mt-1 text-slate-500">
                  {s.score.toFixed(1)}% match · {s.plagiarismWords} of {s.totalNumberOfWords} words
                  {s.citation ? " · cited" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 py-2">
      <div className="font-semibold text-slate-700">{value}</div>
      <div className="text-slate-400">{label}</div>
    </div>
  );
}
