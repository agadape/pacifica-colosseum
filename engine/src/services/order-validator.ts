import type { Database } from "../../../src/lib/supabase/types";
import { ROUND_PARAMS } from "../../../src/lib/utils/constants";
import { getSupabase } from "../db";
import { getArenaState } from "./risk-monitor";

type ArenaRow = Database["public"]["Tables"]["arenas"]["Row"];
type ParticipantRow = Database["public"]["Tables"]["arena_participants"]["Row"];
type RoundRow = Database["public"]["Tables"]["rounds"]["Row"];

export interface OrderInput {
  type: "market" | "limit";
  symbol: string;
  side: "bid" | "ask";
  size: string;
  price?: string;
  leverage?: number;
  reduce_only?: boolean;
  slippage_percent?: string;
  tif?: "GTC" | "IOC" | "FOK" | "POST_ONLY";
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  arena?: ArenaRow;
  participant?: ParticipantRow;
  round?: RoundRow;
}

/**
 * Validate an order against the current round rules.
 */
export async function validateOrder(
  arenaId: string,
  userId: string,
  order: OrderInput
): Promise<ValidationResult> {
  const supabase = getSupabase();

  // Fetch arena
  const { data: arena } = await supabase
    .from("arenas")
    .select("*")
    .eq("id", arenaId)
    .single();

  if (!arena) {
    return { valid: false, error: "Arena not found" };
  }

  // Check arena is in an active round
  const activeStatuses = ["round_1", "round_2", "round_3", "sudden_death"];
  if (!activeStatuses.includes(arena.status)) {
    return { valid: false, error: "Arena is not in an active trading round" };
  }

  // Fetch participant
  const { data: participant } = await supabase
    .from("arena_participants")
    .select("*")
    .eq("arena_id", arenaId)
    .eq("user_id", userId)
    .single();

  if (!participant) {
    return { valid: false, error: "Not a participant in this arena" };
  }

  if (participant.status !== "active") {
    return { valid: false, error: `Cannot trade — status is "${participant.status}"` };
  }

  // Fetch current round
  const { data: round } = await supabase
    .from("rounds")
    .select("*")
    .eq("arena_id", arenaId)
    .eq("round_number", arena.current_round)
    .single();

  if (!round) {
    return { valid: false, error: "Current round not found" };
  }

  // Check grace period — only reduce/close orders allowed
  const now = new Date();
  const roundEnd = new Date(round.ends_at);
  const graceStart = new Date(roundEnd.getTime()); // grace period is AFTER round ends
  if (round.status === "eliminating") {
    if (!order.reduce_only) {
      return { valid: false, error: "Grace period active — only reduce/close orders allowed" };
    }
  }

  // Check symbol is in allowed pairs
  if (!round.allowed_pairs.includes(order.symbol)) {
    return {
      valid: false,
      error: `Symbol "${order.symbol}" not allowed in this round. Allowed: ${round.allowed_pairs.join(", ")}`,
    };
  }

  // Check leverage — against round max AND territory override (whichever is lower)
  if (order.leverage) {
    // Fetch territory leverage cap (one query at order time — not in hot path)
    const { data: activeTerritory } = await supabase
      .from("participant_territories")
      .select("territories!inner(leverage_override)")
      .eq("arena_id", arenaId)
      .eq("participant_id", participant.id)
      .eq("is_active", true)
      .maybeSingle();

    type TerritoryOverride = { territories: { leverage_override: number | null } };
    const territoryLevCap = (activeTerritory as unknown as TerritoryOverride | null)
      ?.territories?.leverage_override ?? null;

    // Progression Aggressive path adds a personal leverage bonus on top of the round cap
    const arenaStateLev = getArenaState(arenaId);
    const progressionBonus = arenaStateLev?.traders.get(participant.id)?.progressionLeverageBonus ?? 0;
    const baseMaxLeverage = round.max_leverage + progressionBonus;

    const effectiveMaxLeverage = territoryLevCap !== null
      ? Math.min(baseMaxLeverage, territoryLevCap)
      : baseMaxLeverage;

    if (order.leverage > effectiveMaxLeverage) {
      return {
        valid: false,
        error: `Leverage ${order.leverage}x exceeds effective max of ${effectiveMaxLeverage}x (territory cap)`,
      };
    }

    // Check for active Sabotage effect targeting this participant
    const nowIso = new Date().toISOString();
    const { data: sabotageEffect } = await supabase
      .from("active_ability_effects")
      .select("effect_value")
      .eq("arena_id", arenaId)
      .eq("target_participant_id", participant.id)
      .eq("effect_type", "target_leverage_reduction")
      .eq("is_active", true)
      .gt("expires_at", nowIso)
      .maybeSingle();

    if (sabotageEffect) {
      const sabotageMax = Math.floor(effectiveMaxLeverage * (sabotageEffect.effect_value ?? 0.5));
      if (order.leverage > sabotageMax) {
        return {
          valid: false,
          error: `Leverage ${order.leverage}x exceeds sabotaged max of ${sabotageMax}x`,
        };
      }
    }
  }

  // Check active hazard overrides (read from ArenaState — no DB query)
  const arenaState = getArenaState(arenaId);
  if (arenaState) {
    // Hazard: Short Ban — block ask (short) orders
    if (arenaState.activeHazardSideRestriction === order.side) {
      return {
        valid: false,
        error: `Short orders are currently banned — Short Ban hazard active`,
      };
    }

    // Hazard: Leverage Emergency — cap at hazard override (only if tighter than current effective max)
    if (order.leverage && arenaState.activeHazardLeverageCap !== null) {
      if (order.leverage > arenaState.activeHazardLeverageCap) {
        return {
          valid: false,
          error: `Leverage ${order.leverage}x blocked — Leverage Emergency active (max ${arenaState.activeHazardLeverageCap}x)`,
        };
      }
    }
  }

  // Check margin mode (Round 2+ requires isolated)
  if (round.margin_mode === "isolated" && order.type === "market") {
    // Margin mode is enforced at the account level via Pacifica API
    // We just validate the intent here — actual enforcement happens on Pacifica side
  }

  return { valid: true, arena, participant, round };
}
