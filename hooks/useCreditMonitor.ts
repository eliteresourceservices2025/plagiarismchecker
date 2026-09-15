"use client";

import { useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import { useLocalStorage } from "./useLocalStorage";
import {
  crossedThresholds,
  defaultCreditState,
  recordUsage as recordUsageInState,
  resetAll as resetAllState,
  resetMonthly as resetMonthlyState,
  rolloverIfNeeded,
  summarize,
  syncUsage as syncUsageInState,
} from "@/lib/creditTracker";
import type { CreditState } from "@/lib/types";

const STORAGE_KEY = "plagcheck_credits";

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

export function useCreditMonitor() {
  const [state, setState, hydrated] = useLocalStorage<CreditState>(STORAGE_KEY, defaultCreditState());

  // Roll the SerpApi monthly counter over transparently if a new month started.
  const rolled = useMemo(() => rolloverIfNeeded(state), [state]);
  const summary = useMemo(() => summarize(rolled), [rolled]);

  const recordUsage = useCallback(
    (used: { serper: number; serpapi: number }) => {
      setState((prev) => {
        const before = summarize(rolloverIfNeeded(prev));
        const next = recordUsageInState(prev, used);
        const after = summarize(next);

        if (used.serper > 0) {
          for (const t of crossedThresholds(before.serperPercentUsed, after.serperPercentUsed)) {
            const { message, type } = messageFor("Serper", t, summary.combinedRemaining);
            fireToast(message, type);
          }
        }
        if (used.serpapi > 0) {
          for (const t of crossedThresholds(before.serpapiPercentUsed, after.serpapiPercentUsed)) {
            const { message, type } = messageFor("SerpApi", t, summary.combinedRemaining);
            fireToast(message, type);
          }
        }

        return next;
      });
    },
    [setState, summary.combinedRemaining]
  );

  const resetMonthly = useCallback(() => setState((prev) => resetMonthlyState(prev)), [setState]);
  const resetAll = useCallback(() => setState(() => resetAllState()), [setState]);
  const syncUsage = useCallback(
    (usage: { serperUsed?: number; serpapiUsedThisMonth?: number }) =>
      setState((prev) => syncUsageInState(prev, usage)),
    [setState]
  );

  return { state: rolled, summary, recordUsage, resetMonthly, resetAll, syncUsage, hydrated };
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
