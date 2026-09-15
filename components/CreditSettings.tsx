"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { cacheSizeBytes, purgeExpired } from "@/lib/resultCache";
import type { CreditState, CreditSummary, ResultCache } from "@/lib/types";

const CACHE_STORAGE_KEY = "plagcheck_result_cache";
const MAX_CACHE_MB = 5;

interface CreditSettingsProps {
  state: CreditState;
  summary: CreditSummary;
  onResetMonthly: () => void;
  onResetAll: () => void;
}

export default function CreditSettings({
  state,
  summary,
  onResetMonthly,
  onResetAll,
}: CreditSettingsProps) {
  const [cacheMb, setCacheMb] = useState<number | null>(null);

  useEffect(() => {
    refreshCacheSize();
  }, []);

  function refreshCacheSize() {
    try {
      const raw = window.localStorage.getItem(CACHE_STORAGE_KEY);
      const cache: ResultCache = raw ? JSON.parse(raw) : {};
      const { cache: purged } = purgeExpired(cache);
      window.localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(purged));
      setCacheMb(cacheSizeBytes(purged) / (1024 * 1024));
    } catch {
      setCacheMb(0);
    }
  }

  function clearCache() {
    try {
      window.localStorage.removeItem(CACHE_STORAGE_KEY);
      setCacheMb(0);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <UsageRow
        label="Serper.dev"
        used={state.serper.used}
        total={state.serper.total}
        remaining={summary.serperRemaining}
        percent={summary.serperPercentUsed}
        footer={
          summary.daysUntilSerperExpiry !== null
            ? summary.daysUntilSerperExpiry <= 0
              ? "Credits expired"
              : `Expires in ${summary.daysUntilSerperExpiry} day${summary.daysUntilSerperExpiry === 1 ? "" : "s"}`
            : "One-time pool — not yet started"
        }
      />
      <UsageRow
        label="SerpApi"
        used={state.serpapi.usedThisMonth}
        total={state.serpapi.monthlyLimit}
        remaining={summary.serpapiRemaining}
        percent={summary.serpapiPercentUsed}
        footer={`Resets ${new Date(state.serpapi.resetsOn).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
        action={
          <button
            onClick={onResetMonthly}
            className="text-xs font-medium text-brand hover:underline"
          >
            Reset counter
          </button>
        }
      />

      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <span>
          Result cache: {cacheMb === null ? "…" : cacheMb.toFixed(2)} / {MAX_CACHE_MB} MB
        </span>
        <button
          onClick={clearCache}
          className="flex items-center gap-1 font-medium text-slate-500 hover:text-red-600"
        >
          <Trash2 size={12} />
          Clear cache
        </button>
      </div>

      <button
        onClick={onResetAll}
        className="self-start text-xs font-medium text-slate-400 hover:text-red-600"
      >
        Reset all usage counters
      </button>
    </div>
  );
}

function UsageRow({
  label,
  used,
  total,
  remaining,
  percent,
  footer,
  action,
}: {
  label: string;
  used: number;
  total: number;
  remaining: number;
  percent: number;
  footer: string;
  action?: ReactNode;
}) {
  const barColor = percent >= 95 ? "bg-red-500" : percent >= 80 ? "bg-amber-500" : "bg-brand";

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-slate-200 p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {used} / {total} used
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>
          {remaining} remaining · {footer}
        </span>
        {action}
      </div>
    </div>
  );
}
