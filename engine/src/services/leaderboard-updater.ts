import { getArenaState } from "./risk-monitor";
import { getSupabase } from "../db";
import { getPriceManager } from "../state/price-manager";
import { calcEquity, calcDrawdownPercent, getDrawdownLevel, type DrawdownLevel } from "../state/types";

const leaderboardIntervals = new Map<string, ReturnType<typeof setInterval>>();
const leaderboardBusy = new Map<string, boolean>();

/**
 * Start leaderboard updates for an arena. Runs every 30 seconds.
 * All traders updated in ONE batched upsert — not individual queries.
 * Supabase Realtime picks this up and broadcasts to frontends.
 */
export function startLeaderboardUpdater(arenaId: string): void {
  if (leaderboardIntervals.has(arenaId)) return;

  const interval = setInterval(() => {
    if (leaderboardBusy.get(arenaId)) return;
    leaderboardBusy.set(arenaId, true);
    updateLeaderboard(arenaId)
      .catch((err) => console.error(`[Leaderboard] Error updating arena ${arenaId}:`, err))
      .finally(() => leaderboardBusy.set(arenaId, false));
  }, 30_000);

  leaderboardIntervals.set(arenaId, interval);
  console.log(`[Leaderboard] Started for arena ${arenaId} (every 30s, batched)`);
}

/**
 * Stop leaderboard updates for an arena.
 */
export function stopLeaderboardUpdater(arenaId: string): void {
  const interval = leaderboardIntervals.get(arenaId);
  if (interval) {
    clearInterval(interval);
    leaderboardIntervals.delete(arenaId);
    leaderboardBusy.delete(arenaId);
    console.log(`[Leaderboard] Stopped for arena ${arenaId}`);
  }
}

async function updateLeaderboard(arenaId: string): Promise<void> {
  const state = getArenaState(arenaId);
  if (!state) return;

  const supabase = getSupabase();
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  // Build all updates in memory first
  const updates: Array<{
    id: string;
    total_pnl: number;
    total_pnl_percent: number;
    max_drawdown_hit: number;
  }> = [];

  for (const [, trader] of state.traders) {
    if (trader.status !== "active") continue;

    const equity = calcEquity(trader, allPrices);
    const pnl = equity - trader.equityBaseline;
    const pnlPercent = trader.equityBaseline > 0
      ? (pnl / trader.equityBaseline) * 100
      : 0;
    const drawdown = calcDrawdownPercent(equity, trader.equityBaseline);

    updates.push({
      id: trader.participantId,
      total_pnl: Math.round(pnl * 100) / 100,
      total_pnl_percent: Math.round(pnlPercent * 100) / 100,
      max_drawdown_hit: Math.round(Math.max(trader.maxDrawdownHit, drawdown) * 100) / 100,
    });
  }

  if (updates.length === 0) return;

  // Fire all updates concurrently — parallel, not sequential
  await Promise.all(
    updates.map(u =>
      supabase
        .from("arena_participants")
        .update({
          total_pnl: u.total_pnl,
          total_pnl_percent: u.total_pnl_percent,
          max_drawdown_hit: u.max_drawdown_hit,
        })
        .eq("id", u.id)
    )
  );
}

/**
 * Emit drawdown threshold events when crossing 50%, 75%, 90% of max.
 */
export async function emitDrawdownEvent(
  arenaId: string,
  participantId: string,
  userId: string,
  drawdown: number,
  maxDrawdown: number,
  previousLevel: DrawdownLevel,
  currentLevel: DrawdownLevel
): Promise<void> {
  if (previousLevel === currentLevel) return;

  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  if (!state) return;

  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: state.currentRound,
    event_type: "leverage_warning",
    actor_id: userId,
    message: `Drawdown alert: ${currentLevel.toUpperCase()} (${drawdown.toFixed(1)}% / ${maxDrawdown}%)`,
    data: {
      drawdown,
      max_drawdown: maxDrawdown,
      level: currentLevel,
    },
  });
}
