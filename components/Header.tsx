"use client";

import { ScanSearch, Settings } from "lucide-react";

interface HeaderProps {
  onSettingsClick: () => void;
}

export default function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white shadow-sm shadow-brand/30">
          <ScanSearch size={18} strokeWidth={2.25} />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-slate-900">PlagCheck</span>
          <span className="hidden text-[11px] text-slate-400 sm:block">
            Originality checker for ERS content
          </span>
        </div>
      </div>
      <button
        onClick={onSettingsClick}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 active:scale-[0.97]"
      >
        <Settings size={16} />
        <span className="hidden sm:inline">Settings</span>
      </button>
    </header>
  );
}
