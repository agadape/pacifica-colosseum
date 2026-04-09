import { getSupabase } from "../db";
import { PacificaClient } from "../../../src/lib/pacifica/client";
import { keypairFromBase58 } from "../../../src/lib/utils/keypair";
import { decryptPrivateKey } from "../../../src/lib/utils/encryption";
import { getPriceManager, type PriceUpdate } from "../state/price-manager";
import type { Json } from "../../../src/lib/supabase/types";
import {
  type ArenaState,
  type TraderState,
  type PositionState,
  calcEquity,
  calcDrawdownPercent,
  getDrawdownLevel,
  type DrawdownLevel,
} from "../state/types";

// All active arenas being monitored
const arenaStates = new Map<string, ArenaState>();

/**
 * Initialize risk monitoring for an arena.
 * Called after startArena() funds all subaccounts.
 */
export async function initArena(arenaId: string): Promise<void> {
  const supabase = getSupabase();
  const encryptionKey = process.env.ENCRYPTION_KEY!;

  const { data: arena } = await supabase
    .from("arenas")
    .select("*")
    .eq("id", arenaId)
    .single();

  if (!arena) {
    console.error(`[RiskMonitor] Arena ${arenaId} not found`);
    return;
  }

  const { data: round } = await supabase
    .from("rounds")
    .select("*")
    .eq("arena_id", arenaId)
    .eq("round_number", arena.current_round)
    .single();

  if (!round) {
    console.error(`[RiskMonitor] Round not found for arena ${arenaId}`);
    return;
  }

  const { data: participants } = await supabase
    .from("arena_participants")
    .select("*")
    .eq("arena_id", arenaId)
    .eq("status", "active");

  if (!participants || participants.length === 0) {
    console.error(`[RiskMonitor] No active participants for arena ${arenaId}`);
    return;
  }

  // Build in-memory state for each trader
  const traders = new Map<string, TraderState>();

  for (const p of participants) {
    // Fetch initial positions from Pacifica (one-time REST)
    const positions = new Map<string, PositionState>();
    try {
      const subKeypair = keypairFromBase58(
        decryptPrivateKey(p.subaccount_private_key_encrypted!, encryptionKey)
      );
      const client = new PacificaClient({
        secretKey: subKeypair.secretKey,
        publicKey: subKeypair.publicKey,
        testnet: true,
      });
      const { data: accInfo } = await client.getAccountInfo() as {
        data: { balance?: string; positions?: Array<{
          symbol: string; side: string; size: string;
          entry_price: string; leverage: number;
        }> } | null;
      };

      if (accInfo?.positions) {
        for (const pos of accInfo.positions) {
          positions.set(pos.symbol, {
            symbol: pos.symbol,
            side: pos.side === "bid" ? "long" : "short",
            size: parseFloat(pos.size),
            entryPrice: parseFloat(pos.entry_price),
            leverage: pos.leverage,
          });
        }
      }
    } catch (err) {
      console.error(`[RiskMonitor] Failed to fetch positions for ${p.id}:`, err);
    }

    const baseline = p.equity_round_1_start ?? arena.starting_capital;
    traders.set(p.id, {
      participantId: p.id,
      userId: p.user_id,
      subaccountAddress: p.subaccount_address ?? "",
      balance: baseline,
      positions,
      equityBaseline: baseline,
      currentEquity: baseline,
      currentDrawdownPercent: 0,
      maxDrawdownHit: 0,
      hasWideZone: p.has_wide_zone,
      hasSecondLife: p.has_second_life,
      secondLifeUsed: p.second_life_used,
      isInGracePeriod: false,
      status: "active",
      territoryDrawdownBuffer: 0, // populated by executeTerritoryDraft(); reloaded from DB on engine restart (Step 3.6)
    });
  }

  const arenaState: ArenaState = {
    arenaId,
    traders,
    currentRound: arena.current_round,
    maxDrawdownPercent: round.max_drawdown_percent,
    maxLeverage: round.max_leverage,
    allowedPairs: round.allowed_pairs,
    status: arena.status,
  };

  arenaStates.set(arenaId, arenaState);

  // Step 3.6: Reload territory drawdown buffers from DB on engine restart.
  // executeTerritoryDraft() populates territoryDrawdownBuffer in-memory at draft time,
  // but Railway restarts wipe in-memory state. This restores buffers from the DB
  // so traders don't silently lose their drawdown protection after a restart.
  try {
    type PtWithBuffer = { participant_id: string; territories: { drawdown_buffer_percent: number } };
    const { data: activeTerritories } = await supabase
      .from("participant_territories")
      .select("participant_id, territories!inner(drawdown_buffer_percent)")
      .eq("arena_id", arenaId)
      .eq("is_active", true);

    for (const pt of (activeTerritories as unknown as PtWithBuffer[] | null) ?? []) {
      const trader = traders.get(pt.participant_id);
      if (trader) {
        trader.territoryDrawdownBuffer = pt.territories.drawdown_buffer_percent ?? 0;
      }
    }
    console.log(`[RiskMonitor] Territory buffers restored for arena ${arenaId}`);
  } catch (err) {
    console.error(`[RiskMonitor] Failed to restore territory buffers:`, err);
  }

  // Listen for price updates
  const priceManager = getPriceManager();
  priceManager.on("price", (update: PriceUpdate) => {
    onPriceUpdate(arenaId, update.symbol);
  });

  console.log(`[RiskMonitor] Initialized arena ${arenaId} with ${traders.size} traders`);
}

