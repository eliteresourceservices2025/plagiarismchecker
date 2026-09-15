"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ScanSearch, SquarePen } from "lucide-react";
import Header from "@/components/Header";
import TextEditor from "@/components/TextEditor";
import ResultsPanel from "@/components/ResultsPanel";
import ProgressBar from "@/components/ProgressBar";
import SettingsPanel from "@/components/SettingsPanel";
import CreditBanner from "@/components/CreditBanner";
import PreCheckEstimate from "@/components/PreCheckEstimate";
import DepletedOverlay from "@/components/DepletedOverlay";
import HistoryPanel from "@/components/HistoryPanel";
import ExportButton from "@/components/ExportButton";
import UploadButton from "@/components/UploadButton";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePlagiarismCheck } from "@/hooks/usePlagiarismCheck";
import { useCreditMonitor } from "@/hooks/useCreditMonitor";
import { addEntry, removeEntry, toHistoryEntry } from "@/lib/history";
import type { CitationStyle } from "@/lib/citations";
import type { HistoryEntry } from "@/lib/types";

export default function Home() {
  const [text, setText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showDepleted, setShowDepleted] = useState(false);

  const [serperKey, setSerperKey] = useLocalStorage("plagcheck_serper_key", "");
  const [serpapiKey, setSerpapiKey] = useLocalStorage("plagcheck_serpapi_key", "");
  const [excludeUrlsRaw, setExcludeUrlsRaw] = useLocalStorage("plagcheck_exclude_urls", "");
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>("plagcheck_history", []);
  const [citationStyle, setCitationStyle] = useLocalStorage<CitationStyle>("plagcheck_citation_style", "apa");

  const { stage, result, error, runCheck, reset, searchProgress } = usePlagiarismCheck();
  const credits = useCreditMonitor();

  const isChecking = stage === "analyzing" || stage === "searching" || stage === "comparing";
  const lastRecordedResult = useRef<string | null>(null);

  // Record credit usage + history exactly once per completed check.
  useEffect(() => {
    if (!result || stage !== "done") return;
    const marker = `${result.totalWords}-${result.originalityScore}-${result.queriesUsed.serper}-${result.queriesUsed.serpapi}`;
    if (lastRecordedResult.current === marker) return;
    lastRecordedResult.current = marker;

    credits.recordUsage(result.queriesUsed);
    setHistory((prev) => addEntry(prev, toHistoryEntry(text, result)));

    if (result.cacheHits > 0) {
      toast.success(`Saved ${result.cacheHits} credit${result.cacheHits === 1 ? "" : "s"} from cache`, {
        icon: "💾",
        duration: 3000,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, stage]);

  const excludeUrls = excludeUrlsRaw
    .split("\n")
    .map((u) => u.trim())
    .filter(Boolean);

  async function handleCheck() {
    if (!text.trim()) {
      toast.error("Paste some text first.");
      return;
    }
    // Local credit tracking is a per-browser estimate — with shared
    // server-side keys, the server is the authoritative source of truth, so
    // this is only a heads-up, not a hard block. The server still returns a
    // clear error if the shared key really is out of credits.
    if (credits.summary.allExhausted && !serperKey && !serpapiKey) {
      setShowDepleted(true);
      return;
    }

    await runCheck({ text, serperKey, serpapiKey, excludeUrls });
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header
        onSettingsClick={() => setSettingsOpen(true)}
        onHistoryClick={() => setHistoryOpen(true)}
        creditSummary={credits.summary}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6">
        <CreditBanner summary={credits.summary} />

        <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_360px] lg:gap-6">
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <SquarePen size={13} />
                Your Text
              </h2>
              {!result && (
                <UploadButton
                  onExtracted={(extracted) => {
                    setText(extracted);
                  }}
                />
              )}
            </div>
            <TextEditor
              text={text}
              onChange={(t) => {
                setText(t);
                if (result) reset();
              }}
              sentences={result?.sentences}
            />
          </div>

          <div className="flex min-h-0 flex-col">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <ScanSearch size={13} />
              Originality Score
            </h2>
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
                  {error}
                </div>
              ) : (
                <ResultsPanel
                  result={result}
                  citationStyle={citationStyle}
                  onCitationStyleChange={setCitationStyle}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 pt-4">
          <ProgressBar stage={stage} searchProgress={searchProgress} />
          {!isChecking && !result && <PreCheckEstimate text={text} summary={credits.summary} />}
          <div className="flex flex-wrap justify-center gap-3">
            {result && (
              <button
                onClick={() => reset()}
                className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
              >
                Edit Text
              </button>
            )}
            <button
              onClick={handleCheck}
              disabled={isChecking}
              className="rounded-lg bg-brand px-8 py-3 text-sm font-medium text-white shadow-sm shadow-brand/30 transition hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none active:scale-[0.98]"
            >
              {isChecking ? "Checking..." : "Check for Plagiarism"}
            </button>
            {result && <ExportButton result={result} citationStyle={citationStyle} />}
          </div>
        </div>
      </main>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        serperKey={serperKey}
        serpapiKey={serpapiKey}
        onSave={({ serperKey: sk, serpapiKey: spk }) => {
          setSerperKey(sk);
          setSerpapiKey(spk);
          toast.success("Settings saved");
        }}
        excludeUrls={excludeUrlsRaw}
        onSaveExcludeUrls={setExcludeUrlsRaw}
        creditState={credits.state}
        creditSummary={credits.summary}
        onResetMonthly={() => {
          credits.resetMonthly();
          toast.success("SerpApi counter reset");
        }}
        onResetAllCredits={() => {
          credits.resetAll();
          toast.success("All usage counters reset");
        }}
        onSyncUsage={credits.syncUsage}
      />

      <HistoryPanel
        open={historyOpen}
        entries={history}
        onClose={() => setHistoryOpen(false)}
        onClear={() => setHistory([])}
        onRemove={(id) => setHistory((prev) => removeEntry(prev, id))}
      />

      {showDepleted && (
        <DepletedOverlay
          summary={credits.summary}
          onOpenSettings={() => {
            setShowDepleted(false);
            setSettingsOpen(true);
          }}
          onDismiss={() => setShowDepleted(false)}
          onCheckAnyway={() => {
            setShowDepleted(false);
            runCheck({ text, serperKey, serpapiKey, excludeUrls });
          }}
        />
      )}
    </div>
  );
}
