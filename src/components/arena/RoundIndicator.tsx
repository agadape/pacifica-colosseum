"use client";

import { motion } from "framer-motion";
import Timer from "@/components/shared/Timer";

interface RoundIndicatorProps {
  roundName: string;
  roundNumber: number;
  maxLeverage: number;
  maxDrawdown: number;
  allowedPairs: string[];
  endsAt: string;
}

const roundColors: Record<number, { primary: string; glow: string }> = {
  1: { primary: "#00FF88", glow: "rgba(0,255,136,0.4)" },
  2: { primary: "#FF9500", glow: "rgba(255,149,0,0.4)" },
  3: { primary: "#FF6B35", glow: "rgba(255,107,53,0.5)" },
  4: { primary: "#FF3333", glow: "rgba(255,51,51,0.6)" },
};

export default function RoundIndicator({
  roundName,
  roundNumber,
  maxLeverage,
  maxDrawdown,
  allowedPairs,
  endsAt,
}: RoundIndicatorProps) {
  const colors = roundColors[roundNumber] ?? roundColors[1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-5 overflow-hidden"
      style={{ boxShadow: `0 0 20px ${colors.glow}20` }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${colors.primary}, ${colors.primary}80)`,
          boxShadow: `0 0 16px ${colors.glow}`,
        }}
      />

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-[0.2em] font-semibold mb-1">
            Round {roundNumber}
          </p>
          <h3
            className="font-display text-lg font-bold tracking-wide"
            style={{
              color: colors.primary,
              textShadow: `0 0 12px ${colors.glow}`,
            }}
          >
            {roundName}
          </h3>
        </div>
        <Timer targetDate={endsAt} label="ends" />
      </div>

      <div className="flex items-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-tertiary)] uppercase tracking-wider text-[10px]">Leverage</span>
          <span
            className="font-mono font-bold text-sm"
            style={{ color: colors.primary, textShadow: `0 0 8px ${colors.glow}` }}
          >
            {maxLeverage}x
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-tertiary)] uppercase tracking-wider text-[10px]">Drawdown</span>
          <span
            className="font-mono font-bold text-sm"
            style={{ color: "#FF3333", textShadow: "0 0 8px rgba(255,51,51,0.4)" }}
          >
            {maxDrawdown}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--color-text-tertiary)] uppercase tracking-wider text-[10px]">Pairs</span>
          <div className="flex gap-1">
            {allowedPairs.map((pair) => (
              <span
                key={pair}
                className="px-2 py-0.5 rounded text-[10px] font-bold font-mono"
                style={{
                  background: "rgba(0,240,255,0.1)",
                  color: "var(--color-neon-cyan)",
                  border: "1px solid rgba(0,240,255,0.2)",
                }}
              >
                {pair}
              </span>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-16 h-16 rounded-full opacity-5"
        style={{
          background: `radial-gradient(circle, ${colors.primary} 0%, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}
