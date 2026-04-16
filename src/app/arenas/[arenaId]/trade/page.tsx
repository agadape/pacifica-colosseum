"use client";

import { use, useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useArena, useCurrentUser } from "@/hooks/use-arena";
import { useLeaderboard } from "@/hooks/use-leaderboard";
import { usePacificaWS } from "@/hooks/use-websocket";
import { useArenaRealtime } from "@/hooks/use-arena-realtime";
import RoundIndicator from "@/components/arena/RoundIndicator";
import Chart from "@/components/trading/Chart";
import OrderForm from "@/components/trading/OrderForm";
import PositionList from "@/components/trading/PositionList";
import OrderList from "@/components/trading/OrderList";
import AccountPanel from "@/components/trading/AccountPanel";
import TerritoryInfoCard from "@/components/TerritoryInfoCard";
import { AbilityPanel } from "@/components/AbilityPanel";
import { HazardBanner } from "@/components/HazardBanner";
import { ProgressionModal } from "@/components/ProgressionModal";
import { AlliancePanel } from "@/components/AlliancePanel";
import { BetrayalVoteModal } from "@/components/BetrayalVoteModal";

const KNOWN_BOT_NAMES = new Set([
  "Conservative Carl", "Aggressive Alice", "Scalper Sam",
  "YOLO Yuki", "Steady Steve", "Degen Dave",
]);

