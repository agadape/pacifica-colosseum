import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/lib/supabase/types";
import type { Json } from "../../../src/lib/supabase/types";
import { PacificaClient } from "../../../src/lib/pacifica/client";
import { keypairFromBase58 } from "../../../src/lib/utils/keypair";
import { decryptPrivateKey } from "../../../src/lib/utils/encryption";
import { getArenaState, removeArena } from "./risk-monitor";
import { stopPeriodicSync } from "./periodic-sync";
import { stopLeaderboardUpdater } from "./leaderboard-updater";
import { getPriceManager } from "../state/price-manager";
import { calcEquity } from "../state/types";

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Eliminate a single trader — close positions, return funds, update DB.
 */
export async function eliminateTrader(
  arenaId: string,
  participantId: string,
  roundNumber: number,
  reason: string,
  details: { equity: number; drawdown?: number; rank?: number; totalTraders?: number }
): Promise<void> {
  const supabase = getSupabase();
  const encryptionKey = process.env.ENCRYPTION_KEY!;
  const state = getArenaState(arenaId);

  // Get participant
  const { data: participant } = await supabase
    .from("arena_participants")
    .select("*")
    .eq("id", participantId)
    .single();

  if (!participant || !participant.subaccount_private_key_encrypted) return;

  const subKeypair = keypairFromBase58(
    decryptPrivateKey(participant.subaccount_private_key_encrypted, encryptionKey)
  );
  const subClient = new PacificaClient({
    secretKey: subKeypair.secretKey,
    publicKey: subKeypair.publicKey,
    testnet: true,
  });

  try {
    // Cancel all open orders
    await subClient.cancelAllOrders({ all_symbols: true, exclude_reduce_only: false });

    // Close all positions via aggressive limit orders
    const { data: positions } = await subClient.getPositions() as {
      data: Array<{ symbol: string; side: string; size: string; mark_price: string }> | null;
    };

    if (positions && positions.length > 0) {
      for (const pos of positions) {
        const closeSide = pos.side === "bid" ? "ask" : "bid";
        const markPrice = parseFloat(pos.mark_price);
        // Aggressive limit: 0.1% worse than mark
        const aggressivePrice = closeSide === "ask"
          ? (markPrice * 0.999).toFixed(4)
          : (markPrice * 1.001).toFixed(4);

        await subClient.createLimitOrder({
          symbol: pos.symbol,
          side: closeSide as "bid" | "ask",
          amount: pos.size,
          price: aggressivePrice,
          reduce_only: true,
          tif: "IOC",
        });
      }

      // Wait 5s, then market close any remaining
      await new Promise((r) => setTimeout(r, 5000));

      const { data: remaining } = await subClient.getPositions() as {
        data: Array<{ symbol: string; side: string; size: string }> | null;
      };

      if (remaining && remaining.length > 0) {
        for (const pos of remaining) {
          const closeSide = pos.side === "bid" ? "ask" : "bid";
          await subClient.createMarketOrder({
            symbol: pos.symbol,
            side: closeSide as "bid" | "ask",
            amount: pos.size,
            reduce_only: true,
            slippage_percent: "5",
          });
        }
      }
    }

    // Transfer remaining funds back to vault
    const { data: arena } = await supabase
      .from("arenas")
      .select("master_wallet_address")
      .eq("id", arenaId)
      .single();

    if (arena?.master_wallet_address) {
      const { data: accInfo } = await subClient.getAccountInfo() as {
        data: { balance?: string } | null;
      };
      if (accInfo?.balance && parseFloat(accInfo.balance) > 0) {
        await subClient.transferFunds({
          to_account: arena.master_wallet_address,
          amount: accInfo.balance,
        });
      }
    }
  } catch (err) {
    console.error(`[Elimination] Error closing positions for ${participantId}:`, err);
  }

  // Update participant status
  await supabase
    .from("arena_participants")
    .update({
      status: "eliminated",
      eliminated_at: new Date().toISOString(),
      eliminated_in_round: roundNumber,
      elimination_reason: reason,
      elimination_equity: details.equity,
      max_drawdown_hit: details.drawdown ?? 0,
    })
    .eq("id", participantId);

  // Record elimination
  const trader = state?.traders.get(participantId);
  const posSnapshot: Record<string, unknown> = {};
  if (trader) {
    for (const [sym, pos] of trader.positions) {
      posSnapshot[sym] = { ...pos };
    }
    trader.status = "eliminated";
  }

  await supabase.from("eliminations").insert({
    arena_id: arenaId,
    participant_id: participantId,
    round_number: roundNumber,
    reason,
    equity_at_elimination: details.equity,
    drawdown_at_elimination: details.drawdown ?? null,
    rank_at_elimination: details.rank ?? null,
    total_traders_at_elimination: details.totalTraders ?? null,
    positions_snapshot: posSnapshot as unknown as Json,
  });

  // Create event
  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: roundNumber,
    event_type: "elimination",
    actor_id: participant.user_id,
    message: `Trader eliminated! Reason: ${reason}`,
    data: { reason, ...details },
  });

  console.log(`[Elimination] ${participantId} eliminated (${reason})`);
}

