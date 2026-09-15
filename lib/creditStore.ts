import { Redis } from "@upstash/redis";
import type { CreditState } from "./types";

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 182;
const SERPER_TOTAL_PER_KEY = 2500;
const SERPAPI_MONTHLY_LIMIT = 250;

let cachedClient: Redis | null | undefined; // undefined = not checked yet, null = not configured

/**
 * Reads Upstash's own env var names first, falling back to Vercel KV's
 * historical naming (same product, different install path can name things
 * differently) — whichever the Marketplace integration actually injected.
 */
function getRedis(): Redis | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  cachedClient = url && token ? new Redis({ url, token }) : null;
  return cachedClient;
}

export function isSharedCreditStoreConfigured(): boolean {
  return getRedis() !== null;
}

function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function firstOfNextMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

/**
 * Increments the shared, real usage counter at the moment a live
 * Serper/SerpApi call actually succeeds — see lib/searcher.ts. This is
 * what keeps the shared numbers accurate: nobody has to self-report.
 * Silently no-ops if the store isn't configured, and never throws — a
 * tracking hiccup must never break an actual search.
 */
export async function recordServerUsage(provider: "serper" | "serpapi"): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    if (provider === "serper") {
      await Promise.all([
        client.incr("credits:serper:used"),
        client.set("credits:serper:firstUsedAt", new Date().toISOString(), { nx: true }),
      ]);
    } else {
      await client.incr(`credits:serpapi:${currentMonthKey()}:used`);
    }
  } catch {
    // best-effort only
  }
}

/**
 * Reads the current shared state. `serperKeyCount` scales the displayed
 * total (2500 per configured SERPER_API_KEY[_2]) — usage itself is tracked
 * as one combined counter rather than per-key, since what matters to a
 * viewer is combined remaining capacity, not which specific key was hit.
 */
export async function getSharedCreditState(serperKeyCount: number): Promise<CreditState> {
  const client = getRedis();
  const monthKey = currentMonthKey();
  const now = new Date().toISOString();
  const serperTotal = Math.max(serperKeyCount, 1) * SERPER_TOTAL_PER_KEY;

  const empty: CreditState = {
    configured: client !== null,
    serper: { total: serperTotal, used: 0, firstUsedAt: null, expiresAt: null },
    serpapi: {
      usedThisMonth: 0,
      monthlyLimit: SERPAPI_MONTHLY_LIMIT,
      currentMonth: monthKey,
      resetsOn: firstOfNextMonth().toISOString(),
    },
    lastUpdated: now,
  };

  if (!client) return empty;

  try {
    const [serperUsed, firstUsedAt, serpapiUsed] = await Promise.all([
      client.get<number>("credits:serper:used"),
      client.get<string>("credits:serper:firstUsedAt"),
      client.get<number>(`credits:serpapi:${monthKey}:used`),
    ]);

    const expiresAt = firstUsedAt
      ? new Date(new Date(firstUsedAt).getTime() + SIX_MONTHS_MS).toISOString()
      : null;

    return {
      ...empty,
      serper: { total: serperTotal, used: serperUsed ?? 0, firstUsedAt: firstUsedAt ?? null, expiresAt },
      serpapi: { ...empty.serpapi, usedThisMonth: serpapiUsed ?? 0 },
    };
  } catch {
    return empty; // Redis hiccup — degrade to a clean empty state rather than error
  }
}

/** Admin correction: overwrite the shared counters to match a provider's own dashboard. */
export async function syncSharedUsage(usage: {
  serperUsed?: number;
  serpapiUsedThisMonth?: number;
}): Promise<void> {
  const client = getRedis();
  if (!client) {
    throw new Error("Shared credit tracking isn't configured (Upstash Redis env vars are missing).");
  }

  const ops: Promise<unknown>[] = [];
  if (usage.serperUsed !== undefined) {
    ops.push(client.set("credits:serper:used", Math.max(0, Math.round(usage.serperUsed))));
  }
  if (usage.serpapiUsedThisMonth !== undefined) {
    ops.push(
      client.set(`credits:serpapi:${currentMonthKey()}:used`, Math.max(0, Math.round(usage.serpapiUsedThisMonth)))
    );
  }
  await Promise.all(ops);
}

export async function resetSharedMonthly(): Promise<void> {
  const client = getRedis();
  if (!client) throw new Error("Shared credit tracking isn't configured.");
  await client.set(`credits:serpapi:${currentMonthKey()}:used`, 0);
}

export async function resetSharedAll(): Promise<void> {
  const client = getRedis();
  if (!client) throw new Error("Shared credit tracking isn't configured.");
  await Promise.all([
    client.del("credits:serper:used"),
    client.del("credits:serper:firstUsedAt"),
    client.del(`credits:serpapi:${currentMonthKey()}:used`),
  ]);
}
