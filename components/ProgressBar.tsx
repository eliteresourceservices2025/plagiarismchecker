"use client";

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

export default function ProgressBar({ stage }: { stage: CheckStage }) {
  if (stage === "idle" || stage === "done" || stage === "error") return null;

  const currentIndex = STAGE_ORDER.indexOf(stage);
  const percent = ((currentIndex + 1) / STAGE_ORDER.length) * 100;

  return (
    <div className="flex flex-col gap-2">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-900 transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-sm text-slate-500">{STAGE_LABELS[stage]}</p>
    </div>
  );
}
