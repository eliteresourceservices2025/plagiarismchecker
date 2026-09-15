"use client";

export interface DonutSegment {
  label: string;
  value: number; // 0-100, percent of whole
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  centerValue?: string;
  centerLabel?: string;
}

// Visual separation between adjacent slices — a thin surface-colored gap
// rather than a stroke, so slices read as distinct without adding
// non-data ink.
const GAP_DEGREES = 3;

/**
 * A part-to-whole donut chart with an always-present legend (never relies
 * on color alone) and direct percent labels on each legend row.
 */
export default function DonutChart({ segments, size = 160, centerValue, centerLabel }: DonutChartProps) {
  const strokeWidth = Math.round(size * 0.16);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const visible = segments.filter((s) => s.value > 0);
  const gapLength = visible.length > 1 ? (GAP_DEGREES / 360) * circumference : 0;

  const arcs = visible.reduce<{ label: string; value: number; color: string; length: number; offset: number }[]>(
    (acc, seg) => {
      const rawLength = (seg.value / 100) * circumference;
      const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].length + gapLength : 0;
      acc.push({ ...seg, length: Math.max(rawLength - gapLength, 0), offset });
      return acc;
    },
    []
  );

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.length} ${circumference - arc.length}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease" }}
            />
          ))}
        </svg>
        {(centerValue || centerLabel) && (
          <div className="absolute flex flex-col items-center">
            {centerValue && <span className="text-3xl font-bold text-slate-900">{centerValue}</span>}
            {centerLabel && <span className="text-xs text-slate-500">{centerLabel}</span>}
          </div>
        )}
      </div>

      <ul className="flex w-full flex-col gap-1.5 text-sm">
        {segments.map((seg) => (
          <li
            key={seg.label}
            className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50"
          >
            <span className="flex items-center gap-2 text-slate-600">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: seg.color }} />
              {seg.label}
            </span>
            <span className="font-medium text-slate-700">{seg.value.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
