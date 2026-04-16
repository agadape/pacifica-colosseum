"use client";

import { use, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useArena, useCurrentUser } from "@/hooks/use-arena";
import { useLeaderboard, useArenaEvents, useVoteStatus } from "@/hooks/use-leaderboard";
import { useArenaRealtime } from "@/hooks/use-arena-realtime";
import RoundIndicator from "@/components/arena/RoundIndicator";
import SurvivorGrid from "@/components/spectator/SurvivorGrid";
import ActivityFeed from "@/components/spectator/ActivityFeed";
import EliminationBanner from "@/components/spectator/EliminationBanner";
import VotePanel from "@/components/spectator/VotePanel";
import AvatarRow from "@/components/spectator/AvatarRow";
import EquityRaceChart from "@/components/spectator/EquityRaceChart";
import TerritoryBoard from "@/components/TerritoryBoard";
import TerritoryDraftModal from "@/components/TerritoryDraftModal";
import { HazardBanner } from "@/components/HazardBanner";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

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
  const { data: userData } = useCurrentUser();
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

  useEffect(() => {
    if (!arena || arena.status === "completed" || resetDone) return;
    const endsAt = arena.current_round_ends_at
      ? new Date(arena.current_round_ends_at).getTime()
      : null;
    if (!endsAt || endsAt >= Date.now()) return;
    const t = setTimeout(() => handleReset(), 5000);
    return () => clearTimeout(t);
  }, [arena?.id, arena?.current_round_ends_at, resetDone, arena?.status, handleReset]);

  if (!arena) {
    return (
      <main className="min-h-screen pt-20 px-6 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 rounded-full border-2 border-[var(--color-neon-cyan)] border-t-transparent"
          style={{ boxShadow: "0 0 20px rgba(0,240,255,0.4)" }}
        />
      </main>
    );
  }

  const isCompleted = arena.status === "completed";
  const leaderboard = participants.data ?? [];

  const currentUserId = userData?.data?.id;
  const isParticipant = !isCompleted && currentUserId != null &&
    leaderboard.some((p: Record<string, unknown>) =>
      p.user_id === currentUserId && p.status === "active"
    );

  const myParticipant = currentUserId
    ? (leaderboard.find((p: Record<string, unknown>) => p.user_id === currentUserId) as Record<string, unknown> | undefined)
    : undefined;
  const myParticipantId = isParticipant ? (myParticipant?.id as string | undefined) ?? null : null;

  const nameMap = Object.fromEntries(
    leaderboard.map((p: Record<string, unknown>) => {
      const username = (p.users as { username?: string | null } | null)?.username;
      const shortAddr = (p.subaccount_address as string | undefined)?.slice(0, 8);
      return [p.id as string, username ?? shortAddr ?? "?"];
    })
  );

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

  const activeTraders = leaderboard.filter((p: Record<string, unknown>) => p.status === "active");
  const bottom50 = activeTraders.slice(Math.floor(activeTraders.length / 2));

  const roundEndsAt = currentRound?.ends_at ? new Date(currentRound.ends_at as string) : null;
  const now = Date.now();
  const isZombieArena = !isCompleted && roundEndsAt !== null && roundEndsAt.getTime() < now;
  const FIVE_MIN = 5 * 60 * 1000;
  const roundDurationMs = currentRound?.ends_at && currentRound?.starts_at
    ? new Date(currentRound.ends_at as string).getTime() - new Date(currentRound.starts_at as string).getTime()
    : FIVE_MIN + 1;
  const votingWindowStart = roundEndsAt !== null ? roundEndsAt.getTime() - Math.min(FIVE_MIN, roundDurationMs * 0.2) : null;
  const votingOpen = !isCompleted && !isZombieArena && votingWindowStart !== null && now >= votingWindowStart;

  const eliminationPercent = getEliminationPercent(currentRoundNumber);

  return (
    <>
      {!isCompleted && <HazardBanner arenaId={arenaId} />}

      {!isCompleted && (
        <TerritoryDraftModal
          events={events as Parameters<typeof TerritoryDraftModal>[0]["events"]}
          currentRound={currentRoundNumber}
          nameMap={nameMap}
        />
      )}

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

          {/* Zombie Banner */}
          {isZombieArena && !isCompleted && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-2xl border px-5 py-4 flex items-center justify-between gap-4"
              style={{
                background: "rgba(255,149,0,0.05)",
                borderColor: "rgba(255,149,0,0.3)",
              }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--color-warning)" }}>
                  Demo engine is offline
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {resetDone
                    ? "Arena reset. Restart the Railway engine and a fresh arena will appear."
                    : "The arena timer ended but no new round started. Reset the demo arena to continue."}
                </p>
              </div>
              {!resetDone && (
                <button
                  onClick={handleReset}
                  disabled={isResetting}
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  style={{
                    background: "var(--color-warning)",
                    color: "#07070D",
                    fontFamily: "var(--font-display)",
                  }}
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
              className="mb-6 rounded-2xl border p-6 text-center"
              style={{
                background: "rgba(255,215,0,0.05)",
                borderColor: "rgba(255,215,0,0.3)",
                boxShadow: "0 0 40px rgba(255,215,0,0.1)",
              }}
            >
              <p
                className="text-xs uppercase tracking-[0.3em] mb-2"
                style={{ color: "var(--color-neon-gold)", fontFamily: "var(--font-display)" }}
              >
                Arena Complete
              </p>
              <div className="text-4xl mb-2">👑</div>
              <h2
                className="font-display text-2xl font-black"
                style={{ color: "var(--color-text-primary)" }}
              >
                {(winner as Record<string, unknown> & { users?: { username?: string | null } | null }).users?.username ??
                  `${((winner as Record<string, unknown>).subaccount_address as string)?.slice(0, 8) ?? "Winner"}`}
              </h2>
              <p
                className="font-mono text-lg font-bold mt-1"
                style={{ color: "var(--color-neon-gold)", textShadow: "0 0 12px rgba(255,215,0,0.4)" }}
              >
                {((winner as Record<string, unknown>).total_pnl_percent as number) >= 0 ? "+" : ""}
                {((winner as Record<string, unknown>).total_pnl_percent as number)?.toFixed(2)}% PnL
              </p>
            </motion.div>
          )}

          {/* Header */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-5">
            <div className="flex items-center gap-3 mb-2">
              <span
                className="text-xs uppercase tracking-[0.3em] font-semibold"
                style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}
              >
                {isCompleted ? "Results" : "Live"}
              </span>
              {!isCompleted && (
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full"
                  style={{ background: "var(--color-neon-cyan)", boxShadow: "0 0 12px var(--color-neon-cyan)" }}
                />
              )}
            </div>
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <h1
                className="font-display text-3xl font-black tracking-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                {arena.name}
              </h1>
              <div className="flex items-center gap-4">
                {isParticipant && (
                  <Link href={`/arenas/${arenaId}/trade`}>
                    <motion.span
                      whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(0,240,255,0.5)" }}
                      whileTap={{ scale: 0.97 }}
                      className="inline-block px-5 py-2 rounded-full text-sm font-bold text-black"
                      style={{
                        background: "var(--color-neon-cyan)",
                        fontFamily: "var(--font-display)",
                        boxShadow: "0 0 16px rgba(0,240,255,0.3)",
                      }}
                    >
                      Trade →
                    </motion.span>
                  </Link>
                )}
                <AvatarRow
                  participants={leaderboard as never[]}
                  maxDrawdown={currentRound?.max_drawdown_percent ?? 20}
                />
              </div>
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
              {!isCompleted && (
                <TerritoryBoard arenaId={arenaId} myParticipantId={myParticipantId} />
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
