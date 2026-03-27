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
  safe: { label: "SAFE", classes: "bg-success/10 text-success border-success/20" },
  caution: { label: "CAUTION", classes: "bg-warning/10 text-warning border-warning/20" },
  danger: { label: "DANGER", classes: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  critical: { label: "CRITICAL", classes: "bg-danger/10 text-danger border-danger/20 animate-pulse" },
  eliminated: { label: "ELIMINATED", classes: "bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20 line-through" },
};

export default function StatusBadge({ drawdown, maxDrawdown, isEliminated }: StatusBadgeProps) {
  const level = getLevel(drawdown, maxDrawdown, isEliminated);
  const { label, classes } = config[level];

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${classes}`}>
      {label}
    </span>
  );
}
