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

  useArenaRealtime(arenaId);

  const arena = data?.data;
  const currentUser = userData?.data;
  const [isResetting, setIsResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [arenaJustStarted, setArenaJustStarted] = useState(false);
  const [arenaCancelled, setArenaCancelled] = useState(false);
  const prevStatusRef = useRef<string | undefined>(undefined);

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
      // silent
    } finally {
      setIsResetting(false);
    }
  }, []);

  if (isLoading) {
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

  if (!arena) {
    return (
      <main className="min-h-screen pt-20 px-6 flex items-center justify-center">
        <p className="text-[var(--color-text-tertiary)] text-lg">Arena not found</p>
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
    <main className="min-h-screen pt-20 px-4 md:px-6 lg:px-10 pb-16">
      <div className="max-w-5xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>

          {/* Arena-just-started banner */}
          <AnimatePresence>
            {arenaJustStarted && (
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="mb-6 rounded-2xl border px-5 py-4"
                style={{
                  background: "rgba(0,240,255,0.05)",
                  borderColor: "rgba(0,240,255,0.3)",
                  boxShadow: "0 0 30px rgba(0,240,255,0.1)",
                }}
              >
                <p className="text-sm font-bold mb-1" style={{ color: "var(--color-neon-cyan)" }}>
                  ⚡ Arena is live!
                </p>
                <p className="text-xs mb-3" style={{ color: "var(--color-text-secondary)" }}>
                  The arena has started. {isParticipant ? "Jump in and start trading." : "Watch the battle unfold."}
                </p>
                <div className="flex gap-2">
                  {isParticipant && (
                    <button
                      onClick={() => router.push(`/arenas/${arenaId}/trade`)}
                      className="px-4 py-2 rounded-full text-xs font-bold shadow-[0_0_16px_rgba(0,240,255,0.3)] bg-gradient-to-r from-[var(--color-neon-cyan)] to-[var(--color-neon-cyan-dim)] text-black"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Go Trade →
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/arenas/${arenaId}/spectate`)}
                    className="px-4 py-2 rounded-full border text-xs font-bold transition-colors"
                    style={{
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Watch Live
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Arena-cancelled banner */}
          <AnimatePresence>
            {arenaCancelled && (
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="mb-6 rounded-2xl border px-5 py-4"
                style={{
                  background: "rgba(255,51,51,0.05)",
                  borderColor: "rgba(255,51,51,0.3)",
                }}
              >
                <p className="text-sm font-bold mb-1" style={{ color: "var(--color-danger)" }}>
                  Arena cancelled
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  Not enough participants joined in time.
                </p>
                <Link href="/arenas">
                  <button
                    className="mt-3 px-4 py-2 rounded-full border text-xs font-bold transition-colors"
                    style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
                  >
                    ← Back to Arenas
                  </button>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <span
                className="text-xs uppercase tracking-[0.2em] px-3 py-1 rounded-full font-bold"
                style={{
                  background: "rgba(0,240,255,0.1)",
                  color: "var(--color-neon-cyan)",
                  border: "1px solid rgba(0,240,255,0.2)",
                  fontFamily: "var(--font-display)",
                }}
              >
                {arena.preset?.toUpperCase()}
              </span>
              <span style={{ color: "var(--color-text-tertiary)" }}>•</span>
              <span
                className="text-xs uppercase tracking-wider font-semibold"
                style={{ color: "var(--color-text-secondary)", fontFamily: "var(--font-display)" }}
              >
                {arena.status?.replace(/_/g, " ")}
              </span>
            </div>
            <h1
              className="font-display text-4xl md:text-5xl font-black tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              {arena.name}
            </h1>
            {arena.description && (
              <p className="mt-3" style={{ color: "var(--color-text-secondary)" }}>
                {arena.description}
              </p>
            )}
          </div>

          {/* Action buttons (active) */}
          {isActive && (
            <div className="flex gap-3 mb-8">
              <Link href={`/arenas/${arenaId}/spectate`}>
                <motion.span
                  whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(0,240,255,0.5)" }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block px-6 py-3 rounded-full text-sm font-bold tracking-wide shadow-[0_0_16px_rgba(0,240,255,0.3)] bg-gradient-to-r from-[var(--color-neon-cyan)] to-[var(--color-neon-cyan-dim)] text-black"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Watch Live
                </motion.span>
              </Link>
              {isParticipant && (
                <Link href={`/arenas/${arenaId}/trade`}>
                  <motion.span
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-block px-6 py-3 rounded-full border text-sm font-bold transition-all"
                    style={{
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
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
                  className="inline-block px-6 py-3 rounded-full text-sm font-bold border transition-all"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  See Results
                </motion.span>
              </Link>
            </div>
          )}

          {/* Round Indicator */}
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
              className="mb-4 rounded-2xl border px-5 py-4 flex items-center justify-between gap-4"
              style={{
                background: "rgba(255,149,0,0.05)",
                borderColor: "rgba(255,149,0,0.3)",
              }}
            >
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--color-warning)" }}>
                  Arena start missed
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                  {resetDone
                    ? "Resetting — a fresh arena will appear in ~60 seconds."
                    : "Registration window expired but the engine missed the start. Reset to create a fresh arena."}
                </p>
              </div>
              {!resetDone && (
                <button
                  onClick={handleResetOpenArena}
                  disabled={isResetting}
                  className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                  style={{
                    background: "var(--color-warning)",
                    color: "#07070D",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {isResetting ? "Resetting…" : "Reset →"}
                </button>
              )}
            </motion.div>
          )}

          {/* Registration waiting room */}
          {isRegistration && (
            <div
              className="rounded-2xl border p-6 mb-8"
              style={{
                background: "var(--color-surface)",
                borderColor: "var(--color-border)",
              }}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-2xl font-bold font-mono" style={{ color: "var(--color-text-primary)" }}>
                    {participants.length}
                    <span className="text-[var(--color-text-tertiary)] font-normal text-base">
                      {" "}/ {arena.max_participants} traders
                    </span>
                  </p>
                  <Timer targetDate={arena.starts_at} label="starts in" className="mt-1" />
                </div>

                {currentUser && !isParticipant ? (
                  <motion.button
                    whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(0,240,255,0.5)" }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => joinArena.mutate()}
                    disabled={joinArena.isPending}
                    className="px-6 py-3 rounded-full text-sm font-bold shadow-[0_0_16px_rgba(0,240,255,0.3)] bg-gradient-to-r from-[var(--color-neon-cyan)] to-[var(--color-neon-cyan-dim)] text-black disabled:opacity-50"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {joinArena.isPending ? "Joining..." : "Join Arena"}
                  </motion.button>
                ) : isParticipant ? (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => leaveArena.mutate()}
                    disabled={leaveArena.isPending}
                    className="px-6 py-3 rounded-full border text-sm font-bold transition-all disabled:opacity-50"
                    style={{
                      borderColor: "var(--color-border)",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {leaveArena.isPending ? "Leaving..." : "Leave Arena"}
                  </motion.button>
                ) : null}
              </div>

              {isParticipant && (
                <p className="text-xs font-medium" style={{ color: "var(--color-success)" }}>
                  ✓ You&apos;re in — arena starts automatically when the timer hits zero.
                </p>
              )}
              {!isParticipant && (
                <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  No minimum required — arena starts automatically at the scheduled time.
                </p>
              )}
            </div>
          )}

          {/* Participant list */}
          <div>
            <h2
              className="font-display text-xl font-bold mb-4"
              style={{ color: "var(--color-text-primary)" }}
            >
              Traders
              <span
                className="text-[var(--color-text-tertiary)] text-base font-normal ml-2"
              >
                ({participants.length})
              </span>
            </h2>
            {participants.length === 0 ? (
              <p className="text-[var(--color-text-tertiary)] text-sm py-8 text-center">
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
                    className="flex items-center justify-between py-4 px-5 rounded-xl border"
                    style={{
                      background: "var(--color-surface)",
                      borderColor: "var(--color-border)",
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className="text-sm font-mono w-6"
                        style={{ color: "var(--color-text-tertiary)" }}
                      >
                        #{i + 1}
                      </span>
                      <span className="text-base font-medium" style={{ color: "var(--color-text-primary)" }}>
                        {((p.users as { username?: string | null } | null)?.username) ??
                          (p.subaccount_address as string)?.slice(0, 8) ?? "..."}
                      </span>
                    </div>
                    <div className="flex items-center gap-5">
                      {p.total_pnl_percent !== undefined && (
                        <span
                          className="font-mono text-sm font-bold"
                          style={{
                            color: (p.total_pnl_percent as number) >= 0 ? "var(--color-success)" : "var(--color-danger)",
                            textShadow: (p.total_pnl_percent as number) >= 0 ? "0 0 8px rgba(0,255,136,0.4)" : "0 0 8px rgba(255,51,51,0.4)",
                          }}
                        >
                          {(p.total_pnl_percent as number) >= 0 ? "+" : ""}
                          {(p.total_pnl_percent as number).toFixed(2)}%
                        </span>
                      )}
                      <span
                        className="text-xs font-bold uppercase tracking-wider"
                        style={{
                          color: p.status === "active"
                            ? "var(--color-success)"
                            : p.status === "eliminated"
                            ? "var(--color-danger)"
                            : p.status === "winner"
                            ? "var(--color-neon-gold)"
                            : "var(--color-text-tertiary)",
                          fontFamily: "var(--font-display)",
                        }}
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
