"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RefreshCw, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { cacheSizeBytes, purgeExpired } from "@/lib/resultCache";
import type { CreditState, CreditSummary, ResultCache } from "@/lib/types";

const CACHE_STORAGE_KEY = "plagcheck_result_cache";
const MAX_CACHE_MB = 5;

interface CreditSettingsProps {
  state: CreditState;
  summary: CreditSummary;
  onResetMonthly: () => void;
  onResetAll: () => void;
  onSyncUsage: (usage: { serperUsed?: number; serpapiUsedThisMonth?: number }) => void;
}

export default function CreditSettings({
  state,
  summary,
  onResetMonthly,
  onResetAll,
  onSyncUsage,
}: CreditSettingsProps) {
  const [cacheMb, setCacheMb] = useState<number | null>(null);
  const [serperInput, setSerperInput] = useState(String(state.serper.used));
  const [serpapiInput, setSerpapiInput] = useState(String(state.serpapi.usedThisMonth));

  useEffect(() => {
    refreshCacheSize();
  }, []);

  useEffect(() => {
    setSerperInput(String(state.serper.used));
    setSerpapiInput(String(state.serpapi.usedThisMonth));
  }, [state.serper.used, state.serpapi.usedThisMonth]);

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

  function handleSync() {
    const serperUsed = Number(serperInput);
    const serpapiUsedThisMonth = Number(serpapiInput);

    if (Number.isNaN(serperUsed) || Number.isNaN(serpapiUsedThisMonth)) {
      toast.error("Enter valid numbers for both fields.");
      return;
    }

    onSyncUsage({ serperUsed, serpapiUsedThisMonth });
    toast.success("Usage synced");
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

      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-300 p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <RefreshCw size={12} />
          Sync with actual usage
        </div>
        <p className="text-xs text-slate-400">
          This gauge is tracked in this browser only — with a shared team key, real usage
          can drift from what's shown here. Paste the real numbers from Serper's/SerpApi's
          own dashboard to correct it.
        </p>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[11px] text-slate-500">Serper used</span>
              <input
                type="number"
                min={0}
                value={serperInput}
                onChange={(e) => setSerperInput(e.target.value)}
                className="w-full min-w-0 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-[11px] text-slate-500">SerpApi used this month</span>
              <input
                type="number"
                min={0}
                value={serpapiInput}
                onChange={(e) => setSerpapiInput(e.target.value)}
                className="w-full min-w-0 rounded-md border border-slate-200 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-light"
              />
            </label>
          </div>
          <button
            onClick={handleSync}
            className="w-full rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-brand/30 transition hover:bg-brand-hover"
          >
            Sync
          </button>
        </div>
      </div>

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
