"use client";

import { use, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useArena } from "@/hooks/use-arena";
import { useLeaderboard, useArenaEvents } from "@/hooks/use-leaderboard";
import { useArenaRealtime } from "@/hooks/use-arena-realtime";
import RoundIndicator from "@/components/arena/RoundIndicator";
import SurvivorGrid from "@/components/spectator/SurvivorGrid";
import ActivityFeed from "@/components/spectator/ActivityFeed";
import EliminationBanner from "@/components/spectator/EliminationBanner";
import VotePanel from "@/components/spectator/VotePanel";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function SpectatePage({
  params,
}: {
  params: Promise<{ arenaId: string }>;
}) {
  const { arenaId } = use(params);
  const { data: arenaData } = useArena(arenaId);
  const participants = useLeaderboard(arenaId);
  const { data: eventsData } = useArenaEvents(arenaId);
  useArenaRealtime(arenaId);

  const arena = arenaData?.data;
  const events = eventsData?.data ?? [];

  // Elimination banner state
  const [elimination, setElimination] = useState<{
    address: string;
    reason: string;
    equity: number;
  } | null>(null);

  const dismissElimination = useCallback(() => setElimination(null), []);

  const isCompleted = arena?.status === "completed";
  const winner = isCompleted
    ? (participants.data ?? []).find((p: Record<string, unknown>) => p.status === "winner") ??
      [...(participants.data ?? [])].sort(
        (a: Record<string, number>, b: Record<string, number>) => (b.total_pnl_percent ?? 0) - (a.total_pnl_percent ?? 0)
      )[0]
    : null;

  if (!arena) {
    return (
      <main className="min-h-screen pt-24 px-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const rounds = arena.rounds ?? [];
  const currentRound = rounds.find(
    (r: Record<string, unknown>) => r.round_number === arena.current_round
  );
  const leaderboard = participants.data ?? [];

  // Bottom 50% for voting eligibility
  const activeTraders = leaderboard.filter(
    (p: Record<string, unknown>) => p.status === "active"
  );
  const bottom50 = activeTraders.slice(Math.floor(activeTraders.length / 2));

  return (
    <main className="min-h-screen pt-20 px-4 md:px-6 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Elimination Banner */}
        {elimination && (
          <EliminationBanner
            traderAddress={elimination.address}
            reason={elimination.reason}
            equity={elimination.equity}
            onDismiss={dismissElimination}
          />
        )}

        {/* Winner Banner */}
        {isCompleted && winner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 rounded-2xl border border-accent-gold/30 bg-accent-gold/5 p-6 text-center"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-accent-gold mb-1">Arena Complete</p>
            <div className="text-4xl mb-2">👑</div>
            <h2 className="font-display text-2xl font-800 text-text-primary">
              {(winner as Record<string, unknown> & { users?: { username?: string | null } | null }).users?.username ??
                `${((winner as Record<string, unknown>).subaccount_address as string)?.slice(0, 8) ?? "Winner"}`}
            </h2>
            <p className="text-accent-gold font-mono text-lg font-bold mt-1">
              {((winner as Record<string, unknown>).total_pnl_percent as number) >= 0 ? "+" : ""}
              {((winner as Record<string, unknown>).total_pnl_percent as number)?.toFixed(2)}% PnL
            </p>
          </motion.div>
        )}

        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs uppercase tracking-[0.3em] text-text-tertiary">
              {isCompleted ? "Results" : "Live"}
            </span>
            {!isCompleted && (
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-accent-primary inline-block"
              />
            )}
          </div>
          <h1 className="font-display text-3xl font-800 tracking-tight text-text-primary">
            {arena.name}
          </h1>
        </motion.div>

        {/* Round info */}
        {currentRound && (
          <div className="mb-6">
            <RoundIndicator
              roundName={currentRound.name}
              roundNumber={currentRound.round_number}
              maxLeverage={currentRound.max_leverage}
              maxDrawdown={currentRound.max_drawdown_percent}
              allowedPairs={currentRound.allowed_pairs}
              endsAt={currentRound.ends_at}
            />
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Survivor Grid (2/3) */}
          <div className="lg:col-span-2">
            <SurvivorGrid
              participants={leaderboard as never[]}
              maxDrawdown={currentRound?.max_drawdown_percent ?? 20}
            />
          </div>

          {/* Sidebar: Activity + Vote (1/3) */}
          <div className="space-y-4">
            <VotePanel
              arenaId={arenaId}
              roundNumber={arena.current_round}
              candidates={bottom50 as never[]}
              hasVoted={false}
              votingOpen={false}
            />
            <ActivityFeed events={events as never[]} />
          </div>
        </div>
      </div>
    </main>
  );
}
