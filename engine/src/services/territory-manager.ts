/**
 * Territory Manager Service
 *
 * WHAT THIS DOES:
 * Manages the territory board game mechanic where traders draft and fight for
 * board positions that provide trading advantages.
 *
 * KEY CONCEPTS:
 * 1. Territory Grid: Dynamic NxM grid where each cell has modifiers (PnL bonus, DD buffer, etc.)
 * 2. Draft: Snake draft assigns territories to traders at round start
 * 3. Skirmish: Every 60s, traders can attack adjacent territories to steal them
 * 4. Elimination: Traders in bottom-row "elimination zones" are eliminated at round end
 * 5. PnL Bonus: Territory modifiers are applied multiplicatively to trader PnL
 *
 * HOW IT CONNECTS:
 * - Called by arena-manager.ts (generateTerritories) when arena starts
 * - Called by round-engine.ts (executeTerritoryDraft) when round begins
 * - Called by round-engine.ts (processTerritoryElimination) when round ends
 * - Called by skirmish-scheduler.ts (resolveSkirmish) every 60s
 * - Calls elimination-engine.ts (eliminateTrader) to remove traders
 * - Calls risk-monitor.ts (getArenaState) for live trader data
 * - Calls price-manager.ts (getAllPrices) for PnL calculation
 */

import { getSupabase } from "../db";
import { getArenaState } from "./risk-monitor";
import { getPriceManager } from "../state/price-manager";
import { calcEquity } from "../state/types";
import { eliminateTrader } from "./elimination-engine";
import { ROUND_PARAMS } from "../../../src/lib/utils/constants";
import { getAveragedPnlMap } from "./alliance-manager";

// ============================================================
// GRID CONFIGURATION
// ============================================================

interface GridConfig {
  rows: number;
  cols: number;
  eliminationRows: number;
}

/**
 * Calculate grid size based on participant count.
 * Every participant gets exactly 1 territory. Bottom rows are elimination zones.
 */
export function calculateGridSize(participantCount: number): GridConfig {
  if (participantCount <= 6) return { rows: 2, cols: 3, eliminationRows: 1 };
  if (participantCount <= 12) return { rows: 3, cols: 4, eliminationRows: 1 };
  if (participantCount <= 20) return { rows: 4, cols: 5, eliminationRows: 2 };
  if (participantCount <= 50) return { rows: 5, cols: 6, eliminationRows: 2 };
  return { rows: 6, cols: 8, eliminationRows: 3 };
}

// ============================================================
// TERRITORY GENERATION
// ============================================================

/**
 * Generate territory grid for an arena.
 * Called by arena-manager.ts:startArena() AFTER participants are funded.
 */
export async function generateTerritories(arenaId: string): Promise<void> {
  const supabase = getSupabase();

  // Check arena exists
  const { data: arena } = await supabase
    .from("arenas")
    .select("id")
    .eq("id", arenaId)
    .single();

  if (!arena) {
    console.error(`[Territory] Arena ${arenaId} not found`);
    return;
  }

  // Count active participants (separate query avoids relational type issues)
  const { count } = await supabase
    .from("arena_participants")
    .select("id", { count: "exact", head: true })
    .eq("arena_id", arenaId)
    .eq("status", "active");

  const participantCount = count ?? 4;
  const { rows, cols, eliminationRows } = calculateGridSize(participantCount);
  const round1Params = ROUND_PARAMS[0];

  const territories: Array<{
    arena_id: string;
    row_index: number;
    col_index: number;
    cell_label: string;
    pnl_bonus_percent: number;
    drawdown_buffer_percent: number;
    leverage_override: number;
    max_position_size: number;
    is_elimination_zone: boolean;
    elimination_priority: number;
  }> = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const modifiers = calculateTerritoryModifiers(row, rows);
      const cellLabel = `${String.fromCharCode(65 + col)}${row + 1}`; // A1, B1, C1, A2...

      territories.push({
        arena_id: arenaId,
        row_index: row,
        col_index: col,
        cell_label: cellLabel,
        pnl_bonus_percent: modifiers.pnlBonus,
        drawdown_buffer_percent: modifiers.drawdownBuffer,
        leverage_override: Math.round(round1Params.maxLeverage * modifiers.leverageMultiplier),
        max_position_size: modifiers.maxPositionSize,
        is_elimination_zone: row >= rows - eliminationRows,
        elimination_priority: row * cols + col,
      });
    }
  }

  const { error } = await supabase.from("territories").insert(territories);
  if (error) {
    console.error(`[Territory] Failed to generate territories:`, error);
    return;
  }

  console.log(`[Territory] Generated ${territories.length} territories for arena ${arenaId}`);
}

