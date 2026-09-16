"use client";

import { Bot } from "lucide-react";

interface AIDetectionToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

/** A dashboard-level toggle for Winston's AI-content detection — previously
 * only reachable via Settings → Advanced, easy to miss. Only rendered when
 * a Winston key is configured server-side (checked by the caller). */
export default function AIDetectionToggle({ enabled, onChange }: AIDetectionToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      title="Also check whether this text reads as AI-generated"
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-[0.97] ${
        enabled
          ? "border-brand bg-brand-light text-brand"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
      }`}
    >
      <Bot size={14} />
      AI Detection
      <span
        className={`ml-0.5 flex h-4 w-7 items-center rounded-full p-0.5 transition-colors ${
          enabled ? "bg-brand" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`h-3 w-3 rounded-full bg-white dark:bg-slate-800 shadow-sm transition-transform ${
            enabled ? "translate-x-3" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
