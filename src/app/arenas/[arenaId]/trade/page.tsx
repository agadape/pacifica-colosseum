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
  const myEquity  = Math.round(STARTING * (1 + myPnlPct / 100) * 100) / 100;
  const myDrawdown = (myParticipant?.max_drawdown_hit as number | undefined) ?? 0;
  const myStatus = (myParticipant?.status as string | undefined) ?? null;

  // Connect to WS prices + Supabase Realtime
  usePacificaWS();
  useArenaRealtime(arenaId);

  // Symbol selector — defaults to first allowed pair
  const rounds = arena?.rounds ?? [];
  const currentRound = rounds.find(
    (r: Record<string, unknown>) => r.round_number === arena?.current_round
  );
  const allowedPairs: string[] = currentRound?.allowed_pairs ?? ["BTC"];
  const [symbol, setSymbol] = useState(allowedPairs[0] ?? "BTC");

  // Notification states
  const [showEliminated, setShowEliminated] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [roundEndMsg, setRoundEndMsg] = useState<string | null>(null);
  const prevRound = useRef<number | null>(null);
  const prevStatus = useRef<string | null>(null);

  // Detect round change → show toast
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arena?.current_round]);

  // Detect status transitions → show overlays
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
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
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
      {/* Hazard Banner — fixed top, shows warning/active hazards */}
      <HazardBanner arenaId={arenaId} />

      {/* Progression Modal — shown to active participants after round ends */}
      {myStatus === "active" && <ProgressionModal arenaId={arenaId} />}

      {/* Betrayal Vote Modal — shown during alliance betrayal phase */}
      {myStatus === "active" && !!myParticipant?.id && (
        <BetrayalVoteModal
          arenaId={arenaId}
          partnerName="your ally"
        />
      )}

      {/* Elimination overlay — fullscreen */}
      <AnimatePresence>
        {showEliminated && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/92 flex flex-col items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 14 }}
              className="text-center max-w-xs"
            >
              <div className="text-7xl mb-5">💀</div>
              <h1 className="font-display text-4xl font-800 text-white mb-2">Eliminated</h1>
              <p className="text-white/50 text-sm mb-1">Your drawdown exceeded the round limit.</p>
              <p className="font-mono text-danger text-xl font-bold mb-8">
                −{myDrawdown.toFixed(1)}% drawdown
              </p>
              <Link href={`/arenas/${arenaId}/spectate`}>
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block px-6 py-3 rounded-full bg-white text-black font-semibold text-sm"
                >
                  Watch the arena →
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner overlay — fullscreen */}
      <AnimatePresence>
        {showWinner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/92 flex flex-col items-center justify-center p-8"
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", damping: 14 }}
              className="text-center max-w-xs"
            >
              <div className="text-7xl mb-5">🏆</div>
              <h1 className="font-display text-4xl font-800 text-white mb-2">You Win!</h1>
              <p className="text-white/50 text-sm mb-1">You outlasted every trader.</p>
              <p className="font-mono text-yellow-400 text-xl font-bold mb-8">
                {myPnlPct >= 0 ? "+" : ""}{myPnlPct.toFixed(1)}% final PnL
              </p>
              <Link href={`/arenas/${arenaId}/spectate`}>
                <motion.span
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-block px-6 py-3 rounded-full bg-white text-black font-semibold text-sm"
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
            className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-surface border border-border-light rounded-full px-5 py-2 shadow-lg pointer-events-none"
          >
            <p className="text-sm font-semibold text-text-primary whitespace-nowrap">{roundEndMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="min-h-screen pt-20 px-4 md:px-6 pb-8">
        <div className="max-w-7xl mx-auto">
          {/* Round info bar */}
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
              className="mb-4 rounded-2xl border border-danger/40 bg-danger/5 px-5 py-3 flex items-center gap-3"
            >
              <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-danger flex-shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-danger">Sudden Death</p>
                <p className="text-xs text-danger/60">One trader survives. Trade for your life.</p>
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
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    symbol === pair
                      ? "bg-accent-primary text-white"
                      : "bg-surface border border-border-light text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {pair}
                </button>
              ))}
            </div>
          )}

          {/* Main grid: Chart + Order Form */}
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
                  className={`rounded-xl px-4 py-3 border ${
                    drawdownCritical
                      ? "bg-danger/10 border-danger/40"
                      : "bg-amber-50 border-amber-300/40"
                  }`}
                >
                  <p className={`text-xs font-semibold ${drawdownCritical ? "text-danger" : "text-amber-700"}`}>
                    {drawdownCritical ? "⚠ Drawdown limit hit" : "⚠ Approaching drawdown limit"}
                  </p>
                  <p className={`text-xs mt-0.5 ${drawdownCritical ? "text-danger/60" : "text-amber-600/70"}`}>
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

              {/* Territory info — shows cell modifiers for current round */}
              {!!myParticipant?.id && myStatus === "active" && (
                <TerritoryInfoCard
                  arenaId={arenaId}
                  myParticipantId={myParticipant.id as string}
                />
              )}

              {/* Ability panel — shows owned abilities and active effects */}
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

              {/* Alliance panel — propose / view / manage alliances */}
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
                <div className="bg-surface rounded-2xl border border-border-light p-4">
                  <h3 className="font-display text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-3">Standings</h3>
                  <div className="space-y-1.5">
                    {leaderboard.slice(0, 6).map((p, i) => {
                      const username = (p.users as { username?: string | null } | null)?.username ?? null;
                      const isBot = username ? KNOWN_BOT_NAMES.has(username) : false;
                      return (
                        <div key={p.id as string} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-text-tertiary w-4">{i + 1}</span>
                            <span className={`font-medium truncate max-w-[72px] ${p.user_id === currentUserId ? "text-accent-primary" : "text-text-primary"}`}>
                              {username ?? (p.subaccount_address as string)?.slice(0, 6) ?? "..."}
                            </span>
                            {isBot && <span className="text-[9px] text-text-tertiary/40">🤖</span>}
                          </div>
                          <span className={`font-mono font-semibold ${((p.total_pnl_percent as number) ?? 0) >= 0 ? "text-success" : "text-danger"}`}>
                            {((p.total_pnl_percent as number) ?? 0) >= 0 ? "+" : ""}{((p.total_pnl_percent as number) ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Positions + Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PositionList arenaId={arenaId} />
            <OrderList arenaId={arenaId} />
          </div>
        </div>
      </main>
    </>
  );
}
