// Per-browser fallback for Winston AI usage numbers when the shared Redis
// store (lib/creditStore.ts) isn't configured — Winston's own API response
// already tells us `credits_used`/`credits_remaining` on every call, so
// there's no reason to show a static "0 / 0" placeholder locally just
// because nothing's tracking it server-side yet. Not shared across
// browsers/devices — only lib/creditStore.ts (via Upstash Redis) gives the
// real shared numbers everyone sees the same way.

const STORAGE_KEY = "plagcheck_winston_local_credits";

export interface LocalWinstonCredits {
  used: number;
  remaining: number;
  lastUpdated: string;
}

export function readLocalWinstonCredits(): LocalWinstonCredits | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LocalWinstonCredits) : null;
  } catch {
    return null;
  }
}

export function recordLocalWinstonUsage(creditsUsed: number, creditsRemaining: number): void {
  try {
    const prev = readLocalWinstonCredits();
    const next: LocalWinstonCredits = {
      used: (prev?.used ?? 0) + creditsUsed,
      remaining: creditsRemaining,
      lastUpdated: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // storage full/unavailable — this is a best-effort display fallback only
  }
}
