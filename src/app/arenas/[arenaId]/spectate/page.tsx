"use client";

import { use, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useArena } from "@/hooks/use-arena";
import { useLeaderboard, useArenaEvents, useVoteStatus } from "@/hooks/use-leaderboard";
import { useArenaRealtime } from "@/hooks/use-arena-realtime";
import RoundIndicator from "@/components/arena/RoundIndicator";
import SurvivorGrid from "@/components/spectator/SurvivorGrid";
import ActivityFeed from "@/components/spectator/ActivityFeed";
import EliminationBanner from "@/components/spectator/EliminationBanner";
import VotePanel from "@/components/spectator/VotePanel";
import AvatarRow from "@/components/spectator/AvatarRow";
import EquityRaceChart from "@/components/spectator/EquityRaceChart";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// Elimination % per round per PROTOCOL.md
function getEliminationPercent(roundNumber: number): number {
  if (roundNumber === 1) return 30;
  if (roundNumber === 2) return 40;
  return 50;
}

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
  const currentRoundNumber = arena?.current_round ?? 1;

  const { data: voteData } = useVoteStatus(arenaId, currentRoundNumber);
  const hasVoted = voteData?.data?.hasVoted ?? false;
  const votedForId = voteData?.data?.votedForId ?? null;
  const tally = voteData?.data?.tally ?? {};
  const totalVotes = Object.values(tally).reduce((s, n) => s + n, 0);

  // Elimination banner state
  const [elimination, setElimination] = useState<{
    address: string;
    reason: string;
    equity: number;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const dismissElimination = useCallback(() => setElimination(null), []);

  const handleReset = useCallback(async () => {
    setIsResetting(true);
    await fetch("/api/demo/reset", { method: "POST" });
    setIsResetting(false);
    setResetDone(true);
  }, []);

  if (!arena) {
    return (
      <main className="min-h-screen pt-24 px-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const isCompleted = arena.status === "completed";
  const leaderboard = participants.data ?? [];

  const rounds = arena.rounds ?? [];
  const currentRound = rounds.find(
    (r: Record<string, unknown>) => r.round_number === currentRoundNumber
  );

  const winner = isCompleted
    ? leaderboard.find((p: Record<string, unknown>) => p.status === "winner") ??
      [...leaderboard].sort(
        (a: Record<string, number>, b: Record<string, number>) => (b.total_pnl_percent ?? 0) - (a.total_pnl_percent ?? 0)
      )[0]
    : null;

  // Bottom 50% active traders are eligible for Second Life vote
  const activeTraders = leaderboard.filter((p: Record<string, unknown>) => p.status === "active");
  const bottom50 = activeTraders.slice(Math.floor(activeTraders.length / 2));

  // Voting: open for the entire round (blitz rounds are 90s — no point limiting to last 5min)
  const roundEndsAt = currentRound?.ends_at ? new Date(currentRound.ends_at as string) : null;
  const now = Date.now();
  const isZombieArena = !isCompleted && roundEndsAt !== null && roundEndsAt.getTime() < now;
  const votingOpen = !isCompleted && !isZombieArena && roundEndsAt !== null && roundEndsAt.getTime() > now;

  const eliminationPercent = getEliminationPercent(currentRoundNumber);

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

        {/* Zombie Arena Banner */}
        {isZombieArena && !isCompleted && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-2xl border border-amber-300/40 bg-amber-50 px-5 py-4 flex items-center justify-between gap-4"
          >
            <div>
              <p className="text-sm font-semibold text-amber-800">Demo engine is offline</p>
              <p className="text-xs text-amber-700/70 mt-0.5">
                {resetDone
                  ? "Arena reset. Restart the Railway engine and a fresh arena will appear."
                  : "The arena timer ended but no new round started. Reset the demo arena to continue."}
              </p>
            </div>
            {!resetDone && (
              <button
                onClick={handleReset}
                disabled={isResetting}
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {isResetting ? "Resetting…" : "Reset Demo →"}
              </button>
            )}
          </motion.div>
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
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-5">
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
          <div className="flex items-end justify-between gap-6 flex-wrap">
            <h1 className="font-display text-3xl font-800 tracking-tight text-text-primary">
              {arena.name}
            </h1>
            <AvatarRow
              participants={leaderboard as never[]}
              maxDrawdown={currentRound?.max_drawdown_percent ?? 20}
            />
          </div>
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

        {/* Equity Race Chart */}
        {!isCompleted && leaderboard.length > 0 && (
          <div className="mb-6">
            <EquityRaceChart
              key={currentRoundNumber}
              arenaId={arenaId}
              participants={leaderboard as never[]}
              maxDrawdown={currentRound?.max_drawdown_percent ?? 20}
              currentRound={currentRoundNumber}
              eliminationPercent={eliminationPercent}
            />
          </div>
        )}

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SurvivorGrid
              participants={leaderboard as never[]}
              maxDrawdown={currentRound?.max_drawdown_percent ?? 20}
              arenaId={arenaId}
              currentRound={currentRoundNumber}
            />
          </div>

          <div className="space-y-4">
            <VotePanel
              arenaId={arenaId}
              roundNumber={currentRoundNumber}
              candidates={bottom50 as never[]}
              hasVoted={hasVoted}
              votedForId={votedForId}
              votingOpen={votingOpen}
              tally={tally}
              totalVotes={totalVotes}
            />
            <ActivityFeed events={events as never[]} />
          </div>
        </div>
      </div>
    </main>
  );
}
