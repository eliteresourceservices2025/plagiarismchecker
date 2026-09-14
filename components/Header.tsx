"use client";

import { Search, Settings } from "lucide-react";

interface HeaderProps {
  onSettingsClick: () => void;
}

export default function Header({ onSettingsClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2 font-semibold text-slate-900">
        <Search size={20} />
        <span>PlagCheck</span>
      </div>
      <button
        onClick={onSettingsClick}
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
      >
        <Settings size={16} />
        <span className="hidden sm:inline">Settings</span>
      </button>
    </header>
  );
}
