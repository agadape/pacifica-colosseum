"use client";

import { motion } from "framer-motion";
import DrawdownMeter from "@/components/shared/DrawdownMeter";
import StatusBadge from "@/components/shared/StatusBadge";

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80, h = 24;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 2) - 1}`)
    .join(" ");
  const isUp = data[data.length - 1] >= data[0];
  return (
    <svg width={w} height={h} className="opacity-60" style={{ overflow: "visible" }}>
      <polyline points={points} fill="none"
        stroke={isUp ? "#22C55E" : "#EF4444"} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface TraderCardProps {
  rank: number;
  address: string;
  displayName?: string;
  pnlPercent: number;
  drawdown: number;
  maxDrawdown: number;
  trades: number;
  status: string;
  hasWideZone: boolean;
  hasSecondLife: boolean;
  secondLifeUsed: boolean;
  sparklineData?: number[];
}

export default function TraderCard({
  rank,
  address,
  displayName,
  pnlPercent,
  drawdown,
  maxDrawdown,
  trades,
  status,
  hasWideZone,
  hasSecondLife,
  secondLifeUsed,
  sparklineData,
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
          ? "border-neon-gold/40 shadow-lg shadow-neon-gold/10"
          : isTop3
          ? "border-neon-cyan/20 shadow-md"
          : isEliminated
          ? "border-border"
          : "border-border hover:shadow-md hover:border-neon-cyan/20"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-sm font-bold ${
            rank === 1 ? "bg-neon-gold/10 text-neon-gold border border-neon-gold/30" :
            rank === 2 ? "bg-bg-tertiary text-text-secondary border border-border" :
            rank === 3 ? "bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/30" :
            "bg-bg-primary text-text-tertiary border border-border"
          }`}>
            {rank}
          </div>
          <div>
            <span className={`text-sm font-semibold ${isEliminated ? "text-text-tertiary line-through" : "text-text-primary"}`}>
              {displayName ?? `${address.slice(0, 6)}...${address.slice(-4)}`}
            </span>
            <p className="text-xs text-text-tertiary mt-0.5">{trades} trades</p>
          </div>
        </div>
        <StatusBadge drawdown={drawdown} maxDrawdown={maxDrawdown} isEliminated={isEliminated} />
      </div>

      <div className="flex items-end justify-between mb-4">
        <span className={`font-mono text-3xl font-bold tracking-tight ${
          isEliminated ? "text-text-tertiary" :
          pnlPercent >= 0 ? "text-neon-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.4)]" : "text-neon-magenta drop-shadow-[0_0_8px_rgba(255,0,110,0.4)]"
        }`}>
          {pnlPercent >= 0 ? "+" : ""}{pnlPercent.toFixed(2)}%
        </span>
        {sparklineData && sparklineData.length >= 2 && (
          <Sparkline data={sparklineData} />
        )}
      </div>

      <DrawdownMeter current={drawdown} max={maxDrawdown} />

      {(hasWideZone || hasSecondLife) && (
        <div className="flex gap-2 mt-4 flex-wrap">
          {hasWideZone && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="px-2.5 py-1 rounded-full text-xs font-semibold bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30">
              Wide Zone
            </motion.span>
          )}
          {hasSecondLife && (
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                secondLifeUsed
                  ? "bg-bg-primary text-text-tertiary border-border line-through"
                  : "bg-neon-gold/10 text-neon-gold border-neon-gold/30"
              }`}>
              2nd Life {secondLifeUsed ? "used" : ""}
            </motion.span>
          )}
        </div>
      )}

      {isWinner && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="absolute -top-3 -right-3 text-2xl drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]">
          👑
        </motion.div>
      )}
    </motion.div>
  );
}