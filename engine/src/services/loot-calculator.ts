import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/lib/supabase/types";
import { getArenaState } from "./risk-monitor";
import { getPriceManager } from "../state/price-manager";
import { calcEquity } from "../state/types";

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Calculate and award loots at the end of a round (except Sudden Death).
 *
 * - Wide Zone: trader with lowest maxDrawdownHit this round → +5% drawdown buffer next round
 * - Second Life: trader with highest PnL% this round → forgives one drawdown breach next round
 *
 * Rules:
 *   - Max 1 loot per trader per round
 *   - If same trader wins both: give Second Life (more impactful), Wide Zone to runner-up
 */
export async function calculateLoot(
  arenaId: string,
  roundNumber: number
): Promise<void> {
  const state = getArenaState(arenaId);
  if (!state) return;

  // Don't award loots after Sudden Death (round 4)
  if (roundNumber >= 4) return;

  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();
  const supabase = getSupabase();

  // Collect stats for active (surviving) traders
  const survivors: Array<{
    participantId: string;
    userId: string;
    pnlPercent: number;
    maxDrawdown: number;
  }> = [];

  for (const [, trader] of state.traders) {
    if (trader.status !== "active") continue;

    const equity = calcEquity(trader, allPrices);
    const pnl = equity - trader.equityBaseline;
    const pnlPercent = trader.equityBaseline > 0
      ? (pnl / trader.equityBaseline) * 100
      : 0;

    survivors.push({
      participantId: trader.participantId,
      userId: trader.userId,
      pnlPercent,
      maxDrawdown: trader.maxDrawdownHit,
    });
  }

  if (survivors.length < 2) return; // need at least 2 survivors for loots

  // Wide Zone: lowest maxDrawdownHit (best risk management)
  const sortedByDrawdown = [...survivors].sort((a, b) => a.maxDrawdown - b.maxDrawdown);

  // Second Life: highest PnL% (best performance)
  const sortedByPnl = [...survivors].sort((a, b) => b.pnlPercent - a.pnlPercent);

  let wideZoneWinner = sortedByDrawdown[0];
  let secondLifeWinner = sortedByPnl[0];

  // If same trader wins both: give them Second Life, Wide Zone to runner-up
  if (wideZoneWinner.participantId === secondLifeWinner.participantId) {
    // Keep Second Life for the winner (more impactful)
    // Wide Zone goes to next best drawdown who isn't the same person
    wideZoneWinner = sortedByDrawdown.find(
      (s) => s.participantId !== secondLifeWinner.participantId
    ) ?? sortedByDrawdown[1];

    // Edge case: only 2 survivors and same person tops both
    if (!wideZoneWinner || wideZoneWinner.participantId === secondLifeWinner.participantId) {
      // Just award Second Life, skip Wide Zone
      wideZoneWinner = secondLifeWinner; // will be skipped below
    }
  }

  // Award Wide Zone
  if (wideZoneWinner.participantId !== secondLifeWinner.participantId) {
    await supabase
      .from("arena_participants")
      .update({ has_wide_zone: true })
      .eq("id", wideZoneWinner.participantId);

    // Update in-memory state
    const trader = state.traders.get(wideZoneWinner.participantId);
    if (trader) trader.hasWideZone = true;

    await supabase.from("events").insert({
      arena_id: arenaId,
      round_number: roundNumber,
      event_type: "loot_awarded",
      actor_id: wideZoneWinner.userId,
      message: `Wide Zone awarded! +5% drawdown buffer for next round.`,
      data: { loot_type: "wide_zone", max_drawdown: wideZoneWinner.maxDrawdown },
    });

    // Update round record
    await supabase
      .from("rounds")
      .update({ wide_zone_winner_id: wideZoneWinner.userId })
      .eq("arena_id", arenaId)
      .eq("round_number", roundNumber);

    console.log(`[Loot] Wide Zone → ${wideZoneWinner.participantId} (drawdown: ${wideZoneWinner.maxDrawdown.toFixed(1)}%)`);
  }

  // Award Second Life
  await supabase
    .from("arena_participants")
    .update({ has_second_life: true })
    .eq("id", secondLifeWinner.participantId);

  // Update in-memory state
  const slTrader = state.traders.get(secondLifeWinner.participantId);
  if (slTrader) {
    slTrader.hasSecondLife = true;
    slTrader.secondLifeUsed = false;
  }

  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: roundNumber,
    event_type: "loot_awarded",
    actor_id: secondLifeWinner.userId,
    message: `Second Life awarded! One drawdown breach forgiven next round.`,
    data: { loot_type: "second_life", pnl_percent: secondLifeWinner.pnlPercent },
  });

  // Update round record
  await supabase
    .from("rounds")
    .update({ second_life_winner_id: secondLifeWinner.userId })
    .eq("arena_id", arenaId)
    .eq("round_number", roundNumber);

  console.log(`[Loot] Second Life → ${secondLifeWinner.participantId} (PnL: ${secondLifeWinner.pnlPercent.toFixed(1)}%)`);
}
