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

export default function RoundIndicator({
  roundName,
  roundNumber,
  maxLeverage,
  maxDrawdown,
  allowedPairs,
  endsAt,
}: RoundIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface rounded-2xl border border-border-light p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-text-tertiary uppercase tracking-wider">
            Round {roundNumber}
          </p>
          <h3 className="font-display text-lg font-700 text-text-primary">
            {roundName}
          </h3>
        </div>
        <Timer targetDate={endsAt} label="ends" />
      </div>

      <div className="flex items-center gap-4 text-xs text-text-secondary">
        <div className="flex items-center gap-1">
          <span className="text-text-tertiary">Leverage</span>
          <span className="font-mono font-semibold text-text-primary">{maxLeverage}x</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-text-tertiary">Drawdown</span>
          <span className="font-mono font-semibold text-danger">{maxDrawdown}%</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-text-tertiary">Pairs</span>
          <span className="font-mono font-semibold text-text-primary">
            {allowedPairs.join(", ")}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
