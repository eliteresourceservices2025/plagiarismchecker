"use client";

import { Copy, Quote, Sparkles } from "lucide-react";
import type { CheckResult } from "@/lib/types";

interface QualityChecksProps {
  result: CheckResult;
}

/** Supplementary checks beyond the core web-originality score: missing
 * quotation marks on direct quotes, formatting/copy-paste tells, and
 * self-plagiarism against the user's own check history. */
export default function QualityChecks({ result }: QualityChecksProps) {
  const missingQuotesCount = result.sentences.filter((s) => s.missingQuotes).length;
  const hasFormatting = result.formattingWarnings.length > 0;
  const hasSelfMatches = result.selfMatches.length > 0;

  if (missingQuotesCount === 0 && !hasFormatting && !hasSelfMatches) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Additional Checks
      </h3>

      {missingQuotesCount > 0 && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <Quote size={14} className="mt-0.5 shrink-0" />
          <span>
            {missingQuotesCount} verbatim match{missingQuotesCount === 1 ? "" : "es"} in your
            draft {missingQuotesCount === 1 ? "isn't" : "aren't"} wrapped in quotation marks —
            they read as unattributed direct quotes even if a citation follows.
          </span>
        </div>
      )}

      {hasSelfMatches && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700">
            <Copy size={13} />
            Matches your own past checks
          </div>
          <ul className="flex flex-col gap-1">
            {dedupeByCheck(result.selfMatches).map((m) => (
              <li
                key={m.matchedCheckId}
                className="rounded-lg bg-purple-50 px-3 py-2 text-xs text-purple-700"
              >
                {m.count} sentence{m.count === 1 ? "" : "s"} match your check from{" "}
                {formatDate(m.matchedCheckDate)} ("{m.matchedPreview.slice(0, 60)}
                {m.matchedPreview.length > 60 ? "…" : ""}")
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasFormatting && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <Sparkles size={13} />
            Formatting anomalies
          </div>
          <ul className="flex flex-col gap-1">
            {result.formattingWarnings.map((w) => (
              <li key={w.type} className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {w.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function dedupeByCheck(
  selfMatches: CheckResult["selfMatches"]
): { matchedCheckId: string; matchedCheckDate: string; matchedPreview: string; count: number }[] {
  const byCheck = new Map<
    string,
    { matchedCheckId: string; matchedCheckDate: string; matchedPreview: string; count: number }
  >();

  for (const m of selfMatches) {
    const existing = byCheck.get(m.matchedCheckId);
    if (existing) {
      existing.count++;
    } else {
      byCheck.set(m.matchedCheckId, {
        matchedCheckId: m.matchedCheckId,
        matchedCheckDate: m.matchedCheckDate,
        matchedPreview: m.matchedPreview,
        count: 1,
      });
    }
  }

  return Array.from(byCheck.values());
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}
