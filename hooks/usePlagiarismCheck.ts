"use client";

import { useCallback, useState } from "react";
import type { CheckResult } from "@/lib/types";

export type CheckStage =
  | "idle"
  | "analyzing"
  | "searching"
  | "comparing"
  | "done"
  | "error";

interface RunCheckArgs {
  text: string;
  serperKey?: string;
  serpapiKey?: string;
  excludeUrls?: string[];
}

/**
 * Orchestrates a plagiarism check: calls /api/check and exposes a simple
 * staged progress state for the UI (the API itself runs synchronously, so
 * the "analyzing"/"searching"/"comparing" stages are a UX approximation of
 * elapsed time — see README for the streaming/chunked follow-up).
 */
export function usePlagiarismCheck() {
  const [stage, setStage] = useState<CheckStage>("idle");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = useCallback(async ({ text, serperKey, serpapiKey, excludeUrls }: RunCheckArgs) => {
    setError(null);
    setResult(null);
    setStage("analyzing");

    const searchingTimer = setTimeout(() => setStage("searching"), 600);
    const comparingTimer = setTimeout(() => setStage("comparing"), 3000);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, serperKey, serpapiKey, excludeUrls }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      setResult(data as CheckResult);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("error");
    } finally {
      clearTimeout(searchingTimer);
      clearTimeout(comparingTimer);
    }
  }, []);

  const reset = useCallback(() => {
    setStage("idle");
    setResult(null);
    setError(null);
  }, []);

  return { stage, result, error, runCheck, reset };
}
