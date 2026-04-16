"use client";

import { motion } from "framer-motion";

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

const config: Record<StatusLevel, { label: string; classes: string; glow: string; borderColor: string; bgColor: string }> = {
  safe: {
    label: "SAFE",
    classes: "text-[#5DD9A8]",
    glow: "rgba(93, 217, 168, 0.4)",
    borderColor: "rgba(93, 217, 168, 0.3)",
    bgColor: "rgba(93, 217, 168, 0.08)",
  },
  caution: {
    label: "CAUTION",
    classes: "text-[#E8A836]",
    glow: "rgba(232, 168, 54, 0.4)",
    borderColor: "rgba(232, 168, 54, 0.3)",
    bgColor: "rgba(232, 168, 54, 0.08)",
  },
  danger: {
    label: "DANGER",
    classes: "text-[#D97B4A]",
    glow: "rgba(217, 123, 74, 0.4)",
    borderColor: "rgba(217, 123, 74, 0.3)",
    bgColor: "rgba(217, 123, 74, 0.08)",
  },
  critical: {
    label: "CRITICAL",
    classes: "text-[#E85353]",
    glow: "rgba(232, 83, 83, 0.5)",
    borderColor: "rgba(232, 83, 83, 0.4)",
    bgColor: "rgba(232, 83, 83, 0.08)",
  },
  eliminated: {
    label: "ELIMINATED",
    classes: "text-[var(--color-text-tertiary)]",
    glow: "none",
    borderColor: "rgba(90,88,72,0.3)",
    bgColor: "rgba(90,88,72,0.06)",
  },
};

export default function StatusBadge({ drawdown, maxDrawdown, isEliminated }: StatusBadgeProps) {
  const level = getLevel(drawdown, maxDrawdown, isEliminated);
  const { label, glow, borderColor, bgColor } = config[level];

  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      className="inline-block px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border genshin-card"
      style={{
        background: bgColor,
        color: config[level].classes,
        borderColor,
        boxShadow: glow !== "none" ? `0 0 10px ${glow}, inset 0 0 6px ${bgColor}` : "none",
        fontFamily: "var(--font-display)",
        letterSpacing: "0.12em",
      }}
    >
      {label}
    </motion.span>
  );
}
