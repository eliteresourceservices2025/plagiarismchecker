"use client";

import { Download } from "lucide-react";
import { generatePdfReport } from "@/lib/pdfExport";
import type { CitationStyle } from "@/lib/citations";
import type { CheckResult } from "@/lib/types";

interface ExportButtonProps {
  result: CheckResult;
  citationStyle: CitationStyle;
}

export default function ExportButton({ result, citationStyle }: ExportButtonProps) {
  function handleExport() {
    const doc = generatePdfReport(result, citationStyle);
    const dateSlug = new Date().toISOString().slice(0, 10);
    doc.save(`plagcheck-report-${dateSlug}.pdf`);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
    >
      <Download size={15} />
      Export PDF
    </button>
  );
}
