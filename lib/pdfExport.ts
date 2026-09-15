import jsPDF from "jspdf";
import { generateCitation, type CitationStyle } from "./citations";
import type { CheckResult } from "./types";

const MARGIN = 48;

/**
 * Builds the PDF report described in the plan: header, score summary,
 * per-source breakdown, ready-to-paste citations, full text with
 * color-coded sentences, and a disclaimer footer on every page.
 */
export function generatePdfReport(result: CheckResult, citationStyle: CitationStyle): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;
  let y = MARGIN;

  const ensureSpace = (lineHeight: number) => {
    if (y + lineHeight > pageHeight - MARGIN - 20) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // --- Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("Plagiarism Check Report", MARGIN, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  const dateStr = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Generated: ${dateStr}  ·  Tool: PlagCheck by ERS`, MARGIN, y);
  y += 20;

  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 24;

  // --- Score summary ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`Originality Score: ${result.originalityScore}%`, MARGIN, y);
  y += 14;

  const [r, g, b] = scoreColor(result.originalityScore);
  doc.setFillColor(226, 232, 240);
  doc.roundedRect(MARGIN, y, contentWidth, 8, 4, 4, "F");
  doc.setFillColor(r, g, b);
  doc.roundedRect(MARGIN, y, (contentWidth * Math.min(result.originalityScore, 100)) / 100, 8, 4, 4, "F");
  y += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  const summaryLines = [
    `Total words: ${result.totalWords}`,
    `Sentences checked: ${result.sentenceCount} (${result.sentencesChecked} searched)`,
    `Original: ${result.breakdown.originalPercent}%   Paraphrased: ${result.breakdown.paraphrasedPercent}%   Matched: ${result.breakdown.matchedPercent}%`,
  ];
  for (const line of summaryLines) {
    ensureSpace(14);
    doc.text(line, MARGIN, y);
    y += 14;
  }
  y += 12;

  // --- Matched sources ---
  ensureSpace(20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("Matched Sources", MARGIN, y);
  y += 18;

  if (result.sources.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(22, 163, 74);
    ensureSpace(16);
    doc.text("No matching sources found — looks original.", MARGIN, y);
    y += 20;
  } else {
    doc.setFontSize(9.5);
    result.sources.forEach((s, i) => {
      ensureSpace(28);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const label = doc.splitTextToSize(`${i + 1}. ${s.title || s.url}`, contentWidth - 70)[0];
      doc.text(label, MARGIN, y);
      doc.setTextColor(148, 163, 184);
      doc.text(`${s.matchPercent.toFixed(1)}%`, pageWidth - MARGIN - 40, y);
      y += 13;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(truncate(s.url, 90), MARGIN, y);
      doc.setFontSize(9.5);
      y += 15;
    });
  }
  y += 10;

  // --- Citations ---
  if (result.sources.length > 0) {
    ensureSpace(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Citations (${citationStyle.toUpperCase()})`, MARGIN, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    result.sources.forEach((s) => {
      const citation = generateCitation(s, citationStyle);
      const wrapped = doc.splitTextToSize(citation, contentWidth);
      for (const line of wrapped) {
        ensureSpace(12);
        doc.text(line, MARGIN, y);
        y += 12;
      }
      y += 6;
    });
    y += 4;
  }

  // --- Additional checks: missing quotes, self-plagiarism, formatting ---
  const missingQuotesCount = result.sentences.filter((s) => s.missingQuotes).length;
  const selfMatchByCheck = groupSelfMatches(result.selfMatches);
  if (missingQuotesCount > 0 || selfMatchByCheck.length > 0 || result.formattingWarnings.length > 0) {
    ensureSpace(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("Additional Checks", MARGIN, y);
    y += 18;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);

    const items: string[] = [];
    if (missingQuotesCount > 0) {
      items.push(
        `${missingQuotesCount} verbatim match${missingQuotesCount === 1 ? "" : "es"} not wrapped in quotation marks (unattributed direct quotes).`
      );
    }
    for (const s of selfMatchByCheck) {
      items.push(
        `${s.count} sentence${s.count === 1 ? "" : "s"} match your own check from ${formatShortDate(s.date)}.`
      );
    }
    for (const w of result.formattingWarnings) {
      items.push(w.message);
    }

    doc.setTextColor(51, 65, 85);
    for (const item of items) {
      const wrapped = doc.splitTextToSize(`•  ${item}`, contentWidth);
      for (const line of wrapped) {
        ensureSpace(13);
        doc.text(line, MARGIN, y);
        y += 13;
      }
    }
    y += 8;
  }

  ensureSpace(20);
  doc.setDrawColor(226, 232, 240);
  doc.line(MARGIN, y, pageWidth - MARGIN, y);
  y += 22;

  // --- Full text with color-coded sentences ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  ensureSpace(18);
  doc.text("Detailed Results", MARGIN, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const lineHeight = 13;
  const selfMatchIndices = new Set(result.selfMatches.map((m) => m.index));
  for (const sentence of result.sentences) {
    const [cr, cg, cb] = selfMatchIndices.has(sentence.index)
      ? [147, 51, 234] // purple — self-match takes visual priority
      : classificationColor(sentence.classification);
    doc.setTextColor(cr, cg, cb);
    const suffix = sentence.missingQuotes ? "  [missing quotes]" : "";
    const wrapped = doc.splitTextToSize(sentence.original + suffix, contentWidth);
    for (const line of wrapped) {
      ensureSpace(lineHeight);
      doc.text(line, MARGIN, y);
      y += lineHeight;
    }
    y += 3;
  }

  // --- Footer on every page ---
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "This report was generated by PlagCheck. Results are indicative, not definitive.",
      MARGIN,
      pageHeight - 24
    );
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - MARGIN - 55, pageHeight - 24);
  }

  return doc;
}

function scoreColor(score: number): [number, number, number] {
  if (score >= 80) return [34, 197, 94];
  if (score >= 60) return [245, 158, 11];
  return [239, 68, 68];
}

function classificationColor(
  classification: CheckResult["sentences"][number]["classification"]
): [number, number, number] {
  if (classification === "matched") return [220, 38, 38];
  if (classification === "paraphrased") return [180, 83, 9];
  return [51, 65, 85];
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function groupSelfMatches(
  selfMatches: CheckResult["selfMatches"]
): { checkId: string; date: string; count: number }[] {
  const byCheck = new Map<string, { checkId: string; date: string; count: number }>();
  for (const m of selfMatches) {
    const existing = byCheck.get(m.matchedCheckId);
    if (existing) {
      existing.count++;
    } else {
      byCheck.set(m.matchedCheckId, { checkId: m.matchedCheckId, date: m.matchedCheckDate, count: 1 });
    }
  }
  return Array.from(byCheck.values());
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}
