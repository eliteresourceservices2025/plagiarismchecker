"use client";

import { Ban } from "lucide-react";
import type { CreditSummary } from "@/lib/types";

interface DepletedOverlayProps {
  summary: CreditSummary;
  onOpenSettings: () => void;
  onDismiss: () => void;
}

export default function DepletedOverlay({ summary, onOpenSettings, onDismiss }: DepletedOverlayProps) {
  const resetsOn = new Date(summary.serpapiResetsOn).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <Ban size={22} />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">All free credits used</h2>
        <p className="mt-2 text-sm text-slate-500">
          Both Serper and SerpApi are out of credits for now. SerpApi&apos;s free quota
          resets on <strong>{resetsOn}</strong>, or add a fresh key from a teammate&apos;s
          account in Settings.
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            onClick={onDismiss}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Dismiss
          </button>
          <button
            onClick={onOpenSettings}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand/30 hover:bg-brand-hover"
          >
            Open Settings
          </button>
        </div>
      </div>
    </div>
  );
}
