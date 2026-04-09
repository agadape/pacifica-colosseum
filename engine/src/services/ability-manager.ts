/**
 * Ability Manager Service
 *
 * WHAT THIS DOES:
 * Awards ability cards to top performers at round end.
 * Handles ability activation and applies effects to in-memory TraderState.
 *
 * ABILITIES IMPLEMENTED:
 * - shield:       60s elimination immunity (TraderState.abilityShieldUntil)
 * - fortress:     +10% drawdown buffer for round (TraderState.abilityDrawdownBuffer)
 * - second_wind:  Reset drawdown to 0% instantly (equityBaseline = currentEquity)
 * - sabotage:     Target -50% leverage for 60s (active_ability_effects table, read in order-validator)
 *
 * AWARD RULES (one per achievement, per round):
 * - Highest PnL% → sabotage (leader can attack)
 * - Lowest drawdown hit → fortress (defensive play rewarded)
 * - Most trades executed → shield (most active trader gets protection)
 *
 * HOT PATH SAFETY:
 * shield and fortress effects are cached in TraderState — NO DB queries in onPriceUpdate.
 * sabotage is only checked at order submission time (acceptable — not per tick).
 */

import { getSupabase } from "../db";
import { getArenaState } from "./risk-monitor";

// ============================================================
// AWARD ABILITIES AT ROUND END
// ============================================================

/**
 * Award abilities to top performers at round end.
 * Called by round-engine.ts:advanceRound() BEFORE grace period.
 * Safe to call multiple times — guards against duplicate awards per round.
 */
export async function awardAbilitiesForRound(
  arenaId: string,
  roundNumber: number
): Promise<void> {
  const supabase = getSupabase();

  // Guard: don't award twice for same round
  const { data: existing } = await supabase
    .from("participant_abilities")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("acquired_in_round", roundNumber)
    .limit(1);

  if (existing?.length) {
    console.log(`[Ability] Round ${roundNumber} awards already given for arena ${arenaId}`);
    return;
  }

  // Get active participants with metrics
  const { data: participants } = await supabase
    .from("arena_participants")
    .select("id, total_pnl_percent, max_drawdown_hit, trades_this_round")
    .eq("arena_id", arenaId)
    .eq("status", "active");

  if (!participants || participants.length < 2) return; // need at least 2 to award meaningfully

  const sorted = [...participants];

  // Achievement 1: Highest PnL% → Sabotage (leader can attack)
  const highestPnl = [...sorted].sort((a, b) => (b.total_pnl_percent ?? 0) - (a.total_pnl_percent ?? 0))[0];

  // Achievement 2: Lowest drawdown → Fortress (defensive play rewarded)
  const lowestDrawdown = [...sorted].sort((a, b) => (a.max_drawdown_hit ?? 0) - (b.max_drawdown_hit ?? 0))[0];

  // Achievement 3: Most trades → Shield (most active gets protection)
  const mostTrades = [...sorted].sort((a, b) => (b.trades_this_round ?? 0) - (a.trades_this_round ?? 0))[0];

  // Collect awards (de-duplicate if same participant wins multiple)
  const awards: Array<{ participantId: string; abilityId: string; awardedFor: string }> = [];
  const awarded = new Set<string>();

  const addAward = (participantId: string, abilityId: string, awardedFor: string) => {
    if (!awarded.has(participantId)) {
      awards.push({ participantId, abilityId, awardedFor });
      awarded.add(participantId);
    }
  };

  addAward(highestPnl.id, "sabotage", "highest_pnl");
  addAward(lowestDrawdown.id, "fortress", "lowest_drawdown");
  addAward(mostTrades.id, "shield", "most_trades");

  // Insert awards
  for (const award of awards) {
    await supabase.from("participant_abilities").insert({
      arena_id: arenaId,
      participant_id: award.participantId,
      ability_id: award.abilityId,
      acquired_in_round: roundNumber,
      awarded_for: award.awardedFor,
    });

    await supabase.from("events").insert({
      arena_id: arenaId,
      round_number: roundNumber,
      event_type: "ability_awarded",
      actor_id: award.participantId,
      message: `Ability awarded: ${award.abilityId} (${award.awardedFor})`,
      data: { ability_id: award.abilityId, awarded_for: award.awardedFor },
    });
  }

  console.log(`[Ability] Awarded ${awards.length} abilities for round ${roundNumber} in arena ${arenaId}`);
}

// ============================================================
// ACTIVATE ABILITY
// ============================================================

export interface ActivationResult {
  success: boolean;
  error?: string;
  message?: string;
  expiresAt?: string;
}

/**
 * Activate an ability for a participant.
 * Called by engine internal API POST /internal/abilities/activate.
 * Updates DB + TraderState in-memory atomically.
 */
