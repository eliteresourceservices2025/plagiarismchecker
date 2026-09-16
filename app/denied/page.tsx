"use client";

import { useRouter } from "next/navigation";
import { ShieldX } from "lucide-react";

export default function DeniedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center shadow-sm">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
          <ShieldX size={24} strokeWidth={2} />
        </span>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Access Denied</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This tool is for authorized ERS team members only. Contact your admin if you need access.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="mt-6 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98]"
        >
          Try another email
        </button>
      </div>
    </div>
  );
}
