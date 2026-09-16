"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ScanSearch } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || submitting) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
        return;
      }

      if (res.status === 401) {
        router.push("/denied");
        return;
      }

      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Something went wrong. Try again.");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white shadow-sm shadow-brand/30">
            <ScanSearch size={20} strokeWidth={2.25} />
          </span>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">PlagCheck</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in with your team email to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@gmail.com"
            className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-brand/30 transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]"
          >
            {submitting ? "Checking..." : "Continue"}
          </button>
        </form>
      </div>

      <p className="mt-5 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <Lock size={12} />
        Elite Resource Services team only
      </p>
    </div>
  );
}
