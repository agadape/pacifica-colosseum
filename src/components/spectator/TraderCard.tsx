"use client";

import { motion } from "framer-motion";
import DrawdownMeter from "@/components/shared/DrawdownMeter";
import StatusBadge from "@/components/shared/StatusBadge";

interface TraderCardProps {
  rank: number;
  address: string;
  pnlPercent: number;
  drawdown: number;
  maxDrawdown: number;
  trades: number;
  status: string;
  hasWideZone: boolean;
  hasSecondLife: boolean;
  secondLifeUsed: boolean;
}

export default function TraderCard({
  rank,
  address,
  pnlPercent,
  drawdown,
  maxDrawdown,
  trades,
  status,
  hasWideZone,
  hasSecondLife,
  secondLifeUsed,
}: TraderCardProps) {
  const isEliminated = status === "eliminated";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isEliminated ? 0.5 : 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`bg-surface rounded-xl border p-4 ${
        isEliminated ? "border-border-light" : "border-border-light hover:border-accent-primary/20"
      } transition-colors`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold text-text-tertiary">
            #{rank}
          </span>
          <span className={`font-mono text-sm ${isEliminated ? "text-text-tertiary line-through" : "text-text-primary"}`}>
            {address.slice(0, 4)}...{address.slice(-4)}
          </span>
        </div>
        <StatusBadge drawdown={drawdown} maxDrawdown={maxDrawdown} isEliminated={isEliminated} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className={`font-mono text-xl font-bold ${pnlPercent >= 0 ? "text-success" : "text-danger"}`}>
          {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
        </span>
        <span className="text-xs text-text-tertiary">
          {trades} trades
        </span>
      </div>

      <DrawdownMeter current={drawdown} max={maxDrawdown} />

      {(hasWideZone || hasSecondLife) && (
        <div className="flex gap-1.5 mt-3">
          {hasWideZone && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-primary/10 text-accent-primary">
              Wide Zone
            </span>
          )}
          {hasSecondLife && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              secondLifeUsed
                ? "bg-text-tertiary/10 text-text-tertiary line-through"
                : "bg-accent-gold/10 text-accent-gold"
            }`}>
              2nd Life {secondLifeUsed ? "✓" : ""}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
