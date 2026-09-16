"use client";

import { Download } from "lucide-react";
import { generatePdfReport } from "@/lib/pdfExport";
import type { CitationStyle } from "@/lib/citations";
import type { CheckResult, WinstonPlagiarismResult } from "@/lib/types";

interface ExportButtonProps {
  result?: CheckResult | null;
  winstonResult?: WinstonPlagiarismResult | null;
  citationStyle: CitationStyle;
}

export default function ExportButton({ result, winstonResult, citationStyle }: ExportButtonProps) {
  function handleExport() {
    const doc = generatePdfReport(result ?? null, winstonResult ?? null, citationStyle);
    const dateSlug = new Date().toISOString().slice(0, 10);
    doc.save(`plagcheck-report-${dateSlug}.pdf`);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-400 shadow-sm transition hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98]"
    >
      <Download size={15} />
      Export PDF
    </button>
  );
}
