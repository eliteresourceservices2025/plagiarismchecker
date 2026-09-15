"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BatteryMedium, KeyRound, ShieldCheck, Sparkles, X } from "lucide-react";
import CreditSettings from "./CreditSettings";
import type { CreditState, CreditSummary } from "@/lib/types";

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
  onResetMonthly: () => void;
  onResetAllCredits: () => void;
}

type Tab = "keys" | "usage" | "advanced";

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
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-light text-brand">
              <KeyRound size={18} />
            </span>
            <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
          </div>
          <button
            onClick={handleDiscard}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
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
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {tab === "keys" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
                <ShieldCheck size={28} className="shrink-0 text-brand" />
                <span>
                  Your API keys are stored only in this browser&apos;s LocalStorage —
                  they never touch our server except when proxied directly to the
                  search provider for your own check.
                </span>
              </div>
              <Field
                label="Serper.dev API key"
                hint="2,500 one-time free queries. Get one at serper.dev"
                value={localSerper}
                onChange={setLocalSerper}
              />
              <Field
                label="SerpApi API key"
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
            />
          )}

          {tab === "advanced" && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Exclude URLs</span>
              <p className="text-xs text-slate-400">
                One domain or URL per line. Matches from these sources are ignored — use this
                for sites you own so republished content doesn&apos;t flag itself.
              </p>
              <textarea
                value={localExclude}
                onChange={(e) => setLocalExclude(e.target.value)}
                placeholder={"yourblog.com\nanothersite.com/section"}
                rows={5}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand-light"
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={handleDiscard}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
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
        active ? "bg-white text-brand shadow-sm" : "text-slate-500 hover:text-slate-700"
      }`}
    >
      {icon}
      {children}
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
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste your API key"
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition-shadow focus:border-brand focus:ring-2 focus:ring-brand-light"
        autoComplete="off"
      />
      <span className="text-xs text-slate-400">{hint}</span>
    </label>
  );
}
