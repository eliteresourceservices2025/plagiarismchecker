"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { crossedThresholds, summarize } from "@/lib/creditTracker";
import { readLocalWinstonCredits } from "@/lib/localWinstonCredits";
import type { CreditState } from "@/lib/types";

const EMPTY_STATE: CreditState = {
  configured: false,
  serper: { total: 2500, used: 0, firstUsedAt: null, expiresAt: null },
  serpapi: { usedThisMonth: 0, monthlyLimit: 250, currentMonth: "", resetsOn: new Date().toISOString() },
  winstonKeyConfigured: false,
  winston: { used: 0, remaining: null, lastUpdated: null },
  lastUpdated: new Date().toISOString(),
};

function messageFor(provider: "Serper" | "SerpApi", threshold: number, remaining: number): {
  message: string;
  type: "warning" | "urgent" | "info";
} {
  if (threshold >= 100) {
    return {
      type: "info",
      message: `${provider} credits used up. Falling back automatically. ${remaining} remaining overall.`,
    };
  }
  if (threshold >= 95) {
    return {
      type: "urgent",
      message: `Almost out — ~${remaining} checks left on ${provider}. It will auto-switch soon.`,
    };
  }
  if (threshold >= 90) {
    return { type: "warning", message: `Low credits: ~${remaining} checks remaining on ${provider}.` };
  }
  return { type: "warning", message: `Heads up — you have ~${remaining} checks left on ${provider}.` };
}

/**
 * Reads the shared, server-tracked credit state (Upstash Redis, via
 * /api/credits) — everyone sees the same real numbers, incremented by the
 * server itself when a search actually happens, not self-reported by each
 * browser. Falls back to a clean empty state if the fetch fails or the
 * store isn't configured yet; the app still works either way.
 */
export function useCreditMonitor() {
  const [state, setState] = useState<CreditState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const prevPercentsRef = useRef<{ serper: number; serpapi: number } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/credits", { cache: "no-store" });
      if (!res.ok) return;
      let data = (await res.json()) as CreditState;

      // No shared Redis store configured — the server can only ever report
      // used: 0, remaining: null for Winston. Fall back to this browser's
      // own record of Winston's last-known numbers (from its own API
      // responses) rather than showing a static "0 / 0" that's just wrong.
      if (!data.configured && data.winstonKeyConfigured) {
        const local = readLocalWinstonCredits();
        if (local) {
          data = { ...data, winston: { used: local.used, remaining: local.remaining, lastUpdated: local.lastUpdated } };
        }
      }

      const nextSummary = summarize(data);

      if (prevPercentsRef.current) {
        const { serper: prevSerper, serpapi: prevSerpapi } = prevPercentsRef.current;
        for (const t of crossedThresholds(prevSerper, nextSummary.serperPercentUsed)) {
          const { message, type } = messageFor("Serper", t, nextSummary.combinedRemaining);
          fireToast(message, type);
        }
        for (const t of crossedThresholds(prevSerpapi, nextSummary.serpapiPercentUsed)) {
          const { message, type } = messageFor("SerpApi", t, nextSummary.combinedRemaining);
          fireToast(message, type);
        }
      }
      prevPercentsRef.current = {
        serper: nextSummary.serperPercentUsed,
        serpapi: nextSummary.serpapiPercentUsed,
      };

      setState(data);
    } catch {
      // network hiccup — keep showing the last known state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const summary = useMemo(() => summarize(state), [state]);

  const syncUsage = useCallback(
    async (usage: { serperUsed?: number; serpapiUsedThisMonth?: number }) => {
      const res = await fetch("/api/credits/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(usage),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Sync failed");
      }
      await refresh();
    },
    [refresh]
  );

  const resetMonthly = useCallback(async () => {
    const res = await fetch("/api/credits/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetMonthly" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Reset failed");
    }
    await refresh();
  }, [refresh]);

  const resetAll = useCallback(async () => {
    const res = await fetch("/api/credits/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resetAll" }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Reset failed");
    }
    await refresh();
  }, [refresh]);

  return { state, summary, syncUsage, resetMonthly, resetAll, refresh, loading };
}

function fireToast(message: string, type: "warning" | "urgent" | "info") {
  if (type === "urgent") {
    toast.error(message, { icon: "🔴", duration: 6000 });
  } else if (type === "warning") {
    toast(message, { icon: "🟡", duration: 5000 });
  } else {
    toast(message, { icon: "⛔", duration: 6000 });
  }
}