/**
 * Called on every price tick. Recalculates equity and checks drawdown.
 */
function onPriceUpdate(arenaId: string, symbol: string): void {
  const state = arenaStates.get(arenaId);
  if (!state) return;

  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  for (const [, trader] of state.traders) {
    if (trader.status !== "active") continue;
    if (trader.isInGracePeriod) continue;

    // Skip if this trader has no position in the updated symbol
    if (!trader.positions.has(symbol)) continue;

    // Calculate equity locally
    const equity = calcEquity(trader, allPrices);
    trader.currentEquity = equity;

    // Calculate drawdown
    const drawdown = calcDrawdownPercent(equity, trader.equityBaseline);
    trader.currentDrawdownPercent = drawdown;
    if (drawdown > trader.maxDrawdownHit) {
      trader.maxDrawdownHit = drawdown;
    }

    // Apply Wide Zone bonus (+5%) and territory drawdown buffer (cached, no DB query)
    const effectiveMax = state.maxDrawdownPercent
      + (trader.hasWideZone ? 5 : 0)
      + (trader.territoryDrawdownBuffer ?? 0);

    // Check drawdown breach
    if (drawdown >= effectiveMax) {
      handleDrawdownBreach(state, trader);
    }
  }
}

/**
 * Handle a drawdown breach — trigger elimination or Second Life.
 */
async function handleDrawdownBreach(
  state: ArenaState,
  trader: TraderState
): Promise<void> {
  const supabase = getSupabase();

  // Check Second Life
  if (trader.hasSecondLife && !trader.secondLifeUsed) {
    trader.secondLifeUsed = true;
    trader.equityBaseline = trader.currentEquity; // reset baseline
    trader.currentDrawdownPercent = 0;

    await supabase
      .from("arena_participants")
      .update({
        second_life_used: true,
      })
      .eq("id", trader.participantId);

    await supabase.from("events").insert({
      arena_id: state.arenaId,
      round_number: state.currentRound,
      event_type: "second_life_used",
      actor_id: trader.userId,
      message: `Trader used Second Life! Baseline reset.`,
      data: {
        equity: trader.currentEquity,
        drawdown: trader.currentDrawdownPercent,
      },
    });

    console.log(`[RiskMonitor] ${trader.participantId} used Second Life`);
    return;
  }

  // Eliminate trader
  trader.status = "eliminated";

  await supabase
    .from("arena_participants")
    .update({
      status: "eliminated",
      eliminated_at: new Date().toISOString(),
      eliminated_in_round: state.currentRound,
      elimination_reason: "drawdown_breach",
      elimination_equity: trader.currentEquity,
      max_drawdown_hit: trader.maxDrawdownHit,
    })
    .eq("id", trader.participantId);

  // Record elimination
  const snapshot: Record<string, { symbol: string; side: string; size: number; entryPrice: number; leverage: number }> = {};
  for (const [symbol, pos] of trader.positions) {
    snapshot[symbol] = { ...pos };
  }
  const positionsSnapshot = snapshot as unknown as Json;
  await supabase.from("eliminations").insert({
    arena_id: state.arenaId,
    participant_id: trader.participantId,
    round_number: state.currentRound,
    reason: "drawdown_breach",
    equity_at_elimination: trader.currentEquity,
    drawdown_at_elimination: trader.currentDrawdownPercent,
    positions_snapshot: positionsSnapshot,
  });

  // Create event
  await supabase.from("events").insert({
    arena_id: state.arenaId,
    round_number: state.currentRound,
    event_type: "elimination",
    actor_id: trader.userId,
    message: `Trader eliminated! Drawdown: ${trader.currentDrawdownPercent.toFixed(1)}%`,
    data: {
      reason: "drawdown_breach",
      equity: trader.currentEquity,
      drawdown: trader.currentDrawdownPercent,
    },
  });

  console.log(`[RiskMonitor] ${trader.participantId} ELIMINATED at ${trader.currentDrawdownPercent.toFixed(1)}% drawdown`);
}

