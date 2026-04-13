"use client";

import { motion, AnimatePresence } from "framer-motion";
import TraderCard from "./TraderCard";
import { useEquitySnapshots, type EquitySnapshot } from "@/hooks/use-leaderboard";

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
  users?: { username: string | null; wallet_address: string } | null;
}

interface SurvivorGridProps {
  participants: Participant[];
  maxDrawdown: number;
  arenaId: string;
  currentRound: number;
}

export default function SurvivorGrid({ participants, maxDrawdown, arenaId, currentRound }: SurvivorGridProps) {
  const { data: snapshotsMap } = useEquitySnapshots(arenaId);

  const sorted = [...participants].sort(
    (a, b) => (b.total_pnl_percent ?? 0) - (a.total_pnl_percent ?? 0)
  );

  function getSparkline(participantId: string): number[] {
    if (!snapshotsMap) return [];
    const snaps = (snapshotsMap.get(participantId) ?? [])
      .filter((s: EquitySnapshot) => s.round_number === currentRound);
    if (snaps.length < 2) return [];
    const base = snaps[0].equity;
    return snaps.slice(-10).map((s: EquitySnapshot) => ((s.equity - base) / base) * 100);
  }

  return (
    <div>
      <h3 className="font-display text-sm font-bold text-text-primary mb-4">
        Survivors
        <span className="ml-2 text-text-tertiary font-normal text-sm">
          {sorted.filter((p) => p.status === "active").length} active
        </span>
      </h3>

      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <AnimatePresence>
          {sorted.map((p, i) => (
            <TraderCard
              key={p.id}
              rank={i + 1}
              address={p.subaccount_address ?? "???"}
              displayName={p.users?.username ?? undefined}
              pnlPercent={p.total_pnl_percent ?? 0}
              drawdown={p.max_drawdown_hit ?? 0}
              maxDrawdown={maxDrawdown}
              trades={p.total_trades ?? 0}
              status={p.status}
              hasWideZone={p.has_wide_zone}
              hasSecondLife={p.has_second_life}
              secondLifeUsed={p.second_life_used}
              sparklineData={getSparkline(p.id)}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}