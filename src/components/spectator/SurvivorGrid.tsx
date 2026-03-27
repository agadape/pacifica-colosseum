"use client";

import { motion, AnimatePresence } from "framer-motion";
import TraderCard from "./TraderCard";

interface Participant {
  id: string;
  subaccount_address: string;
  status: string;
  total_pnl_percent: number;
  max_drawdown_hit: number;
  total_trades: number;
  has_wide_zone: boolean;
  has_second_life: boolean;
  second_life_used: boolean;
}

interface SurvivorGridProps {
  participants: Participant[];
  maxDrawdown: number;
}

export default function SurvivorGrid({ participants, maxDrawdown }: SurvivorGridProps) {
  const sorted = [...participants].sort(
    (a, b) => (b.total_pnl_percent ?? 0) - (a.total_pnl_percent ?? 0)
  );

  return (
    <div>
      <h3 className="font-display text-sm font-700 text-text-primary mb-4">
        Survivors
        <span className="ml-2 text-text-tertiary font-normal">
          {sorted.filter((p) => p.status === "active").length} active
        </span>
      </h3>

      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <AnimatePresence>
          {sorted.map((p, i) => (
            <TraderCard
              key={p.id}
              rank={i + 1}
              address={p.subaccount_address ?? "???"}
              pnlPercent={p.total_pnl_percent ?? 0}
              drawdown={p.max_drawdown_hit ?? 0}
              maxDrawdown={maxDrawdown}
              trades={p.total_trades ?? 0}
              status={p.status}
              hasWideZone={p.has_wide_zone}
              hasSecondLife={p.has_second_life}
              secondLifeUsed={p.second_life_used}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
