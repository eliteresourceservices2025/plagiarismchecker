export const APP_VERSION = "1.4.0";

export interface ChangelogEntry {
  version: string;
  date: string; // "YYYY-MM-DD"
  notes: string[];
}

// Newest first. Bump APP_VERSION alongside adding an entry here.
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.4.0",
    date: "2026-09-16",
    notes: [
      "Added: email-allowlist login gate — the app now requires a sign-in from an approved ERS team email before use",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-09-15",
    notes: [
      "Fixed: Export PDF button not showing after a Winston-only check",
      "Added: AI Detection toggle on the dashboard (previously Settings-only)",
      "Added: Winston AI usage sync fields in Settings → Usage",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-09-15",
    notes: [
      "Added: donut-chart score breakdowns",
      "Restyled the app with Elite Resource Services brand colors and fonts",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-09-15",
    notes: [
      "Added: Winston AI as a selectable plagiarism engine, with a \"Both\" mode",
      "Added: AI-generated-content detection",
      "Added: shared Winston credit tracking",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-09-15",
    notes: [
      "Shared-key deployment, live Serper/SerpApi credit tracking, result caching, check history, quality checks, PDF export",
    ],
  },
];
