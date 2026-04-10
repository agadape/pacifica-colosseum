import { getArenaState } from "./risk-monitor";
import { getSupabase } from "../db";
import { getPriceManager } from "../state/price-manager";
import { calcEquity } from "../state/types";
import { GRACE_PERIOD_SECONDS, GRACE_PERIOD_SUDDEN_DEATH } from "../../../src/lib/utils/constants";

/**
 * Enter grace period for an arena.
 * - Drawdown monitoring paused (isInGracePeriod = true)
 * - Only reduce/close orders allowed (enforced by order-validator)
 * - After duration: snapshot equity as new baseline, resume monitoring
 */
export async function startGracePeriod(
  arenaId: string,
  nextRoundNumber: number,
  callback: () => void
): Promise<void> {
  const state = getArenaState(arenaId);
  if (!state) return;

  // Set grace period flag for all active traders
  for (const [, trader] of state.traders) {
    if (trader.status === "active") {
      trader.isInGracePeriod = true;
    }
  }

  const duration = nextRoundNumber === 4
    ? GRACE_PERIOD_SUDDEN_DEATH * 1000
    : GRACE_PERIOD_SECONDS * 1000;

  console.log(`[GracePeriod] Arena ${arenaId} — ${duration / 1000}s grace period started`);

  // Update arena status in DB
  const supabase = getSupabase();
  const statusMap: Record<number, string> = {
    2: "round_1_elimination",
    3: "round_2_elimination",
    4: "round_3_elimination",
  };
  const elimStatus = statusMap[nextRoundNumber] ?? "settling";

  await supabase
    .from("arenas")
    .update({ status: elimStatus, updated_at: new Date().toISOString() })
    .eq("id", arenaId);

  // After grace period: snapshot equity, reset baselines, resume
  setTimeout(async () => {
    try {
      await endGracePeriod(arenaId);
    } catch (err) {
      console.error(`[GracePeriod] endGracePeriod failed for arena ${arenaId}:`, err);
      // Still call callback — round must advance even if snapshot fails
    }
    callback();
  }, duration);
}

/**
 * End grace period — snapshot equity as new baseline for next round.
 */
async function endGracePeriod(arenaId: string): Promise<void> {
  const state = getArenaState(arenaId);
  if (!state) return;

  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();
  const supabase = getSupabase();

  for (const [, trader] of state.traders) {
    if (trader.status !== "active") continue;

    // Calculate current equity and set as new baseline
    const equity = calcEquity(trader, allPrices);
    trader.equityBaseline = equity;
    trader.currentEquity = equity;
    trader.currentDrawdownPercent = 0;
    trader.isInGracePeriod = false;

    // Reset per-round activity counters
    await supabase
      .from("arena_participants")
      .update({
        trades_this_round: 0,
        volume_this_round: 0,
      })
      .eq("id", trader.participantId);

    // Snapshot equity for round boundary
    const roundField = `equity_round_${state.currentRound}_end` as string;
    await supabase
      .from("arena_participants")
      .update({ [roundField]: equity })
      .eq("id", trader.participantId);
  }

  console.log(`[GracePeriod] Arena ${arenaId} — grace period ended, baselines reset`);
}
