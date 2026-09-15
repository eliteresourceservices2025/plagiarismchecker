import type { CreditState, CreditSummary } from "./types";

export const ALERT_THRESHOLDS = [80, 90, 95, 100] as const;

/**
 * Pure display logic only — the actual counters live server-side now (see
 * lib/creditStore.ts), incremented by the server at the moment a real
 * search call succeeds. This module just turns a fetched CreditState into
 * the derived numbers the UI needs.
 */
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

  // Winston's "total" isn't a known constant like Serper/SerpApi — it's
  // derived from the latest authoritative `remaining` Winston itself
  // reported, plus everything used since tracking started.
  const winstonTotal =
    state.winston.remaining !== null ? state.winston.remaining + state.winston.used : null;
  const winstonPercentUsed =
    winstonTotal !== null && winstonTotal > 0 ? clampPercent((state.winston.used / winstonTotal) * 100) : null;
  const winstonExhausted = state.winston.remaining !== null && state.winston.remaining <= 0;

  return {
    configured: state.configured,
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
    winstonKeyConfigured: state.winstonKeyConfigured,
    winstonRemaining: state.winston.remaining,
    winstonPercentUsed,
    winstonExhausted,
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
