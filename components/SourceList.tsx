"use client";

import { Link2 } from "lucide-react";
import type { SourceBreakdown } from "@/lib/types";

interface SourceListProps {
  sources: SourceBreakdown[];
}

export default function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-slate-500">No matching sources found — looks original!</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {sources.map((source) => (
        <li key={source.url}>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
          >
            <span className="flex items-center gap-1.5 min-w-0 text-slate-700">
              <Link2 size={14} className="shrink-0 text-slate-400" />
              <span className="truncate" title={source.title || source.url}>
                {formatHostname(source.url)}
              </span>
            </span>
            <span className="shrink-0 font-medium text-slate-500">
              {source.matchPercent.toFixed(1)}%
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function formatHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