export default function TradePage({
  params,
}: {
  params: Promise<{ arenaId: string }>;
}) {
  const { arenaId } = use(params);
  const { data } = useArena(arenaId);
  const { data: userData } = useCurrentUser();
  const leaderboardData = useLeaderboard(arenaId);
  const arena = data?.data;
  const leaderboard = (leaderboardData.data ?? []) as Record<string, unknown>[];

  const currentUserId = userData?.data?.id;
  const myParticipant = currentUserId
    ? (arena?.participants ?? []).find(
        (p: Record<string, unknown>) => p.user_id === currentUserId
      ) as Record<string, unknown> | undefined
    : undefined;

  const STARTING = 1000;
  const myPnlPct = (myParticipant?.total_pnl_percent as number | undefined) ?? 0;
  const myEquity = Math.round(STARTING * (1 + myPnlPct / 100) * 100) / 100;
  const myDrawdown = (myParticipant?.max_drawdown_hit as number | undefined) ?? 0;
  const myStatus = (myParticipant?.status as string | undefined) ?? null;

  usePacificaWS();
  useArenaRealtime(arenaId);

  const rounds = arena?.rounds ?? [];
  const currentRound = rounds.find(
    (r: Record<string, unknown>) => r.round_number === arena?.current_round
  );
  const allowedPairs: string[] = currentRound?.allowed_pairs ?? ["BTC"];
  const [symbol, setSymbol] = useState(allowedPairs[0] ?? "BTC");

  const [showEliminated, setShowEliminated] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [roundEndMsg, setRoundEndMsg] = useState<string | null>(null);
  const prevRound = useRef<number | null>(null);
  const prevStatus = useRef<string | null>(null);

  useEffect(() => {
    if (!arena) return;
    const r = arena.current_round as number;
    if (prevRound.current !== null && prevRound.current !== r) {
      const nextRound = (arena.rounds as Record<string, unknown>[]).find(
        (x) => (x.round_number as number) === r
      );
      const name = (nextRound?.name as string) ?? `Round ${r}`;
      setRoundEndMsg(`Round ${prevRound.current} complete — ${name} begins`);
      const t = setTimeout(() => setRoundEndMsg(null), 4000);
      prevRound.current = r;
      return () => clearTimeout(t);
    }
    prevRound.current = r;
  }, [arena?.current_round]);

  useEffect(() => {
    if (prevStatus.current === "active" && myStatus === "eliminated") {
      setShowEliminated(true);
    } else if (prevStatus.current === "active" && myStatus === "winner") {
      setShowWinner(true);
    }
    prevStatus.current = myStatus;
  }, [myStatus]);

  if (!arena) {
    return (
      <main className="min-h-screen pt-24 px-6 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 rounded-full border-2 border-[var(--color-neon-cyan)] border-t-transparent"
          style={{ boxShadow: "0 0 20px rgba(0,240,255,0.4)" }}
        />
      </main>
    );
  }

  const maxDrawdown = (currentRound?.max_drawdown_percent as number | undefined) ?? 20;
  const drawdownRatio = maxDrawdown > 0 ? myDrawdown / maxDrawdown : 0;
  const drawdownWarning = myStatus === "active" && drawdownRatio >= 0.8 && drawdownRatio < 1.0;
  const drawdownCritical = myStatus === "active" && drawdownRatio >= 1.0;
  const isSuddenDeath = (currentRound?.name as string | undefined)?.toLowerCase().includes("sudden") ?? false;

  return (
    <>
      <HazardBanner arenaId={arenaId} />
      {myStatus === "active" && <ProgressionModal arenaId={arenaId} />}
      {myStatus === "active" && !!myParticipant?.id && (
        <BetrayalVoteModal arenaId={arenaId} partnerName="your ally" />
      )}

      {/* Elimination overlay */}
      <AnimatePresence>
        {showEliminated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8"
            style={{ background: "rgba(7,7,13,0.97)" }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 14 }}
              className="text-center max-w-xs"
            >
              <div
                className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(255,51,51,0.1)",
                  border: "1px solid rgba(255,51,51,0.3)",
                  boxShadow: "0 0 60px rgba(255,51,51,0.3)",
                }}
              >
                <svg className="w-14 h-14" style={{ color: "var(--color-danger)" }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1
                className="font-display text-4xl font-black mb-2"
                style={{ color: "var(--color-danger)", textShadow: "0 0 40px rgba(255,51,51,0.5)" }}
              >
                ELIMINATED
              </h1>
              <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>
                Your drawdown exceeded the round limit.
              </p>
              <p
                className="font-mono text-xl font-bold mb-8"
                style={{ color: "var(--color-danger)", textShadow: "0 0 20px rgba(255,51,51,0.4)" }}
              >
                −{myDrawdown.toFixed(1)}% drawdown
              </p>
              <Link href={`/arenas/${arenaId}/spectate`}>
                <motion.span
                  whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(0,240,255,0.5)" }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block px-6 py-3 rounded-full font-bold text-sm text-black"
                  style={{
                    background: "var(--color-neon-cyan)",
                    fontFamily: "var(--font-display)",
                    boxShadow: "0 0 20px rgba(0,240,255,0.4)",
                  }}
                >
                  Watch the arena →
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner overlay */}
      <AnimatePresence>
        {showWinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center p-8"
            style={{ background: "rgba(7,7,13,0.97)" }}
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 14 }}
              className="text-center max-w-xs"
            >
              <div
                className="w-24 h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(255,215,0,0.1)",
                  border: "1px solid rgba(255,215,0,0.3)",
                  boxShadow: "0 0 60px rgba(255,215,0,0.3)",
                }}
              >
                <svg className="w-14 h-14" style={{ color: "var(--color-neon-gold)" }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1z"/>
                </svg>
              </div>
              <h1
                className="font-display text-4xl font-black mb-2"
                style={{ color: "var(--color-neon-gold)", textShadow: "0 0 40px rgba(255,215,0,0.5)" }}
              >
                YOU WIN!
              </h1>
              <p className="text-sm mb-1" style={{ color: "var(--color-text-secondary)" }}>
                You outlasted every trader.
              </p>
              <p
                className="font-mono text-xl font-bold mb-8"
                style={{ color: "var(--color-neon-gold)", textShadow: "0 0 20px rgba(255,215,0,0.4)" }}
              >
                {myPnlPct >= 0 ? "+" : ""}{myPnlPct.toFixed(1)}% final PnL
              </p>
              <Link href={`/arenas/${arenaId}/spectate`}>
                <motion.span
                  whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(255,215,0,0.5)" }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block px-6 py-3 rounded-full font-bold text-sm text-black"
                  style={{
                    background: "var(--color-neon-gold)",
                    fontFamily: "var(--font-display)",
                    boxShadow: "0 0 20px rgba(255,215,0,0.4)",
                  }}
                >
                  See Results →
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Round end toast */}
      <AnimatePresence>
        {roundEndMsg && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-40 rounded-full px-5 py-2 shadow-lg pointer-events-none"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-neon-cyan)",
              boxShadow: "0 0 30px rgba(0,240,255,0.2)",
            }}
          >
            <p className="text-sm font-semibold whitespace-nowrap" style={{ color: "var(--color-neon-cyan)", fontFamily: "var(--font-display)" }}>
              {roundEndMsg}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="min-h-screen pt-20 px-4 md:px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          {currentRound && (
            <div className="mb-4">
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

          {/* Sudden Death banner */}
          {isSuddenDeath && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-2xl border px-5 py-3 flex items-center gap-3"
              style={{
                background: "rgba(255,51,51,0.05)",
                borderColor: "rgba(255,51,51,0.3)",
                boxShadow: "0 0 20px rgba(255,51,51,0.15)",
              }}
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "var(--color-danger)", boxShadow: "0 0 12px var(--color-danger)" }}
              />
              <div>
                <p className="text-sm font-bold" style={{ color: "var(--color-danger)" }}>
                  ⚠ Sudden Death
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                  One trader survives. Trade for your life.
                </p>
              </div>
            </motion.div>
          )}

          {/* Symbol selector */}
          {allowedPairs.length > 1 && (
            <div className="flex gap-2 mb-4">
              {allowedPairs.map((pair: string) => (
                <button
                  key={pair}
                  onClick={() => setSymbol(pair)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    symbol === pair
                      ? "text-black"
                      : "border text-[var(--color-text-secondary)]"
                  }`}
                  style={symbol === pair ? {
                    background: "var(--color-neon-cyan)",
                    boxShadow: "0 0 12px rgba(0,240,255,0.4)",
                    fontFamily: "var(--font-display)",
                  } : {
                    background: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  {pair}
                </button>
              ))}
            </div>
          )}

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
            <div className="lg:col-span-3">
              <Chart symbol={symbol} />
            </div>
            <div className="space-y-4">
              <OrderForm
                arenaId={arenaId}
                symbol={symbol}
                maxLeverage={currentRound?.max_leverage ?? 20}
              />

              {/* Drawdown warning */}
              {(drawdownWarning || drawdownCritical) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl px-4 py-3 border"
                  style={
                    drawdownCritical
                      ? { background: "rgba(255,51,51,0.1)", borderColor: "rgba(255,51,51,0.3)" }
                      : { background: "rgba(255,149,0,0.1)", borderColor: "rgba(255,149,0,0.3)" }
                  }
                >
                  <p
                    className="text-xs font-bold"
                    style={{ color: drawdownCritical ? "var(--color-danger)" : "var(--color-warning)" }}
                  >
                    {drawdownCritical ? "⚠ Drawdown limit hit" : "⚠ Approaching drawdown limit"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
                    {myDrawdown.toFixed(1)}% / {maxDrawdown}% max
                  </p>
                </motion.div>
              )}

              <AccountPanel
                equity={myEquity}
                balance={myEquity}
                unrealizedPnl={myEquity - STARTING}
                drawdown={myDrawdown}
                maxDrawdown={maxDrawdown}
                hasWideZone={(myParticipant?.has_wide_zone as boolean | undefined) ?? false}
                hasSecondLife={(myParticipant?.has_second_life as boolean | undefined) ?? false}
                secondLifeUsed={(myParticipant?.second_life_used as boolean | undefined) ?? false}
              />

              {!!myParticipant?.id && myStatus === "active" && (
                <TerritoryInfoCard arenaId={arenaId} myParticipantId={myParticipant.id as string} />
              )}

              {!!myParticipant?.id && myStatus === "active" && (
                <AbilityPanel
                  arenaId={arenaId}
                  myParticipantId={myParticipant.id as string}
                  targets={leaderboard
                    .filter(p => p.id !== myParticipant?.id && p.status === "active")
                    .map(p => ({
                      participantId: p.id as string,
                      username: (p.users as { username?: string | null } | null)?.username ?? (p.subaccount_address as string)?.slice(0, 6) ?? "?",
                    }))}
                />
              )}

              {!!myParticipant?.id && myStatus === "active" && (
                <AlliancePanel
                  arenaId={arenaId}
                  myParticipantId={myParticipant.id as string}
                  targets={leaderboard
                    .filter(p => p.id !== myParticipant?.id && p.status === "active")
                    .map(p => ({
                      participantId: p.id as string,
                      username: (p.users as { username?: string | null } | null)?.username ?? (p.subaccount_address as string)?.slice(0, 6) ?? "?",
                    }))}
                />
              )}

              {leaderboard.length > 0 && (
                <div
                  className="rounded-2xl border p-4"
                  style={{
                    background: "var(--color-surface)",
                    borderColor: "var(--color-border)",
                  }}
                >
                  <h3
                    className="text-xs font-bold uppercase tracking-wider mb-3"
                    style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}
                  >
                    Standings
                  </h3>
                  <div className="space-y-1.5">
                    {leaderboard.slice(0, 6).map((p, i) => {
                      const username = (p.users as { username?: string | null } | null)?.username ?? null;
                      const isBot = username ? KNOWN_BOT_NAMES.has(username) : false;
                      return (
                        <div key={p.id as string} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span style={{ color: "var(--color-text-tertiary)", width: "1rem" }}>{i + 1}</span>
                            <span
                              className="font-medium truncate max-w-[72px]"
                              style={{ color: p.user_id === currentUserId ? "var(--color-neon-cyan)" : "var(--color-text-primary)" }}
                            >
                              {username ?? (p.subaccount_address as string)?.slice(0, 6) ?? "..."}
                            </span>
                            {isBot && <span className="text-[var(--color-text-tertiary)] opacity-40">🤖</span>}
                          </div>
                          <span
                            className="font-mono font-semibold"
                            style={{ color: ((p.total_pnl_percent as number) ?? 0) >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
                          >
                            {((p.total_pnl_percent as number) ?? 0) >= 0 ? "+" : ""}
                            {((p.total_pnl_percent as number) ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PositionList arenaId={arenaId} />
            <OrderList arenaId={arenaId} />
          </div>
        </div>
      </main>
    </>
  );
}
