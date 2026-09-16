"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BatteryMedium, Bot, Info, KeyRound, ShieldCheck, Sparkles, X } from "lucide-react";
import CreditSettings from "./CreditSettings";
import { APP_VERSION, CHANGELOG } from "@/lib/changelog";
import type { CreditState, CreditSummary, PlagiarismEngine } from "@/lib/types";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  serperKey: string;
  serpapiKey: string;
  onSave: (keys: { serperKey: string; serpapiKey: string }) => void;
  excludeUrls: string;
  onSaveExcludeUrls: (value: string) => void;
  creditState: CreditState;
  creditSummary: CreditSummary;
  onResetMonthly: () => Promise<void>;
  onResetAllCredits: () => Promise<void>;
  onSyncUsage: (usage: {
    serperUsed?: number;
    serpapiUsedThisMonth?: number;
    winstonUsed?: number;
    winstonRemaining?: number;
  }) => Promise<void>;
  engine: PlagiarismEngine;
  onEngineChange: (engine: PlagiarismEngine) => void;
  detectAI: boolean;
  onDetectAIChange: (value: boolean) => void;
}

type Tab = "keys" | "usage" | "advanced" | "about";

export default function SettingsPanel({
  open,
  onClose,
  serperKey,
  serpapiKey,
  onSave,
  excludeUrls,
  onSaveExcludeUrls,
  creditState,
  creditSummary,
  onResetMonthly,
  onResetAllCredits,
  onSyncUsage,
  engine,
  onEngineChange,
  detectAI,
  onDetectAIChange,
}: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>("keys");
  const [localSerper, setLocalSerper] = useState(serperKey);
  const [localSerpapi, setLocalSerpapi] = useState(serpapiKey);
  const [localExclude, setLocalExclude] = useState(excludeUrls);

  // Re-sync local fields from the current saved values every time the panel
  // opens — never trust a stale mount-time snapshot, which is what let an
  // accidental early close save over real keys before LocalStorage hydration
  // had finished.
  useEffect(() => {
    if (open) {
      setLocalSerper(serperKey);
      setLocalSerpapi(serpapiKey);
      setLocalExclude(excludeUrls);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function handleSave() {
    onSave({ serperKey: localSerper.trim(), serpapiKey: localSerpapi.trim() });
    onSaveExcludeUrls(localExclude);
    onClose();
  }

  // Closing without an explicit Save (X button, backdrop click, Cancel)
  // discards any in-progress edits instead of silently persisting them.
  function handleDiscard() {
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] animate-fade-in"
      onClick={handleDiscard}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand">
              <KeyRound size={18} />
            </span>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Settings</h2>
          </div>
          <button
            onClick={handleDiscard}
            className="rounded-md p-1.5 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 dark:bg-slate-700 p-1 text-sm">
          <TabButton active={tab === "keys"} onClick={() => setTab("keys")} icon={<KeyRound size={14} />}>
            API Keys
          </TabButton>
          <TabButton
            active={tab === "usage"}
            onClick={() => setTab("usage")}
            icon={<BatteryMedium size={14} />}
          >
            Usage
          </TabButton>
          <TabButton
            active={tab === "advanced"}
            onClick={() => setTab("advanced")}
            icon={<Sparkles size={14} />}
          >
            Advanced
          </TabButton>
          <TabButton active={tab === "about"} onClick={() => setTab("about")} icon={<Info size={14} />}>
            About
          </TabButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
          {tab === "keys" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck size={28} className="shrink-0 text-brand" />
                <span>
                  The team&apos;s shared keys are already configured on the server —
                  you don&apos;t need to add anything here to use the app. Only fill
                  these in if you want to use your own personal key instead (e.g. the
                  shared pool ran low). Anything you enter here stays in this
                  browser&apos;s LocalStorage.
                </span>
              </div>
              <Field
                label="Serper.dev API key (optional)"
                hint="2,500 one-time free queries. Get one at serper.dev"
                value={localSerper}
                onChange={setLocalSerper}
              />
              <Field
                label="SerpApi API key (optional)"
                hint="250 free queries/month, recurring. Get one at serpapi.com"
                value={localSerpapi}
                onChange={setLocalSerpapi}
              />
            </div>
          )}

          {tab === "usage" && (
            <CreditSettings
              state={creditState}
              summary={creditSummary}
              onResetMonthly={onResetMonthly}
              onResetAll={onResetAllCredits}
              onSyncUsage={onSyncUsage}
            />
          )}

          {tab === "advanced" && (
            <div className="flex flex-col gap-5">
              {creditState.winstonKeyConfigured && (
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Plagiarism engine</span>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Web Search runs this app&apos;s own Serper/SerpApi pipeline (search, fetch,
                    compare). Winston AI sends your text straight to gowinston.ai, which does its
                    own web-match scan and returns a score and sources directly. Both runs them
                    together and shows both results — uses credits from both providers.
                  </p>
                  <div className="flex gap-2">
                    <EngineOption
                      active={engine === "web"}
                      label="Web Search"
                      sub="Serper / SerpApi"
                      onClick={() => onEngineChange("web")}
                    />
                    <EngineOption
                      active={engine === "winston"}
                      label="Winston AI"
                      sub="gowinston.ai"
                      onClick={() => onEngineChange("winston")}
                    />
                    <EngineOption
                      active={engine === "both"}
                      label="Both"
                      sub="Uses both credit pools"
                      onClick={() => onEngineChange("both")}
                    />
                  </div>

                  <label className="mt-1 flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={detectAI}
                      onChange={(e) => onDetectAIChange(e.target.checked)}
                      className="h-3.5 w-3.5 accent-brand"
                    />
                    <Bot size={14} className="shrink-0 text-slate-400 dark:text-slate-500" />
                    <span>
                      Also run AI-content detection on every check (uses Winston credits
                      separately from the plagiarism scan above).
                    </span>
                  </label>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Exclude URLs</span>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  One domain or URL per line. Matches from these sources are ignored — use this
                  for sites you own so republished content doesn&apos;t flag itself.
                </p>
                <textarea
                  value={localExclude}
                  onChange={(e) => setLocalExclude(e.target.value)}
                  placeholder={"yourblog.com\nanothersite.com/section"}
                  rows={5}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand-light"
                />
              </div>
            </div>
          )}

          {tab === "about" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">PlagCheck</span>
                <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand">
                  v{APP_VERSION}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  What&apos;s new
                </span>
                <ul className="flex flex-col gap-3">
                  {CHANGELOG.map((entry) => (
                    <li key={entry.version} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3">
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">v{entry.version}</span>
                        <span className="text-slate-400 dark:text-slate-500">
                          {new Date(entry.date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <ul className="flex flex-col gap-1">
                        {entry.notes.map((note, i) => (
                          <li key={i} className="text-xs text-slate-500 dark:text-slate-400">
                            • {note}
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
                This tool is exclusively for Elite Resource Services Internal Team.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={handleDiscard}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand/30 transition hover:bg-brand-hover active:scale-[0.98]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition ${
        active ? "bg-white dark:bg-slate-800 text-brand shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function EngineOption({
  active,
  label,
  sub,
  onClick,
}: {
  active: boolean;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-start gap-0.5 rounded-lg border px-3 py-2 text-left transition ${
        active
          ? "border-brand bg-brand-light text-brand"
          : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500"
      }`}
    >
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs opacity-70">{sub}</span>
    </button>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste your API key"
        className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand-light"
        autoComplete="off"
      />
      <span className="text-xs text-slate-400 dark:text-slate-500">{hint}</span>
    </label>
  );
}
