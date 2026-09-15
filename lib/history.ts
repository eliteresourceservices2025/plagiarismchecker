import type { CheckResult, HistoryEntry } from "./types";

const MAX_ENTRIES = 20;

export function toHistoryEntry(text: string, result: CheckResult): HistoryEntry {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return {
    id,
    createdAt: new Date().toISOString(),
    preview: text.trim().slice(0, 120),
    originalityScore: result.originalityScore,
    totalWords: result.totalWords,
    sourceCount: result.sources.length,
  };
}

export function addEntry(history: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  return [entry, ...history].slice(0, MAX_ENTRIES);
}

export function removeEntry(history: HistoryEntry[], id: string): HistoryEntry[] {
  return history.filter((h) => h.id !== id);
}
