"use client";

import { BatteryFull, BatteryLow, BatteryMedium, BatteryWarning } from "lucide-react";
import { severityForPercent } from "@/lib/creditTracker";
import type { CreditSummary } from "@/lib/types";

interface CreditGaugeProps {
  summary: CreditSummary;
  onClick: () => void;
}

const SEVERITY_STYLES = {
  ok: { icon: BatteryFull, className: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40" },
  warning: { icon: BatteryMedium, className: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40" },
  urgent: { icon: BatteryLow, className: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40" },
  depleted: { icon: BatteryWarning, className: "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40" },
} as const;

export default function CreditGauge({ summary, onClick }: CreditGaugeProps) {
  const worstPercent = Math.max(summary.serperPercentUsed, summary.serpapiPercentUsed);
  const severity = summary.allExhausted ? "depleted" : severityForPercent(worstPercent);
  const { icon: Icon, className } = SEVERITY_STYLES[severity];

  return (
    <button
      onClick={onClick}
      title={`${summary.combinedRemaining} search credits remaining`}
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition hover:brightness-95 active:scale-[0.97] ${className}`}
    >
      <Icon size={14} />
      <span>{summary.combinedRemaining}</span>
    </button>
  );
}
