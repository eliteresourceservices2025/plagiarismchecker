"use client";

import { Loader2 } from "lucide-react";
import type { CheckStage } from "@/hooks/usePlagiarismCheck";

const STAGE_LABELS: Record<CheckStage, string> = {
  idle: "",
  analyzing: "Analyzing sentences...",
  searching: "Searching the web...",
  comparing: "Comparing sources...",
  done: "Done",
  error: "Something went wrong",
};

const STAGE_ORDER: CheckStage[] = ["analyzing", "searching", "comparing"];

interface ProgressBarProps {
  stage: CheckStage;
  searchProgress?: { completedBatches: number; totalBatches: number } | null;
}

export default function ProgressBar({ stage, searchProgress }: ProgressBarProps) {
  if (stage === "idle" || stage === "done" || stage === "error") return null;

  const currentIndex = STAGE_ORDER.indexOf(stage);
  const percent = ((currentIndex + 1) / STAGE_ORDER.length) * 100;

  const label =
    stage === "searching" && searchProgress && searchProgress.totalBatches > 0
      ? `Searching the web... (${searchProgress.completedBatches}/${searchProgress.totalBatches} batches)`
      : STAGE_LABELS[stage];

  return (
    <div className="flex flex-col gap-2 animate-fade-in">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand to-indigo-400 transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
        <Loader2 size={14} className="animate-spin text-brand" />
        {label}
      </p>
    </div>
  );
}