/**
 * Calculate modifiers for a cell based on row position.
 * rowRatio 0.0 = top row (best), 1.0 = bottom row (worst).
 */
function calculateTerritoryModifiers(rowIndex: number, totalRows: number) {
  const rowRatio = totalRows > 1 ? rowIndex / (totalRows - 1) : 0;

  return {
    pnlBonus: Math.round((1 - rowRatio * 1.5) * 100) / 100 * 8,
    drawdownBuffer: Math.round((1 - rowRatio * 1.6) * 100) / 100 * 5,
    leverageMultiplier: 1 - rowRatio * 0.5,
    maxPositionSize: Math.round(500 - rowRatio * 350),
  };
}

// ============================================================
// TERRITORY DRAFT (SNAKE DRAFT)
// ============================================================

interface DraftPick {
  pick: number;
  participantId: string;
}

/**
 * Execute snake draft to assign territories to traders.
 * Called by arena-manager.ts (Round 1) and round-engine.ts:beginNextRound() (Rounds 2+).
 *
 * Draft order: sorted by previous round PnL DESC (best picks first).
 * Snake: forward pass then reverse — last place gets first pick of next "round".
 */
export async function executeTerritoryDraft(
  arenaId: string,
  roundNumber: number
): Promise<void> {
  const supabase = getSupabase();

  const { data: participants } = await supabase
    .from("arena_participants")
    .select("id, total_pnl_percent")
    .eq("arena_id", arenaId)
    .eq("status", "active")
    .order("total_pnl_percent", { ascending: false });

  if (!participants?.length) return;

  const { data: territories } = await supabase
    .from("territories")
    .select("*")
    .eq("arena_id", arenaId)
    .order("pnl_bonus_percent", { ascending: false });

  if (!territories?.length) return;

  const draftOrder = generateSnakeOrder(participants);
  const assignedTerritories = new Set<string>();
  const arenaState = getArenaState(arenaId);

  for (const pick of draftOrder) {
    const bestAvailable = territories.find((t) => !assignedTerritories.has(t.id));
    if (!bestAvailable) continue;

    await supabase.from("participant_territories").insert({
      arena_id: arenaId,
      participant_id: pick.participantId,
      territory_id: bestAvailable.id,
      acquired_via: "draft",
      pnl_at_acquisition: 0,
      round_acquired: roundNumber,
    });

    assignedTerritories.add(bestAvailable.id);

    // Update in-memory TraderState with drawdown buffer for hot-path access
    if (arenaState) {
      const traderState = arenaState.traders.get(pick.participantId);
      if (traderState) {
        traderState.territoryDrawdownBuffer = bestAvailable.drawdown_buffer_percent ?? 0;
      }
    }

    await supabase.from("events").insert({
      arena_id: arenaId,
      round_number: roundNumber,
      event_type: "territory_draft",
      actor_id: pick.participantId,
      message: `Trader drafted territory ${bestAvailable.cell_label}`,
      data: {
        territory_id: bestAvailable.id,
        cell_label: bestAvailable.cell_label,
        pnl_bonus_percent: bestAvailable.pnl_bonus_percent,
      },
    });
  }

  console.log(`[Territory] Draft complete for arena ${arenaId}, round ${roundNumber}`);
}

/**
 * Generate snake draft order.
 * Full forward pass [A,B,C,D] + full reverse pass [D,C,B,A], then slice to n picks.
 * Produces correct [A,B,C,D] order, NOT the buggy interleaved [A,D,B,C].
 */
function generateSnakeOrder(participants: Array<{ id: string }>): DraftPick[] {
  const order: DraftPick[] = [];
  let pickNumber = 1;

  for (const p of participants) {
    order.push({ pick: pickNumber++, participantId: p.id });
  }
  for (const p of [...participants].reverse()) {
    order.push({ pick: pickNumber++, participantId: p.id });
  }

  return order.slice(0, participants.length);
}

// ============================================================
// TERRITORY SKIRMISH
// ============================================================

export const SKIRMISH_PNL_THRESHOLD = 1.15;

/**
 * Resolve a territory skirmish between attacker and defender.
 * Attacker needs PnL >= defender PnL * 1.15 to win.
 * If attacker wins: territories are swapped.
 */
