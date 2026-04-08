import { getArenaState } from "./risk-monitor";
import { getSupabase } from "../db";
import { getPriceManager } from "../state/price-manager";
import { calcEquity, calcDrawdownPercent, getDrawdownLevel, type DrawdownLevel } from "../state/types";

const leaderboardIntervals = new Map<string, ReturnType<typeof setInterval>>();

/**
 * Start leaderboard updates for an arena. Runs every 3 seconds.
 * Batch updates arena_participants with latest PnL%, drawdown%.
 * Supabase Realtime picks this up and broadcasts to frontends.
 */
export function startLeaderboardUpdater(arenaId: string): void {
  if (leaderboardIntervals.has(arenaId)) return;

  const interval = setInterval(() => {
    updateLeaderboard(arenaId).catch((err) =>
      console.error(`[Leaderboard] Error updating arena ${arenaId}:`, err)
    );
  }, 3_000);

  leaderboardIntervals.set(arenaId, interval);
  console.log(`[Leaderboard] Started for arena ${arenaId} (every 3s)`);
}

/**
 * Stop leaderboard updates for an arena.
 */
export function stopLeaderboardUpdater(arenaId: string): void {
  const interval = leaderboardIntervals.get(arenaId);
  if (interval) {
    clearInterval(interval);
    leaderboardIntervals.delete(arenaId);
    console.log(`[Leaderboard] Stopped for arena ${arenaId}`);
  }
}

async function updateLeaderboard(arenaId: string): Promise<void> {
  const state = getArenaState(arenaId);
  if (!state) return;

  const supabase = getSupabase();
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  for (const [, trader] of state.traders) {
    if (trader.status !== "active") continue;

    const equity = calcEquity(trader, allPrices);
    const pnl = equity - trader.equityBaseline;
    const pnlPercent = trader.equityBaseline > 0
      ? (pnl / trader.equityBaseline) * 100
      : 0;
    const drawdown = calcDrawdownPercent(equity, trader.equityBaseline);

    await supabase
      .from("arena_participants")
      .update({
        total_pnl: pnl,
        total_pnl_percent: pnlPercent,
        max_drawdown_hit: Math.max(trader.maxDrawdownHit, drawdown),
      })
      .eq("id", trader.participantId);
  }
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
