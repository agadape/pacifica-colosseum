"use client";

type StatusLevel = "safe" | "caution" | "danger" | "critical" | "eliminated";

interface StatusBadgeProps {
  drawdown: number;
  maxDrawdown: number;
  isEliminated?: boolean;
}

function getLevel(drawdown: number, maxDrawdown: number, isEliminated?: boolean): StatusLevel {
  if (isEliminated) return "eliminated";
  const ratio = maxDrawdown > 0 ? drawdown / maxDrawdown : 0;
  if (ratio < 0.5) return "safe";
  if (ratio < 0.75) return "caution";
  if (ratio < 0.9) return "danger";
  return "critical";
}

const config: Record<StatusLevel, { label: string; classes: string }> = {
  safe: { label: "SAFE", classes: "bg-success/10 text-success-dark border border-success/20" },
  caution: { label: "CAUTION", classes: "bg-amber-50 text-warning border border-warning/20" },
  danger: { label: "DANGER", classes: "bg-orange-50 text-orange-status border border-orange-500/20" },
  critical: { label: "CRITICAL", classes: "bg-red-50 text-danger border border-danger/20 animate-pulse" },
  eliminated: { label: "ELIMINATED", classes: "bg-gray-100 text-text-tertiary border border-gray-200 line-through" },
};

export default function StatusBadge({ drawdown, maxDrawdown, isEliminated }: StatusBadgeProps) {
  const level = getLevel(drawdown, maxDrawdown, isEliminated);
  const { label, classes } = config[level];

  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${classes}`}>
      {label}
    </span>
  );
}