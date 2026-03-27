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
  const isWinner = status === "winner";
  const isTop3 = rank <= 3 && !isEliminated;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isEliminated ? 0.4 : 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`relative bg-surface rounded-2xl border p-5 transition-all ${
        isWinner
          ? "border-accent-gold/40 shadow-lg shadow-accent-gold/10"
          : isTop3
          ? "border-accent-primary/20 shadow-md"
          : isEliminated
          ? "border-border-light"
          : "border-border-light hover:border-accent-primary/20 hover:shadow-md"
      }`}
    >
      {/* Rank badge */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-sm font-bold ${
            rank === 1 ? "bg-accent-gold/10 text-accent-gold" :
            rank === 2 ? "bg-text-secondary/10 text-text-secondary" :
            rank === 3 ? "bg-orange-500/10 text-orange-500" :
            "bg-bg-primary text-text-tertiary"
          }`}>
            {rank}
          </div>
          <div>
            <span className={`font-mono text-sm font-medium ${isEliminated ? "text-text-tertiary line-through" : "text-text-primary"}`}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <p className="text-[10px] text-text-tertiary mt-0.5">{trades} trades</p>
          </div>
        </div>
        <StatusBadge drawdown={drawdown} maxDrawdown={maxDrawdown} isEliminated={isEliminated} />
      </div>

      {/* PnL */}
      <div className="mb-4">
        <span className={`font-mono text-3xl font-bold tracking-tight ${
          isEliminated ? "text-text-tertiary" :
          pnlPercent >= 0 ? "text-success" : "text-danger"
        }`}>
          {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
        </span>
      </div>

      <DrawdownMeter current={drawdown} max={maxDrawdown} />

      {(hasWideZone || hasSecondLife) && (
        <div className="flex gap-1.5 mt-4">
          {hasWideZone && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
              Wide Zone
            </motion.span>
          )}
          {hasSecondLife && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                secondLifeUsed ? "bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20 line-through"
                  : "bg-accent-gold/10 text-accent-gold border-accent-gold/20"
              }`}>
              2nd Life {secondLifeUsed ? "used" : ""}
            </motion.span>
          )}
        </div>
      )}

      {isWinner && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="absolute -top-3 -right-3 text-2xl">
          👑
        </motion.div>
      )}
    </motion.div>
  );
}
