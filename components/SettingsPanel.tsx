"use client";

import { useState } from "react";
import { X } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          Your API keys are stored only in this browser&apos;s LocalStorage — they
          never touch our server except when proxied directly to the search
          provider for your own check.
        </p>

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
            className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({ serperKey: localSerper.trim(), serpapiKey: localSerpapi.trim() });
              onClose();
            }}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
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
        className="rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
        autoComplete="off"
      />
      <span className="text-xs text-slate-400">{hint}</span>
    </label>
  );
}