export async function activateAbility(
  arenaId: string,
  participantId: string,
  abilityId: string,
  targetParticipantId?: string
): Promise<ActivationResult> {
  const supabase = getSupabase();

  // 1. Load ability definition
  const { data: ability } = await supabase
    .from("abilities")
    .select("*")
    .eq("id", abilityId)
    .single();

  if (!ability) return { success: false, error: "Unknown ability" };

  // 2. Check ownership + not used
  const { data: pa } = await supabase
    .from("participant_abilities")
    .select("id, is_used")
    .eq("arena_id", arenaId)
    .eq("participant_id", participantId)
    .eq("ability_id", abilityId)
    .eq("is_used", false)
    .maybeSingle();

  if (!pa) return { success: false, error: "Ability not owned or already used" };

  // 3. Check target required
  if (ability.requires_target && !targetParticipantId) {
    return { success: false, error: "This ability requires a target" };
  }

  // 4. Validate target is active
  if (targetParticipantId) {
    const { data: target } = await supabase
      .from("arena_participants")
      .select("id, status")
      .eq("id", targetParticipantId)
      .maybeSingle();

    if (!target || target.status !== "active") {
      return { success: false, error: "Target not found or already eliminated" };
    }
  }

  // 5. Apply effect
  const state = getArenaState(arenaId);
  const now = Date.now();
  let expiresAt: string | undefined;

  switch (ability.effect_type) {
    case "elimination_immunity": {
      const expMs = now + ability.effect_duration_seconds * 1000;
      expiresAt = new Date(expMs).toISOString();
      // Update in-memory TraderState (hot path reads this)
      const trader = state?.traders.get(participantId);
      if (trader) trader.abilityShieldUntil = expMs;
      // Also persist to DB for restart recovery
      await supabase.from("active_ability_effects").insert({
        arena_id: arenaId,
        target_participant_id: participantId,
        ability_id: abilityId,
        applied_by_participant_id: participantId,
        effect_type: "elimination_immunity",
        effect_value: 1,
        expires_at: expiresAt,
      });
      break;
    }

    case "drawdown_buffer": {
      // Permanent for the round — no expiry needed in hot path
      const trader = state?.traders.get(participantId);
      if (trader) trader.abilityDrawdownBuffer = (trader.abilityDrawdownBuffer ?? 0) + ability.effect_value;
      // Persist for restart recovery
      await supabase.from("active_ability_effects").insert({
        arena_id: arenaId,
        target_participant_id: participantId,
        ability_id: abilityId,
        applied_by_participant_id: participantId,
        effect_type: "drawdown_buffer",
        effect_value: ability.effect_value,
        expires_at: new Date(now + 365 * 24 * 3600 * 1000).toISOString(), // effectively permanent
      });
      break;
    }

    case "drawdown_reset": {
      // Immediate — reset baseline to current equity
      const trader = state?.traders.get(participantId);
      if (trader) {
        trader.equityBaseline = trader.currentEquity;
        trader.currentDrawdownPercent = 0;
        trader.maxDrawdownHit = 0;
      }
      // No active_ability_effects needed (instant, no duration)
      break;
    }

    case "target_leverage_reduction": {
      if (!targetParticipantId) {
        return { success: false, error: "Target required for sabotage" };
      }
      const expMs = now + ability.effect_duration_seconds * 1000;
      expiresAt = new Date(expMs).toISOString();
      // Persisted to DB — order-validator reads this at order time
      await supabase.from("active_ability_effects").insert({
        arena_id: arenaId,
        target_participant_id: targetParticipantId,
        ability_id: abilityId,
        applied_by_participant_id: participantId,
        effect_type: "target_leverage_reduction",
        effect_value: ability.effect_value, // 0.5 = max leverage * 0.5
        expires_at: expiresAt,
      });
      break;
    }

    default:
      return { success: false, error: `Effect type '${ability.effect_type}' not implemented` };
  }

  // 6. Mark ability as used
  await supabase
    .from("participant_abilities")
    .update({ is_used: true, used_at: new Date().toISOString(), target_participant_id: targetParticipantId ?? null })
    .eq("id", pa.id);

  // 7. Create event
  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: state?.currentRound ?? 1,
    event_type: "ability_activated",
    actor_id: participantId,
    target_id: targetParticipantId ?? null,
    message: `${ability.name} activated!${targetParticipantId ? " (targeted)" : ""}`,
    data: { ability_id: abilityId, effect_type: ability.effect_type, expires_at: expiresAt ?? null },
  });

  console.log(`[Ability] ${abilityId} activated by ${participantId} in arena ${arenaId}`);
  return {
    success: true,
    message: `${ability.name} activated`,
    expiresAt,
  };
}

// ============================================================
// RESTART RECOVERY: reload ability effects into TraderState
// ============================================================

/**
 * Reload active ability effects into TraderState after engine restart.
 * Called by initArena() after territory buffer reload.
 * Keeps shield/fortress protection intact across Railway restarts.
 */
export async function reloadAbilityEffects(arenaId: string): Promise<void> {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  if (!state) return;

  const now = new Date().toISOString();

  const { data: effects } = await supabase
    .from("active_ability_effects")
    .select("target_participant_id, effect_type, effect_value, expires_at")
    .eq("arena_id", arenaId)
    .eq("is_active", true)
    .gt("expires_at", now);

  for (const effect of effects ?? []) {
    const trader = state.traders.get(effect.target_participant_id);
    if (!trader) continue;

    if (effect.effect_type === "elimination_immunity") {
      trader.abilityShieldUntil = new Date(effect.expires_at).getTime();
    } else if (effect.effect_type === "drawdown_buffer") {
      trader.abilityDrawdownBuffer = (trader.abilityDrawdownBuffer ?? 0) + (effect.effect_value ?? 0);
    }
  }

  console.log(`[Ability] Effects reloaded for arena ${arenaId}`);
}

// ============================================================
// QUERY HELPERS (for engine internal API)
// ============================================================

export async function getParticipantAbilities(arenaId: string, participantId: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("participant_abilities")
    .select("ability_id, acquired_in_round, awarded_for, is_used, used_at, abilities(name, description, icon, category, rarity, effect_type, requires_target)")
    .eq("arena_id", arenaId)
    .eq("participant_id", participantId)
    .order("acquired_in_round", { ascending: false });
  return data;
}

export async function getArenaActiveEffects(arenaId: string) {
  const supabase = getSupabase();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("active_ability_effects")
    .select("target_participant_id, applied_by_participant_id, effect_type, effect_value, applied_at, expires_at, abilities(name, icon)")
    .eq("arena_id", arenaId)
    .eq("is_active", true)
    .gt("expires_at", now);
  return data;
}