/**
 * Process ranking elimination — eliminate bottom X% by PnL%.
 */
export async function processRankingElimination(
  arenaId: string,
  roundNumber: number,
  eliminationPercent: number
): Promise<void> {
  const state = getArenaState(arenaId);
  if (!state) return;

  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  // Calculate PnL% for all active traders
  const rankings: Array<{
    participantId: string;
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
    rankings.push({
      participantId: trader.participantId,
      pnlPercent,
      maxDrawdown: trader.maxDrawdownHit,
    });
  }

  if (rankings.length === 0) return;

  // Sort ascending by PnL%, ties broken by highest max drawdown (worse = eliminated first)
  rankings.sort((a, b) => {
    if (a.pnlPercent !== b.pnlPercent) return a.pnlPercent - b.pnlPercent;
    return b.maxDrawdown - a.maxDrawdown;
  });

  // Special case: Round 3 — top 5 advance, rest eliminated
  let eliminateCount: number;
  if (roundNumber === 3) {
    eliminateCount = Math.max(0, rankings.length - 5);
  } else {
    eliminateCount = Math.ceil(rankings.length * (eliminationPercent / 100));
  }

  const toEliminate = rankings.slice(0, eliminateCount);

  for (const entry of toEliminate) {
    const trader = state.traders.get(entry.participantId);
    const equity = trader ? calcEquity(trader, allPrices) : 0;

    await eliminateTrader(arenaId, entry.participantId, roundNumber, "ranking", {
      equity,
      drawdown: entry.maxDrawdown,
      rank: rankings.indexOf(entry) + 1,
      totalTraders: rankings.length,
    });
  }

  console.log(`[Elimination] Round ${roundNumber}: eliminated ${toEliminate.length}/${rankings.length} traders`);
}

/**
 * Process inactivity elimination — AFK traders.
 */
export async function processInactivityElimination(
  arenaId: string,
  roundNumber: number,
  startingCapital: number
): Promise<void> {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  if (!state) return;

  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  const { data: participants } = await supabase
    .from("arena_participants")
    .select("id, user_id, trades_this_round, volume_this_round")
    .eq("arena_id", arenaId)
    .eq("status", "active");

  if (!participants) return;

  const minVolume = startingCapital * 0.1; // 10% of starting capital

  for (const p of participants) {
    const isInactive =
      (p.trades_this_round ?? 0) < 3 || (p.volume_this_round ?? 0) < minVolume;

    if (isInactive) {
      const trader = state.traders.get(p.id);
      const equity = trader ? calcEquity(trader, allPrices) : 0;

      await eliminateTrader(arenaId, p.id, roundNumber, "inactivity", {
        equity,
      });
    }
  }
}
