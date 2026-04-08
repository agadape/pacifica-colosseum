import { getArenaState } from "./risk-monitor";
import { getSupabase } from "../db";
import { eliminateTrader } from "./elimination-engine";
import { getPriceManager } from "../state/price-manager";
import { calcEquity } from "../state/types";

// Track violations per participant: participantId → count
const violationCounts = new Map<string, number>();

/**
 * Check leverage compliance during periodic sync.
 * Called from periodic-sync every 30 seconds.
 */
export async function checkLeverageCompliance(arenaId: string): Promise<void> {
  const state = getArenaState(arenaId);
  if (!state) return;

  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  for (const [, trader] of state.traders) {
    if (trader.status !== "active") continue;

    for (const [, pos] of trader.positions) {
      // Calculate effective leverage: (position_value) / equity
      const markPrice = priceManager.getPrice(pos.symbol);
      if (!markPrice) continue;

      const positionValue = pos.size * markPrice;
      const equity = calcEquity(trader, allPrices);
      const effectiveLeverage = equity > 0 ? positionValue / equity : 0;

      if (effectiveLeverage > state.maxLeverage * 1.1) {
        // 10% buffer before flagging
        const key = `${trader.participantId}:${state.currentRound}`;
        const count = (violationCounts.get(key) ?? 0) + 1;
        violationCounts.set(key, count);

        const supabase = getSupabase();

        if (count >= 3) {
          // Eliminate after 3 violations in same round
          await eliminateTrader(arenaId, trader.participantId, state.currentRound, "leverage_violation", {
            equity,
          });

          await supabase.from("events").insert({
            arena_id: arenaId,
            round_number: state.currentRound,
            event_type: "elimination",
            actor_id: trader.userId,
            message: `Eliminated for repeated leverage violations (${effectiveLeverage.toFixed(1)}x > ${state.maxLeverage}x)`,
            data: { effective_leverage: effectiveLeverage, max_leverage: state.maxLeverage, violations: count },
          });
        } else {
          // Warning
          await supabase.from("events").insert({
            arena_id: arenaId,
            round_number: state.currentRound,
            event_type: "leverage_warning",
            actor_id: trader.userId,
            message: `Leverage warning ${count}/3: ${effectiveLeverage.toFixed(1)}x exceeds ${state.maxLeverage}x limit`,
            data: { effective_leverage: effectiveLeverage, max_leverage: state.maxLeverage, violations: count },
          });

          console.log(`[LeverageMonitor] ${trader.participantId} warning ${count}/3 — ${effectiveLeverage.toFixed(1)}x`);
        }
      }
    }
  }
}

/**
 * Reset violation counts for a new round.
 */
export function resetViolationCounts(): void {
  violationCounts.clear();
}