/**
 * Called when a trade is executed — update in-memory position cache.
 */
export function onTradeExecuted(
  arenaId: string,
  participantId: string,
  trade: { symbol: string; side: "buy" | "sell"; size: number; price: number; leverage?: number }
): void {
  const state = arenaStates.get(arenaId);
  if (!state) return;

  const trader = state.traders.get(participantId);
  if (!trader) return;

  const positionSide = trade.side === "buy" ? "long" : "short";
  const existing = trader.positions.get(trade.symbol);

  if (!existing) {
    // New position
    trader.positions.set(trade.symbol, {
      symbol: trade.symbol,
      side: positionSide,
      size: trade.size,
      entryPrice: trade.price,
      leverage: trade.leverage ?? 1,
    });
  } else if (existing.side === positionSide) {
    // Increase position — weighted average entry price
    const totalSize = existing.size + trade.size;
    existing.entryPrice =
      (existing.entryPrice * existing.size + trade.price * trade.size) / totalSize;
    existing.size = totalSize;
  } else {
    // Reduce or close position
    if (trade.size >= existing.size) {
      // Close position — realize PnL to balance
      const pnl =
        (trade.price - existing.entryPrice) *
        existing.size *
        (existing.side === "long" ? 1 : -1);
      trader.balance += pnl;
      trader.positions.delete(trade.symbol);

      // If there's remaining size, open reverse position
      const remaining = trade.size - existing.size;
      if (remaining > 0) {
        trader.positions.set(trade.symbol, {
          symbol: trade.symbol,
          side: positionSide,
          size: remaining,
          entryPrice: trade.price,
          leverage: trade.leverage ?? 1,
        });
      }
    } else {
      // Partial close
      const pnl =
        (trade.price - existing.entryPrice) *
        trade.size *
        (existing.side === "long" ? 1 : -1);
      trader.balance += pnl;
      existing.size -= trade.size;
    }
  }
}

/**
 * Update round parameters (called on round transition).
 */
export function updateArenaRound(
  arenaId: string,
  roundNumber: number,
  maxDrawdownPercent: number,
  maxLeverage: number,
  allowedPairs: string[]
): void {
  const state = arenaStates.get(arenaId);
  if (!state) return;

  state.currentRound = roundNumber;
  state.maxDrawdownPercent = maxDrawdownPercent;
  state.maxLeverage = maxLeverage;
  state.allowedPairs = allowedPairs;

  // Reset drawdown baselines for surviving traders
  for (const [, trader] of state.traders) {
    if (trader.status === "active") {
      trader.equityBaseline = trader.currentEquity;
      trader.currentDrawdownPercent = 0;
      trader.hasWideZone = false;
      trader.hasSecondLife = false;
      trader.secondLifeUsed = false;
      trader.isInGracePeriod = false;
    }
  }
}

/**
 * Get arena state (for periodic sync and leaderboard).
 */
export function getArenaState(arenaId: string): ArenaState | undefined {
  return arenaStates.get(arenaId);
}

/**
 * Remove arena from monitoring.
 */
export function removeArena(arenaId: string): void {
  arenaStates.delete(arenaId);
}
