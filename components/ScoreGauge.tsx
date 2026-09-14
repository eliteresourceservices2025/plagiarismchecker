"use client";

interface ScoreGaugeProps {
  score: number; // 0-100
  size?: number;
}

function colorForScore(score: number): string {
  if (score >= 80) return "#22C55E"; // green-500
  if (score >= 60) return "#F59E0B"; // amber-500
  return "#EF4444"; // red-500
}

export default function ScoreGauge({ score, size = 140 }: ScoreGaugeProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference * (1 - clamped / 100);
  const color = colorForScore(clamped);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth={10}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {Math.round(clamped)}%
        </span>
        <span className="text-xs text-slate-500">original</span>
      </div>
    </div>
  );
}
