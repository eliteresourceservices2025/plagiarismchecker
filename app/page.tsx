"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Header from "@/components/Header";
import TextEditor from "@/components/TextEditor";
import ResultsPanel from "@/components/ResultsPanel";
import ProgressBar from "@/components/ProgressBar";
import SettingsPanel from "@/components/SettingsPanel";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { usePlagiarismCheck } from "@/hooks/usePlagiarismCheck";

export default function Home() {
  const [text, setText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [serperKey, setSerperKey] = useLocalStorage("plagcheck_serper_key", "");
  const [serpapiKey, setSerpapiKey] = useLocalStorage("plagcheck_serpapi_key", "");

  const { stage, result, error, runCheck, reset } = usePlagiarismCheck();

  const isChecking = stage === "analyzing" || stage === "searching" || stage === "comparing";

  async function handleCheck() {
    if (!text.trim()) {
      toast.error("Paste some text first.");
      return;
    }
    if (!serperKey && !serpapiKey) {
      toast.error("Add a Serper or SerpApi API key in Settings first.");
      setSettingsOpen(true);
      return;
    }

    await runCheck({ text, serperKey, serpapiKey });
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <Header onSettingsClick={() => setSettingsOpen(true)} />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 overflow-hidden p-4 sm:p-6">
        <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_360px]">
          <div className="flex min-h-0 flex-col">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your Text
            </h2>
            <TextEditor
              text={text}
              onChange={(t) => {
                setText(t);
                if (result) reset();
              }}
              sentences={result?.sentences}
            />
          </div>

          <div className="min-h-0 overflow-y-auto">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Originality Score
            </h2>
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            ) : (
              <ResultsPanel result={result} />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
          <ProgressBar stage={stage} />
          <div className="flex justify-center gap-3">
            {result && (
              <button
                onClick={() => reset()}
                className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Edit Text
              </button>
            )}
            <button
              onClick={handleCheck}
              disabled={isChecking}
              className="rounded-lg bg-slate-900 px-8 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isChecking ? "Checking..." : "Check for Plagiarism"}
            </button>
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
      />
    </div>
  );
}