export async function resolveSkirmish(
  arenaId: string,
  roundNumber: number,
  attackerId: string,
  defenderId: string
): Promise<{
  success: boolean;
  error?: string;
  winner?: "attacker" | "defender";
  territoriesSwapped?: boolean;
}> {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  const [attackerTerritory, defenderTerritory] = await Promise.all([
    supabase
      .from("participant_territories")
      .select("territory_id, is_active")
      .eq("arena_id", arenaId)
      .eq("participant_id", attackerId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("participant_territories")
      .select("territory_id, is_active")
      .eq("arena_id", arenaId)
      .eq("participant_id", defenderId)
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  if (!attackerTerritory.data || !defenderTerritory.data) {
    return { success: false, error: "Territory ownership not found" };
  }

  const [attTerritoryDetails, defTerritoryDetails] = await Promise.all([
    supabase
      .from("territories")
      .select("row_index, col_index, is_elimination_zone")
      .eq("id", attackerTerritory.data.territory_id)
      .single(),
    supabase
      .from("territories")
      .select("row_index, col_index, is_elimination_zone")
      .eq("id", defenderTerritory.data.territory_id)
      .single(),
  ]);

  if (!attTerritoryDetails.data || !defTerritoryDetails.data) {
    return { success: false, error: "Territory details not found" };
  }

  if (!isAdjacent(attTerritoryDetails.data, defTerritoryDetails.data)) {
    return { success: false, error: "Territories not adjacent" };
  }

  if (defTerritoryDetails.data.is_elimination_zone) {
    return { success: false, error: "Cannot attack elimination zone holder" };
  }

  const attackerState = state?.traders.get(attackerId);
  const defenderState = state?.traders.get(defenderId);

  if (!attackerState || !defenderState) {
    return { success: false, error: "Trader state not found" };
  }

  const attackerPnl = calcEquity(attackerState, allPrices) / attackerState.equityBaseline - 1;
  const defenderPnl = calcEquity(defenderState, allPrices) / defenderState.equityBaseline - 1;

  const requiredLead = defenderPnl * SKIRMISH_PNL_THRESHOLD;
  const attackerWins = attackerPnl >= requiredLead;

  if (attackerWins) {
    await swapTerritories(
      arenaId,
      attackerId,
      defenderId,
      attackerTerritory.data.territory_id,
      defenderTerritory.data.territory_id,
      roundNumber
    );

    // G4 FIX: Log the contested territory (defender's), not attacker's old territory
    // The skirmish is about who controls the defender's cell
    await supabase.from("territory_skirmishes").insert({
      arena_id: arenaId,
      round_number: roundNumber,
      attacker_id: attackerId,
      defender_id: defenderId,
      territory_id: defenderTerritory.data.territory_id,
      attacker_pnl_percent: attackerPnl,
      defender_pnl_percent: defenderPnl,
      pnl_difference: attackerPnl - defenderPnl,
      skirmish_won_by: "attacker",
      required_pnl_lead: requiredLead,
      met_threshold: true,
    });

    await supabase.from("events").insert({
      arena_id: arenaId,
      round_number: roundNumber,
      event_type: "territory_skirmish",
      actor_id: attackerId,
      target_id: defenderId,
      message: `Territory stolen! Attacker won with ${(attackerPnl * 100).toFixed(1)}% vs ${(defenderPnl * 100).toFixed(1)}%`,
      data: { attacker_pnl: attackerPnl, defender_pnl: defenderPnl, territories_swapped: true },
    });

    return { success: true, winner: "attacker", territoriesSwapped: true };
  } else {
    // G4 FIX: Even on defender win, log the contested territory (defender's)
    await supabase.from("territory_skirmishes").insert({
      arena_id: arenaId,
      round_number: roundNumber,
      attacker_id: attackerId,
      defender_id: defenderId,
      territory_id: defenderTerritory.data.territory_id,
      attacker_pnl_percent: attackerPnl,
      defender_pnl_percent: defenderPnl,
      pnl_difference: attackerPnl - defenderPnl,
      skirmish_won_by: "defender",
      required_pnl_lead: requiredLead,
      met_threshold: false,
    });

    return { success: true, winner: "defender", territoriesSwapped: false };
  }
}

function isAdjacent(
  a: { row_index: number; col_index: number },
  b: { row_index: number; col_index: number }
): boolean {
  const rowDiff = Math.abs(a.row_index - b.row_index);
  const colDiff = Math.abs(a.col_index - b.col_index);
  return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

async function swapTerritories(
  arenaId: string,
  attackerId: string,
  defenderId: string,
  attackerTerritoryId: string,
  defenderTerritoryId: string,
  roundNumber: number
): Promise<void> {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  const attackerState = state?.traders.get(attackerId);
  const defenderState = state?.traders.get(defenderId);
  const attackerPnl = attackerState
    ? calcEquity(attackerState, allPrices) / attackerState.equityBaseline - 1
    : 0;
  const defenderPnl = defenderState
    ? calcEquity(defenderState, allPrices) / defenderState.equityBaseline - 1
    : 0;

  await supabase
    .from("participant_territories")
    .update({ is_active: false, pnl_at_release: attackerPnl })
    .eq("participant_id", attackerId)
    .eq("territory_id", attackerTerritoryId)
    .eq("is_active", true);

  await supabase
    .from("participant_territories")
    .update({ is_active: false, pnl_at_release: defenderPnl })
    .eq("participant_id", defenderId)
    .eq("territory_id", defenderTerritoryId)
    .eq("is_active", true);

  // Attacker gets defender's territory; defender gets attacker's territory
  await supabase.from("participant_territories").insert({
    arena_id: arenaId,
    participant_id: attackerId,
    territory_id: defenderTerritoryId,
    acquired_via: "skirmish",
    pnl_at_acquisition: attackerPnl,
    round_acquired: roundNumber,
  });

  await supabase.from("participant_territories").insert({
    arena_id: arenaId,
    participant_id: defenderId,
    territory_id: attackerTerritoryId,
    acquired_via: "skirmish",
    pnl_at_acquisition: defenderPnl,
    round_acquired: roundNumber,
  });
}

// ============================================================
// TERRITORY-BASED ELIMINATION
// ============================================================

/**
 * Process territory-based elimination at round end.
 * REPLACES processRankingElimination — do NOT call both.
 *
 * Traders in elimination zone cells are eliminated first (regardless of PnL),
 * then remaining bottom X% by PnL are eliminated.
 */
export async function processTerritoryElimination(
  arenaId: string,
  roundNumber: number
): Promise<void> {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  type PtWithTerritory = {
    participant_id: string;
    territory_id: string;
    territories: { is_elimination_zone: boolean; elimination_priority: number; pnl_bonus_percent: number };
  };

  const { data: rawPt } = await supabase
    .from("participant_territories")
    .select(`
      participant_id,
      territory_id,
      territories!inner (
        is_elimination_zone,
        elimination_priority,
        pnl_bonus_percent
      )
    `)
    .eq("arena_id", arenaId)
    .eq("is_active", true);

  const participantTerritories = rawPt as unknown as PtWithTerritory[] | null;

  if (!participantTerritories?.length) return;

  // M-3: Get alliance-averaged PnL for elimination ranking
  const alliancePnlMap = await getAveragedPnlMap(arenaId);

  const rankings = participantTerritories.map((pt) => {
    const trader = state?.traders.get(pt.participant_id);
    const territory = pt.territories;
    // Use alliance-averaged PnL if participant is in an alliance, else individual
    const rawPnl = alliancePnlMap.has(pt.participant_id)
      ? alliancePnlMap.get(pt.participant_id)!
      : (trader ? calcEquity(trader, allPrices) / trader.equityBaseline - 1 : 0);
    // Apply territory PnL bonus to ranking — top-row traders rank higher, less likely eliminated
    const pnl = rawPnl * (1 + territory.pnl_bonus_percent / 100);

    return {
      participantId: pt.participant_id,
      pnl,
      isEliminationZone: territory.is_elimination_zone,
      eliminationPriority: territory.elimination_priority,
    };
  });

  // Elimination zone traders first (by priority), then by PnL ascending
  rankings.sort((a, b) => {
    if (a.isEliminationZone !== b.isEliminationZone) {
      return a.isEliminationZone ? -1 : 1;
    }
    if (a.pnl !== b.pnl) return a.pnl - b.pnl;
    return a.eliminationPriority - b.eliminationPriority;
  });

  const roundParams = ROUND_PARAMS[roundNumber - 1];
  let eliminateCount: number;

  if (roundParams?.eliminationPercent > 0) {
    eliminateCount = Math.ceil(rankings.length * (roundParams.eliminationPercent / 100));
  } else if (roundNumber === 3) {
    eliminateCount = Math.max(0, rankings.length - 5);
  } else {
    eliminateCount = 0;
  }

  const toEliminate = rankings.slice(0, eliminateCount);

  for (const entry of toEliminate) {
    const trader = state?.traders.get(entry.participantId);
    const equity = trader ? calcEquity(trader, allPrices) : 0;

    await eliminateTrader(arenaId, entry.participantId, roundNumber, "territory_elimination", {
      equity,
      drawdown: trader?.maxDrawdownHit ?? 0,
    });

    // Clean up territory — eliminateTrader() does NOT do this
    await supabase
      .from("participant_territories")
      .update({
        is_active: false,
        pnl_at_release: entry.pnl * 100,
      })
      .eq("arena_id", arenaId)
      .eq("participant_id", entry.participantId)
      .eq("is_active", true);
  }

  console.log(
    `[Territory] Eliminated ${toEliminate.length}/${rankings.length} traders in arena ${arenaId}, round ${roundNumber}`
  );
}

// ============================================================
// PNL BONUS CALCULATION
// ============================================================

/**
 * Calculate adjusted PnL with territory bonus applied.
 * adjustedPnl = rawPnl * (1 + territoryBonus / 100)
 */
export function calculateAdjustedPnl(
  rawPnl: number,
  territory: { pnl_bonus_percent: number }
): number {
  return rawPnl * (1 + territory.pnl_bonus_percent / 100);
}

// ============================================================
// GET TERRITORY BOARD STATE (FOR FRONTEND)
// ============================================================

interface TerritoryCell {
  id: string;
  label: string;
  row: number;
  col: number;
  pnlBonusPercent: number;
  drawdownBufferPercent: number;
  leverageOverride: number | null;
  maxPositionSize: number | null;
  isEliminationZone: boolean;
  holder: {
    participantId: string;
    userId: string;
    username: string | null;
    avatarUrl: string | null;
    currentPnlPercent: number;
    status: string;
  } | null;
}

/**
 * Get the complete territory board state for frontend display.
 * Called by engine internal API GET /internal/arenas/:id/territories.
 */
export async function getTerritoryBoardState(arenaId: string) {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  const { data: territories } = await supabase
    .from("territories")
    .select("*")
    .eq("arena_id", arenaId)
    .order("row_index", { ascending: true })
    .order("col_index", { ascending: true });

  if (!territories?.length) return null;

  const { data: participantTerritories } = await supabase
    .from("participant_territories")
    .select("participant_id, territory_id")
    .eq("arena_id", arenaId)
    .eq("is_active", true);

  const participantIds = participantTerritories?.map((pt) => pt.participant_id) ?? [];

  type ParticipantWithUser = {
    id: string;
    user_id: string;
    total_pnl_percent: number;
    status: string;
    users: { username: string | null; avatar_url: string | null } | null;
  };

  const rawParticipants = participantIds.length
    ? (await supabase
        .from("arena_participants")
        .select("id, user_id, total_pnl_percent, status, users(username, avatar_url)")
        .in("id", participantIds)).data
    : [];
  const participants = rawParticipants as unknown as ParticipantWithUser[] | null;

  const rows = Math.max(...territories.map((t) => t.row_index)) + 1;
  const cols = Math.max(...territories.map((t) => t.col_index)) + 1;

  const grid: Array<Array<TerritoryCell | null>> = Array.from({ length: rows }, () =>
    Array(cols).fill(null)
  );

  for (const territory of territories) {
    const pt = participantTerritories?.find((p) => p.territory_id === territory.id);
    const participant = participants?.find((p) => p.id === pt?.participant_id);
    const trader = pt ? state?.traders.get(pt.participant_id) : null;
    const pnl = trader
      ? calcEquity(trader, allPrices) / trader.equityBaseline - 1
      : 0;

    grid[territory.row_index][territory.col_index] = {
      id: territory.id,
      label: territory.cell_label,
      row: territory.row_index,
      col: territory.col_index,
      pnlBonusPercent: territory.pnl_bonus_percent,
      drawdownBufferPercent: territory.drawdown_buffer_percent,
      leverageOverride: territory.leverage_override,
      maxPositionSize: territory.max_position_size,
      isEliminationZone: territory.is_elimination_zone,
      holder: participant
        ? {
            participantId: participant.id,
            userId: participant.user_id,
            username: (participant.users as { username: string | null } | null)?.username ?? null,
            avatarUrl: (participant.users as { avatar_url: string | null } | null)?.avatar_url ?? null,
            currentPnlPercent: pnl,
            status: participant.status,
          }
        : null,
    };
  }

  return { rows, cols, grid };
}
