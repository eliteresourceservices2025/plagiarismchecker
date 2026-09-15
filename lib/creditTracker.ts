import type { CreditState, CreditSummary } from "./types";

const SERPER_TOTAL = 2500;
const SERPAPI_MONTHLY_LIMIT = 250;
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182;

export const ALERT_THRESHOLDS = [80, 90, 95, 100] as const;

export function defaultCreditState(): CreditState {
  const now = new Date();
  return {
    serper: { total: SERPER_TOTAL, used: 0, firstUsedAt: null, expiresAt: null },
    serpapi: {
      monthlyLimit: SERPAPI_MONTHLY_LIMIT,
      usedThisMonth: 0,
      currentMonth: monthKey(now),
      resetsOn: firstOfNextMonth(now).toISOString(),
    },
    lastUpdated: now.toISOString(),
  };
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function firstOfNextMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

/** Rolls the SerpApi monthly counter over if we've entered a new month since it was last touched. */
export function rolloverIfNeeded(state: CreditState): CreditState {
  const now = new Date();
  const currentMonth = monthKey(now);
  if (state.serpapi.currentMonth === currentMonth) return state;
  return {
    ...state,
    serpapi: {
      ...state.serpapi,
      usedThisMonth: 0,
      currentMonth,
      resetsOn: firstOfNextMonth(now).toISOString(),
    },
  };
}

export function recordUsage(
  state: CreditState,
  used: { serper: number; serpapi: number }
): CreditState {
  const now = new Date();
  let next = rolloverIfNeeded(state);

  if (used.serper > 0) {
    const firstUsedAt = next.serper.firstUsedAt ?? now.toISOString();
    const expiresAt =
      next.serper.expiresAt ?? new Date(now.getTime() + SIX_MONTHS_MS).toISOString();
    next = {
      ...next,
      serper: { ...next.serper, used: next.serper.used + used.serper, firstUsedAt, expiresAt },
    };
  }

  if (used.serpapi > 0) {
    next = {
      ...next,
      serpapi: { ...next.serpapi, usedThisMonth: next.serpapi.usedThisMonth + used.serpapi },
    };
  }

  return { ...next, lastUpdated: now.toISOString() };
}

/**
 * Directly overwrites the used-credit counts (unlike `recordUsage`, which
 * only increments). Since this is a per-browser LocalStorage estimate —
 * not a real read of the Serper/SerpApi account, which shared server-side
 * keys make especially easy to drift from — this lets someone periodically
 * correct it to match what the provider's own dashboard actually shows.
 */
export function syncUsage(
  state: CreditState,
  usage: { serperUsed?: number; serpapiUsedThisMonth?: number }
): CreditState {
  const now = new Date();
  let next = rolloverIfNeeded(state);

  if (usage.serperUsed !== undefined) {
    const clamped = Math.max(0, Math.round(usage.serperUsed));
    const firstUsedAt = next.serper.firstUsedAt ?? now.toISOString();
    const expiresAt =
      next.serper.expiresAt ?? new Date(now.getTime() + SIX_MONTHS_MS).toISOString();
    next = {
      ...next,
      serper: { ...next.serper, used: clamped, firstUsedAt, expiresAt },
    };
  }

  if (usage.serpapiUsedThisMonth !== undefined) {
    const clamped = Math.max(0, Math.round(usage.serpapiUsedThisMonth));
    next = { ...next, serpapi: { ...next.serpapi, usedThisMonth: clamped } };
  }

  return { ...next, lastUpdated: now.toISOString() };
}

export function resetMonthly(state: CreditState): CreditState {
  const now = new Date();
  return {
    ...state,
    serpapi: {
      ...state.serpapi,
      usedThisMonth: 0,
      currentMonth: monthKey(now),
      resetsOn: firstOfNextMonth(now).toISOString(),
    },
    lastUpdated: now.toISOString(),
  };
}

export function resetAll(): CreditState {
  return defaultCreditState();
}

export function summarize(state: CreditState): CreditSummary {
  const serperRemaining = Math.max(state.serper.total - state.serper.used, 0);
  const serperPercentUsed = clampPercent((state.serper.used / state.serper.total) * 100);
  const serpapiRemaining = Math.max(state.serpapi.monthlyLimit - state.serpapi.usedThisMonth, 0);
  const serpapiPercentUsed = clampPercent(
    (state.serpapi.usedThisMonth / state.serpapi.monthlyLimit) * 100
  );

  const serperExhausted = serperRemaining <= 0 && state.serper.used > 0;
  const serpapiExhausted = serpapiRemaining <= 0 && state.serpapi.usedThisMonth > 0;

  let daysUntilSerperExpiry: number | null = null;
  if (state.serper.expiresAt) {
    const diffMs = new Date(state.serper.expiresAt).getTime() - Date.now();
    daysUntilSerperExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  return {
    serperRemaining,
    serperPercentUsed,
    serpapiRemaining,
    serpapiPercentUsed,
    combinedRemaining: serperRemaining + serpapiRemaining,
    serperExhausted,
    serpapiExhausted,
    allExhausted: serperExhausted && serpapiExhausted,
    daysUntilSerperExpiry,
    serpapiResetsOn: state.serpapi.resetsOn,
  };
}

function clampPercent(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** Returns any alert thresholds crossed going from `prevPercent` to `nextPercent`, e.g. [80, 90]. */
export function crossedThresholds(prevPercent: number, nextPercent: number): number[] {
  return ALERT_THRESHOLDS.filter((t) => prevPercent < t && nextPercent >= t);
}

/** Highest severity level currently active for a given percent-used value. */
export function severityForPercent(percent: number): "ok" | "warning" | "urgent" | "depleted" {
  if (percent >= 100) return "depleted";
  if (percent >= 95) return "urgent";
  if (percent >= 90) return "warning";
  return "ok";
}
