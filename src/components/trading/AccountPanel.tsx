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
    <div className="bg-surface rounded-2xl border border-border-light p-5 space-y-4">
      <h3 className="font-display text-sm font-700 text-text-primary">Account</h3>

      {/* Equity */}
      <div>
        <p className="text-xs text-text-tertiary">Equity</p>
        <p className="font-mono text-2xl font-bold text-text-primary">
          ${equity.toFixed(2)}
        </p>
      </div>

      {/* Balance + uPnL */}
      <div className="flex gap-4">
        <div className="flex-1">
          <p className="text-xs text-text-tertiary">Balance</p>
          <p className="font-mono text-sm font-semibold text-text-primary">
            ${balance.toFixed(2)}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-xs text-text-tertiary">Unrealized PnL</p>
          <p className={`font-mono text-sm font-semibold ${unrealizedPnl >= 0 ? "text-success" : "text-danger"}`}>
            {unrealizedPnl >= 0 ? "+" : ""}${unrealizedPnl.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Drawdown Meter */}
      <DrawdownMeter current={drawdown} max={maxDrawdown} />

      {/* Loots */}
      {(hasWideZone || hasSecondLife) && (
        <div>
          <p className="text-xs text-text-tertiary mb-2">Active Loots</p>
          <div className="flex gap-2">
            {hasWideZone && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accent-primary/10 text-accent-primary border border-accent-primary/20"
              >
                Wide Zone +5%
              </motion.span>
            )}
            {hasSecondLife && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  secondLifeUsed
                    ? "bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20 line-through"
                    : "bg-accent-gold/10 text-accent-gold border-accent-gold/20"
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
