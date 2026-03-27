"use client";

import { motion } from "framer-motion";

interface DrawdownMeterProps {
  current: number;
  max: number;
  className?: string;
}

export default function DrawdownMeter({ current, max, className = "" }: DrawdownMeterProps) {
  const ratio = max > 0 ? Math.min(current / max, 1.2) : 0;
  const percent = Math.min(ratio * 100, 100);

  let color: string;
  let bgColor: string;
  let pulse = false;

  if (ratio < 0.5) {
    color = "bg-success";
    bgColor = "bg-success/10";
  } else if (ratio < 0.75) {
    color = "bg-warning";
    bgColor = "bg-warning/10";
  } else if (ratio < 0.9) {
    color = "bg-orange-500";
    bgColor = "bg-orange-500/10";
  } else {
    color = "bg-danger";
    bgColor = "bg-danger/10";
    pulse = true;
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-text-tertiary">Drawdown</span>
        <span className="font-mono text-xs font-semibold text-text-primary">
          {current.toFixed(1)}% / {max}%
        </span>
      </div>
      <div className={`h-2 rounded-full ${bgColor} overflow-hidden`}>
        <motion.div
          className={`h-full rounded-full ${color} ${pulse ? "animate-pulse" : ""}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: "easeOut" as const }}
        />
      </div>
    </div>
  );
}
