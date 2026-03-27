"use client";

import { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useArena, useJoinArena, useLeaveArena, useCurrentUser } from "@/hooks/use-arena";
import Timer from "@/components/shared/Timer";
import RoundIndicator from "@/components/arena/RoundIndicator";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ArenaDetailPage({
  params,
}: {
  params: Promise<{ arenaId: string }>;
}) {
  const { arenaId } = use(params);
  const { data, isLoading } = useArena(arenaId);
  const { data: userData } = useCurrentUser();
  const joinArena = useJoinArena(arenaId);
  const leaveArena = useLeaveArena(arenaId);

  const arena = data?.data;
  const currentUser = userData?.data;

  if (isLoading) {
    return (
      <main className="min-h-screen pt-24 px-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!arena) {
    return (
      <main className="min-h-screen pt-24 px-6 flex items-center justify-center">
        <p className="text-text-tertiary text-lg">Arena not found</p>
      </main>
    );
  }

  const participants = arena.participants ?? [];
  const rounds = arena.rounds ?? [];
  const currentRound = rounds.find(
    (r: Record<string, unknown>) => r.round_number === arena.current_round
  );
  const isParticipant = currentUser && participants.some(
    (p: Record<string, unknown>) => p.user_id === currentUser.id
  );
  const isRegistration = arena.status === "registration";
  const isActive = ["round_1", "round_2", "round_3", "sudden_death"].includes(arena.status);

  return (
    <main className="min-h-screen pt-24 px-6 md:px-10">
      <div className="max-w-4xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs uppercase tracking-[0.3em] text-text-tertiary">
                {arena.preset}
              </span>
              <span className="text-xs text-text-tertiary">
                &middot;
              </span>
              <span className="text-xs uppercase tracking-wider text-accent-primary font-semibold">
                {arena.status.replace(/_/g, " ")}
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-800 tracking-tight text-text-primary">
              {arena.name}
            </h1>
            {arena.description && (
              <p className="mt-2 text-text-secondary">{arena.description}</p>
            )}
          </div>

          {/* Action buttons (active arena) */}
          {isActive && (
            <div className="flex gap-3 mb-8">
              <Link href={`/arenas/${arenaId}/trade`}>
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block px-6 py-2.5 rounded-full bg-accent-primary text-white text-sm font-semibold hover:bg-accent-hover transition-colors"
                >
                  Trade
                </motion.span>
              </Link>
              <Link href={`/arenas/${arenaId}/spectate`}>
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block px-6 py-2.5 rounded-full border border-border text-text-secondary text-sm font-semibold hover:text-text-primary hover:border-text-secondary transition-colors"
                >
                  Spectate
                </motion.span>
              </Link>
            </div>
          )}

          {/* Round Indicator (if active) */}
          {isActive && currentRound && (
            <div className="mb-8">
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

          {/* Registration phase */}
          {isRegistration && (
            <div className="bg-surface rounded-2xl border border-border-light p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-text-secondary">
                    {participants.length} / {arena.max_participants} traders
                  </p>
                  <Timer targetDate={arena.starts_at} label="starts in" className="mt-1" />
                </div>

                {currentUser && !isParticipant ? (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => joinArena.mutate()}
                    disabled={joinArena.isPending}
                    className="px-6 py-2.5 rounded-full bg-accent-primary text-white text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {joinArena.isPending ? "Joining..." : "Join Arena"}
                  </motion.button>
                ) : isParticipant ? (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => leaveArena.mutate()}
                    disabled={leaveArena.isPending}
                    className="px-6 py-2.5 rounded-full border border-border text-text-secondary text-sm font-semibold hover:border-danger hover:text-danger transition-colors disabled:opacity-50"
                  >
                    {leaveArena.isPending ? "Leaving..." : "Leave Arena"}
                  </motion.button>
                ) : null}
              </div>
            </div>
          )}

          {/* Participants */}
          <div>
            <h2 className="font-display text-lg font-700 text-text-primary mb-4">
              Traders
            </h2>
            {participants.length === 0 ? (
              <p className="text-text-tertiary text-sm">No traders yet</p>
            ) : (
              <div className="space-y-2">
                {participants.map((p: Record<string, unknown>, i: number) => (
                  <motion.div
                    key={p.id as string}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between py-3 px-4 rounded-xl bg-surface border border-border-light"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-text-tertiary w-6">
                        #{i + 1}
                      </span>
                      <span className="text-sm text-text-primary font-medium">
                        {(p.subaccount_address as string)?.slice(0, 8) ?? "..."}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {p.total_pnl_percent !== undefined && (
                        <span
                          className={`font-mono text-sm font-semibold ${
                            (p.total_pnl_percent as number) >= 0
                              ? "text-success"
                              : "text-danger"
                          }`}
                        >
                          {(p.total_pnl_percent as number) >= 0 ? "+" : ""}
                          {(p.total_pnl_percent as number).toFixed(2)}%
                        </span>
                      )}
                      <span
                        className={`text-xs font-semibold uppercase ${
                          p.status === "active"
                            ? "text-success"
                            : p.status === "eliminated"
                            ? "text-danger"
                            : p.status === "winner"
                            ? "text-accent-gold"
                            : "text-text-tertiary"
                        }`}
                      >
                        {p.status as string}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </main>
  );
}
