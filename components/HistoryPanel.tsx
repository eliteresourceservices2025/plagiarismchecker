"use client";

import { History, Trash2, X } from "lucide-react";
import type { HistoryEntry } from "@/lib/types";

interface HistoryPanelProps {
  open: boolean;
  entries: HistoryEntry[];
  onClose: () => void;
  onClear: () => void;
  onRemove: (id: string) => void;
}

export default function HistoryPanel({ open, entries, onClose, onClear, onRemove }: HistoryPanelProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand">
              <History size={18} />
            </span>
            <h2 className="text-lg font-semibold text-slate-900">Check History</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close history"
          >
            <X size={18} />
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No checks yet — your recent checks will show up here.
          </p>
        ) : (
          <ul className="min-h-0 flex-1 overflow-y-auto -mr-1 pr-1">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="group flex items-start gap-3 rounded-lg px-2 py-2.5 transition hover:bg-slate-50"
              >
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: scoreBg(entry.originalityScore),
                    color: scoreColor(entry.originalityScore),
                  }}
                >
                  {Math.round(entry.originalityScore)}%
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-slate-700">{entry.preview || "(empty)"}</p>
                  <p className="text-xs text-slate-400">
                    {formatDate(entry.createdAt)} · {entry.totalWords} words · {entry.sourceCount}{" "}
                    source{entry.sourceCount === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(entry.id)}
                  className="shrink-0 rounded-md p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  aria-label="Remove entry"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {entries.length > 0 && (
          <button
            onClick={onClear}
            className="mt-4 self-start text-xs font-medium text-slate-400 hover:text-red-600"
          >
            Clear all history
          </button>
        )}
      </div>
    </div>
  );
}

function scoreBg(score: number): string {
  if (score >= 80) return "#DCFCE7";
  if (score >= 60) return "#FEF3C7";
  return "#FEE2E2";
}

function scoreColor(score: number): string {
  if (score >= 80) return "#16A34A";
  if (score >= 60) return "#B45309";
  return "#DC2626";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
