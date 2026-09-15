"use client";

import { useState } from "react";
import { KeyRound, ShieldCheck, X } from "lucide-react";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  serperKey: string;
  serpapiKey: string;
  onSave: (keys: { serperKey: string; serpapiKey: string }) => void;
}

export default function SettingsPanel({
  open,
  onClose,
  serperKey,
  serpapiKey,
  onSave,
}: SettingsPanelProps) {
  const [localSerper, setLocalSerper] = useState(serperKey);
  const [localSerpapi, setLocalSerpapi] = useState(serpapiKey);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
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
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <ShieldCheck size={28} className="shrink-0 text-brand" />
          <span>
            Your API keys are stored only in this browser&apos;s LocalStorage —
            they never touch our server except when proxied directly to the
            search provider for your own check.
          </span>
        </div>

        <div className="flex flex-col gap-4">
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

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({ serperKey: localSerper.trim(), serpapiKey: localSerpapi.trim() });
              onClose();
            }}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand/30 transition hover:bg-brand-hover active:scale-[0.98]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
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
