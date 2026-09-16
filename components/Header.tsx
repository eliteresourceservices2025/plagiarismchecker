"use client";

import { useRouter } from "next/navigation";
import { History, LogOut, Moon, ScanSearch, Settings, Sun } from "lucide-react";
import CreditGauge from "./CreditGauge";
import { useTheme } from "@/hooks/useTheme";
import type { CreditSummary } from "@/lib/types";

interface HeaderProps {
  onSettingsClick: () => void;
  onHistoryClick: () => void;
  creditSummary: CreditSummary;
}

export default function Header({ onSettingsClick, onHistoryClick, creditSummary }: HeaderProps) {
  const { theme, toggle } = useTheme();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 px-4 py-3 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white shadow-sm shadow-brand/30">
          <ScanSearch size={18} strokeWidth={2.25} />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="font-semibold text-slate-900 dark:text-slate-100">PlagCheck</span>
          <span className="hidden text-[11px] text-slate-400 dark:text-slate-500 sm:block">
            Originality checker for ERS content
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2">
        <CreditGauge summary={creditSummary} onClick={onSettingsClick} />
        <button
          onClick={toggle}
          className="flex items-center rounded-md p-2 text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.97]"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={onHistoryClick}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.97]"
        >
          <History size={16} />
          <span className="hidden sm:inline">History</span>
        </button>
        <button
          onClick={onSettingsClick}
          className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.97]"
        >
          <Settings size={16} />
          <span className="hidden sm:inline">Settings</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center rounded-md p-2 text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.97]"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
