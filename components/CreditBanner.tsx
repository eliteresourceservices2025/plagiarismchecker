"use client";

import type { ReactNode } from "react";
import { AlertTriangle, Ban, TriangleAlert } from "lucide-react";
import { severityForPercent } from "@/lib/creditTracker";
import type { CreditSummary } from "@/lib/types";

interface CreditBannerProps {
  summary: CreditSummary;
}

export default function CreditBanner({ summary }: CreditBannerProps) {
  if (summary.allExhausted) {
    return (
      <Banner tone="depleted" icon={<Ban size={16} />}>
        All free search credits are used up. SerpApi resets on{" "}
        {formatDate(summary.serpapiResetsOn)} — add a new key in Settings, or wait for the
        monthly reset.
      </Banner>
    );
  }

  const worstPercent = Math.max(summary.serperPercentUsed, summary.serpapiPercentUsed);
  const severity = severityForPercent(worstPercent);
  const provider = summary.serperPercentUsed >= summary.serpapiPercentUsed ? "Serper" : "SerpApi";

  if (severity === "urgent") {
    return (
      <Banner tone="urgent" icon={<TriangleAlert size={16} />}>
        Almost out — ~{summary.combinedRemaining} checks left on {provider}. It will
        auto-switch to the fallback provider once exhausted.
      </Banner>
    );
  }

  if (severity === "warning") {
    return (
      <Banner tone="warning" icon={<AlertTriangle size={16} />}>
        Low credits: ~{summary.combinedRemaining} checks remaining on {provider}.
      </Banner>
    );
  }

  return null;
}

function Banner({
  tone,
  icon,
  children,
}: {
  tone: "warning" | "urgent" | "depleted";
  icon: ReactNode;
  children: ReactNode;
}) {
  const toneClasses = {
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    urgent: "bg-red-50 text-red-800 border-red-200",
    depleted: "bg-red-100 text-red-900 border-red-300",
  }[tone];

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm animate-fade-in ${toneClasses}`}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}
