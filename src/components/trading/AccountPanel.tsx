"use client";

import { motion } from "framer-motion";
import DrawdownMeter from "@/components/shared/DrawdownMeter";

interface AccountPanelProps {
  equity: number;
  balance: number;
  unrealizedPnl: number;
  drawdown: number;
  maxDrawdown: number;
  hasWideZone: boolean;
  hasSecondLife: boolean;
  secondLifeUsed: boolean;
}

export default function AccountPanel({
  equity,
  balance,
  unrealizedPnl,
  drawdown,
  maxDrawdown,
  hasWideZone,
  hasSecondLife,
  secondLifeUsed,
}: AccountPanelProps) {
  return (
    <div className="bg-surface rounded-2xl border border-border p-5 space-y-5">
      <h3 className="font-display text-sm font-bold text-text-primary">Account</h3>

      <div>
        <p className="text-xs text-text-secondary mb-1">Equity</p>
        <p className="font-mono text-2xl font-bold text-text-primary">
          ${equity.toFixed(2)}
        </p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <p className="text-xs text-text-secondary mb-1">Balance</p>
          <p className="font-mono text-sm font-semibold text-text-primary">
            ${balance.toFixed(2)}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-text-secondary mb-1">Unrealized PnL</p>
          <p className={`font-mono text-sm font-semibold ${unrealizedPnl >= 0 ? "text-neon-cyan drop-shadow-[0_0_6px_rgba(0,240,255,0.5)]" : "text-neon-magenta drop-shadow-[0_0_6px_rgba(255,0,110,0.5)]"}`}>
            {unrealizedPnl >= 0 ? "+" : ""}${unrealizedPnl.toFixed(2)}
          </p>
        </div>
      </div>

      <DrawdownMeter current={drawdown} max={maxDrawdown} />

      {(hasWideZone || hasSecondLife) && (
        <div>
          <p className="text-xs text-text-secondary mb-2">Active Loots</p>
          <div className="flex gap-2 flex-wrap">
            {hasWideZone && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30"
              >
                Wide Zone +5%
              </motion.span>
            )}
            {hasSecondLife && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                  secondLifeUsed
                    ? "bg-bg-primary text-text-tertiary border-border line-through"
                    : "bg-neon-gold/10 text-neon-gold border-neon-gold/30"
                }`}
              >
                Second Life {secondLifeUsed ? "(Used)" : ""}
              </motion.span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}