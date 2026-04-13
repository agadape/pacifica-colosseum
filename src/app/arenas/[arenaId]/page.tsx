"use client";

import { use, useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useArena, useJoinArena, useLeaveArena, useCurrentUser } from "@/hooks/use-arena";
import { useArenaRealtime } from "@/hooks/use-arena-realtime";
import Timer from "@/components/shared/Timer";
import RoundIndicator from "@/components/arena/RoundIndicator";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const ACTIVE_STATUSES = ["round_1", "round_2", "round_3", "sudden_death"];

export default function ArenaDetailPage({
  params,
}: {
  params: Promise<{ arenaId: string }>;
}) {
  const { arenaId } = use(params);
  const router = useRouter();
  const { data, isLoading } = useArena(arenaId);
  const { data: userData } = useCurrentUser();
  const joinArena = useJoinArena(arenaId);
  const leaveArena = useLeaveArena(arenaId);

  // Live push updates via Supabase Realtime
  useArenaRealtime(arenaId);

  const arena = data?.data;
  const currentUser = userData?.data;
  const [isResetting, setIsResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [arenaJustStarted, setArenaJustStarted] = useState(false);
  const [arenaCancelled, setArenaCancelled] = useState(false);
  const prevStatusRef = useRef<string | undefined>(undefined);

  // Detect status transitions while user is on the page
  useEffect(() => {
    if (!arena?.status) return;
    const prev = prevStatusRef.current;

    if (prev === "registration") {
      if (ACTIVE_STATUSES.includes(arena.status)) {
        setArenaJustStarted(true);
      } else if (arena.status === "cancelled") {
        setArenaCancelled(true);
      }
    }

    prevStatusRef.current = arena.status;
  }, [arena?.status]);

  const handleResetOpenArena = useCallback(async () => {
    setIsResetting(true);
    try {
      const res = await fetch("/api/demo/reset-open-arena", { method: "POST" });
      if (res.ok) setResetDone(true);
    } catch {
      // silent — button stays enabled for retry
    } finally {
      setIsResetting(false);
    }
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen pt-20 px-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  if (!arena) {
    return (
      <main className="min-h-screen pt-20 px-6 flex items-center justify-center">
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
  const isActive = ACTIVE_STATUSES.includes(arena.status);

  return (
    <main className="min-h-screen pt-20 px-6 md:px-10">
      <div className="max-w-5xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>

          {/* ── Arena-just-started banner ── */}
          <AnimatePresence>
            {arenaJustStarted && (
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="mb-6 rounded-2xl border border-accent-primary/40 bg-accent-primary/5 px-5 py-4"
              >
                <p className="text-sm font-bold text-accent-primary mb-1">⚡ Arena is live!</p>
                <p className="text-xs text-text-secondary mb-3">
                  The arena has started. {isParticipant ? "Jump in and start trading." : "Watch the battle unfold."}
                </p>
                <div className="flex gap-2">
                  {isParticipant && (
                    <button
                      onClick={() => router.push(`/arenas/${arenaId}/trade`)}
                      className="px-4 py-2 rounded-full bg-accent-primary text-white text-xs font-semibold hover:bg-accent-hover transition-colors"
                    >
                      Go Trade →
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/arenas/${arenaId}/spectate`)}
                    className="px-4 py-2 rounded-full border border-border text-text-secondary text-xs font-semibold hover:text-text-primary transition-colors"
                  >
                    Watch Live
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Arena-cancelled banner ── */}
          <AnimatePresence>
            {arenaCancelled && (
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="mb-6 rounded-2xl border border-danger/40 bg-danger/5 px-5 py-4"
              >
                <p className="text-sm font-bold text-danger mb-1">Arena cancelled</p>
                <p className="text-xs text-text-secondary">
                  Not enough participants joined in time. The arena has been cancelled.
                </p>
                <Link href="/arenas">
                  <button className="mt-3 px-4 py-2 rounded-full border border-border text-text-secondary text-xs font-semibold hover:text-text-primary transition-colors">
                    ← Back to Arenas
                  </button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs uppercase tracking-[0.3em] text-text-tertiary">
                {arena.preset}
              </span>
              <span className="text-xs text-text-tertiary">&middot;</span>
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
              <Link href={`/arenas/${arenaId}/spectate`}>
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block px-6 py-2.5 rounded-full bg-accent-primary text-white text-sm font-semibold hover:bg-accent-hover transition-colors"
                >
                  Watch Live
                </motion.span>
              </Link>
              {isParticipant && (
                <Link href={`/arenas/${arenaId}/trade`}>
                  <motion.span
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-block px-6 py-2.5 rounded-full border border-border text-text-secondary text-sm font-semibold hover:text-text-primary hover:border-text-secondary transition-colors"
                  >
                    Trade
                  </motion.span>
                </Link>
              )}
            </div>
          )}

          {/* See Results (completed) */}
          {arena.status === "completed" && (
            <div className="flex gap-3 mb-8">
              <Link href={`/arenas/${arenaId}/spectate`}>
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block px-6 py-2.5 rounded-full bg-surface border border-border text-text-secondary text-sm font-semibold hover:text-text-primary transition-colors"
                >
                  See Results
                </motion.span>
              </Link>
            </div>
          )}

          {/* Round Indicator (active) */}
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

          {/* Zombie banner */}
          {isRegistration && arena.starts_at && new Date(arena.starts_at as string) < new Date() && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-2xl border border-amber-300/40 bg-amber-50 px-5 py-4 flex items-center justify-between gap-4"
            >
              <div>
                <p className="text-sm font-semibold text-amber-800">Arena start missed</p>
                <p className="text-xs text-amber-700/70 mt-0.5">
                  {resetDone
                    ? "Resetting — a fresh arena will appear in ~60 seconds."
                    : "Registration window expired but the engine missed the start. Reset to create a fresh arena."}
                </p>
              </div>
              {!resetDone && (
                <button
                  onClick={handleResetOpenArena}
                  disabled={isResetting}
                  className="flex-shrink-0 px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {isResetting ? "Resetting…" : "Reset →"}
                </button>
              )}
            </motion.div>
          )}

          {/* Registration waiting room */}
          {isRegistration && (
            <div className="bg-surface rounded-2xl border border-border-medium p-6 mb-8">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-2xl font-bold font-mono text-text-primary">
                    {participants.length}
                    <span className="text-text-tertiary font-normal text-base">
                      {" "}/ {arena.max_participants} traders
                    </span>
                  </p>
                  <Timer targetDate={arena.starts_at} label="starts in" className="mt-1" />
                </div>

                {currentUser && !isParticipant ? (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => joinArena.mutate()}
                    disabled={joinArena.isPending}
                    className="px-6 py-3 rounded-full bg-accent-primary text-white text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
                  >
                    {joinArena.isPending ? "Joining..." : "Join Arena"}
                  </motion.button>
                ) : isParticipant ? (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => leaveArena.mutate()}
                    disabled={leaveArena.isPending}
                    className="px-6 py-3 rounded-full border border-border text-text-secondary text-sm font-semibold hover:border-danger hover:text-danger transition-colors disabled:opacity-50"
                  >
                    {leaveArena.isPending ? "Leaving..." : "Leave Arena"}
                  </motion.button>
                ) : null}
              </div>

              {isParticipant && (
                <p className="text-xs text-success font-medium">
                  ✓ You&apos;re in — arena starts automatically when the timer hits zero.
                </p>
              )}
              {!isParticipant && (
                <p className="text-xs text-text-tertiary">
                  No minimum required — arena starts automatically at the scheduled time.
                </p>
              )}
            </div>
          )}

          {/* Participant list */}
          <div>
            <h2 className="font-display text-xl font-700 text-text-primary mb-4">
              Traders
              <span className="text-text-tertiary text-base font-normal ml-2">
                ({participants.length})
              </span>
            </h2>
            {participants.length === 0 ? (
              <p className="text-text-tertiary text-sm py-8 text-center">
                No traders yet — be the first to join.
              </p>
            ) : (
              <div className="space-y-2">
                {participants.map((p: Record<string, unknown>, i: number) => (
                  <motion.div
                    key={p.id as string}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between py-4 px-5 rounded-xl bg-surface border border-border-medium"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-mono text-text-tertiary w-6">
                        #{i + 1}
                      </span>
                      <span className="text-base text-text-primary font-medium">
                        {((p.users as { username?: string | null } | null)?.username) ??
                          (p.subaccount_address as string)?.slice(0, 8) ?? "..."}
                      </span>
                    </div>
                    <div className="flex items-center gap-5">
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
                        className={`text-xs font-semibold uppercase tracking-wide ${
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
