/**
 * Hazard Manager Service
 *
 * WHAT THIS DOES:
 * Schedules random hazard events during rounds. Each round gets 1-3 hazards
 * depending on round number. Hazards warn traders before activating.
 *
 * HAZARDS IMPLEMENTED:
 * - flash_crash:      BTC -10% over 30s (DEMO_MODE only — mock price gen)
 * - high_volatility:  2× price swings for 60s (DEMO_MODE only)
 * - leverage_cap:     Max leverage → 3× for rest of round (ArenaState)
 * - drawdown_tighten: Max drawdown −5% for rest of round (ArenaState)
 * - no_shorting:      Ask orders blocked for 60s (ArenaState)
 * - safe_haven:       +5% DD buffer all traders for 90s (TraderState)
 * - insider_info:     Random trader's positions revealed via event
 *
 * HOT PATH SAFETY:
 * All enforcement reads from ArenaState in-memory — NO DB queries in
 * onPriceUpdate or validateOrder hot paths.
 * price_shock and volatility_multiplier only fire in DEMO_MODE.
 */

import { getSupabase } from "../db";
import { getArenaState } from "./risk-monitor";
import { DEMO_MODE } from "../config";
import type { MockPriceGenerator } from "../mock/price-generator";
import type { Json } from "../../../src/lib/supabase/types";

// ============================================================
// TYPES
// ============================================================

interface HazardRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  severity: string;
  warning_seconds: number;
  duration_seconds: number;
  effect_config: Json;
  min_round: number;
  max_occurrences_per_round: number;
  weight: number;
}

interface EffectConfig {
  type: string;
  symbol?: string;
  direction?: "up" | "down";
  magnitude?: number;
  multiplier?: number;
  max_leverage?: number;
  reduction_percent?: number;
  disabled_side?: "ask" | null;
  buffer_percent?: number;
  target?: string;
}

// ============================================================
// PRICE GENERATOR REGISTRY
// Demo-only: stores MockPriceGenerator ref per arena so hazard effects
// can inject artificial price moves without touching the real Pacifica WS.
// ============================================================

const priceGenerators = new Map<string, MockPriceGenerator>();

export function registerArenaGenerator(arenaId: string, generator: MockPriceGenerator): void {
  priceGenerators.set(arenaId, generator);
}

export function unregisterArenaGenerator(arenaId: string): void {
  priceGenerators.delete(arenaId);
}

// ============================================================
// WEIGHTED RANDOM PICK
// ============================================================

function weightedRandomPick(items: HazardRow[], count: number): HazardRow[] {
  const result: HazardRow[] = [];
  const remaining = [...items];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((sum, item) => sum + item.weight, 0);
    let rand = Math.random() * totalWeight;
    let selected = remaining[remaining.length - 1];

    for (const item of remaining) {
      rand -= item.weight;
      if (rand <= 0) {
        selected = item;
        break;
      }
    }

    result.push(selected);
    remaining.splice(remaining.indexOf(selected), 1);
  }

  return result;
}

// ============================================================
// SCHEDULE HAZARDS FOR A ROUND
// Fire-and-forget via setTimeout chains. Called at round start.
// ============================================================

export async function scheduleHazardsForRound(
  arenaId: string,
  roundNumber: number,
  roundEndsAt: Date
): Promise<void> {
  const supabase = getSupabase();

  const { data: allHazards } = await supabase
    .from("hazard_events")
    .select("*")
    .lte("min_round", roundNumber);

  if (!allHazards || allHazards.length === 0) return;

  // Round 1 → 1 hazard, Round 2 → 2, Round 3+ → 3
  const hazardCount = Math.min(3, roundNumber);
  const selected = weightedRandomPick(allHazards as HazardRow[], hazardCount);

  const now = Date.now();
  const roundEndMs = roundEndsAt.getTime();
  const latestStart = roundEndMs - 30_000; // never trigger in last 30s
  const minGap = 90_000;                   // minimum 90s between hazards

  let nextAvailableMs = now + 60_000; // first hazard 60s into round

  for (const hazard of selected) {
    const warnedAt = nextAvailableMs;
    const startsAt = warnedAt + hazard.warning_seconds * 1000;

    if (startsAt > latestStart) {
      console.log(`[Hazard] Not enough time for ${hazard.id} in round ${roundNumber} — skipping`);
      break;
    }

    const expiresAtMs = hazard.duration_seconds > 0
      ? startsAt + hazard.duration_seconds * 1000
      : null; // permanent for round (duration_seconds = 0)

    const warnDelay = warnedAt - now;
    const startDelay = startsAt - now;

    // Fire warning
    setTimeout(() => {
      void fireHazardWarning(arenaId, roundNumber, hazard, warnedAt, startsAt, expiresAtMs);
    }, warnDelay);

    // Fire effect
    const config = hazard.effect_config as unknown as EffectConfig;
    setTimeout(() => {
      void applyHazardEffect(arenaId, roundNumber, hazard, expiresAtMs);
    }, startDelay);

    // Fire expiry (timed effects only)
    if (expiresAtMs !== null) {
      const expireDelay = expiresAtMs - now;
      setTimeout(() => {
        clearHazardEffect(arenaId, hazard, config.buffer_percent);
      }, expireDelay);
    }

    nextAvailableMs = (expiresAtMs ?? startsAt) + minGap;

    console.log(
      `[Hazard] Scheduled: ${hazard.name} (round ${roundNumber}) ` +
      `— warning T+${Math.round(warnDelay / 1000)}s, effect T+${Math.round(startDelay / 1000)}s`
    );
  }
}

// ============================================================
// FIRE WARNING
// ============================================================

async function fireHazardWarning(
  arenaId: string,
  roundNumber: number,
  hazard: HazardRow,
  warnedAt: number,
  startsAt: number,
  expiresAtMs: number | null
): Promise<void> {
  const supabase = getSupabase();

  await supabase.from("active_hazard_events").insert({
    arena_id: arenaId,
    round_number: roundNumber,
    hazard_id: hazard.id,
    warned_at: new Date(warnedAt).toISOString(),
    started_at: null,
    expires_at: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
    status: "warning",
  });

  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: roundNumber,
    event_type: "hazard_warning",
    message: `⚠️ ${hazard.name} incoming in ${hazard.warning_seconds}s — ${hazard.description}`,
    data: {
      hazard_id: hazard.id,
      hazard_name: hazard.name,
      icon: hazard.icon,
      severity: hazard.severity,
      category: hazard.category,
      warning_seconds: hazard.warning_seconds,
      starts_at: new Date(startsAt).toISOString(),
    },
  });

  console.log(`[Hazard] Warning: ${hazard.name} fires in ${hazard.warning_seconds}s`);
}

// ============================================================
// APPLY EFFECT
// ============================================================

async function applyHazardEffect(
  arenaId: string,
  roundNumber: number,
  hazard: HazardRow,
  expiresAtMs: number | null
): Promise<void> {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  const config = hazard.effect_config as unknown as EffectConfig;

  if (!state) {
    console.warn(`[Hazard] No arena state for ${arenaId} — skipping ${hazard.id}`);
    return;
  }

  switch (config.type) {
    case "price_shock": {
      if (DEMO_MODE) {
        const generator = priceGenerators.get(arenaId);
        if (generator && config.symbol && config.magnitude != null) {
          const direction = config.direction === "down" ? -1 : 1;
          generator.applyShock(config.symbol, config.magnitude * direction, hazard.duration_seconds * 1000);
        }
      } else {
        console.log(`[Hazard] price_shock skipped — not in DEMO_MODE`);
      }
      break;
    }

    case "volatility_multiplier": {
      if (DEMO_MODE) {
        const generator = priceGenerators.get(arenaId);
        if (generator && config.multiplier != null) {
          generator.setVolatilityMultiplier(config.multiplier, hazard.duration_seconds * 1000);
        }
      } else {
        console.log(`[Hazard] volatility_multiplier skipped — not in DEMO_MODE`);
      }
      break;
    }

    case "leverage_override": {
      if (config.max_leverage != null) {
        state.activeHazardLeverageCap = config.max_leverage;
      }
      break;
    }

    case "drawdown_reduction": {
      if (config.reduction_percent != null) {
        state.activeHazardDrawdownReduction = config.reduction_percent;
      }
      break;
    }

    case "side_restriction": {
      if (config.disabled_side) {
        state.activeHazardSideRestriction = config.disabled_side;
      }
      break;
    }

    case "drawdown_buffer": {
      // Temporarily boost all active traders' drawdown buffer (reuses abilityDrawdownBuffer)
      if (config.buffer_percent != null) {
        for (const [, trader] of state.traders) {
          if (trader.status === "active") {
            trader.abilityDrawdownBuffer = (trader.abilityDrawdownBuffer ?? 0) + config.buffer_percent;
          }
        }
      }
      break;
    }

    case "position_reveal": {
      const activeTraders = [...state.traders.values()].filter(t => t.status === "active");
      if (activeTraders.length > 0) {
        const target = activeTraders[Math.floor(Math.random() * activeTraders.length)];
        const positions: Record<string, unknown> = {};
        for (const [symbol, pos] of target.positions) {
          positions[symbol] = { side: pos.side, size: pos.size, entryPrice: pos.entryPrice, leverage: pos.leverage };
        }
        await supabase.from("events").insert({
          arena_id: arenaId,
          round_number: roundNumber,
          event_type: "hazard_position_reveal",
          actor_id: target.participantId,
          message: `🔎 Insider Info: A trader's positions have been exposed!`,
          data: { hazard_id: "insider_info", participant_id: target.participantId, positions } as unknown as import("../../../src/lib/supabase/types").Json,
        });
      }
      break;
    }

    default:
      console.warn(`[Hazard] Unknown effect type: ${config.type}`);
  }

  // Update DB row to active
  await supabase
    .from("active_hazard_events")
    .update({
      status: "active",
      started_at: new Date().toISOString(),
    })
    .eq("arena_id", arenaId)
    .eq("hazard_id", hazard.id)
    .eq("round_number", roundNumber)
    .eq("status", "warning");

  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: roundNumber,
    event_type: "hazard_activated",
    message: `${hazard.icon} ${hazard.name} is now active!${hazard.duration_seconds > 0 ? ` (${hazard.duration_seconds}s)` : " (rest of round)"}`,
    data: {
      hazard_id: hazard.id,
      hazard_name: hazard.name,
      icon: hazard.icon,
      severity: hazard.severity,
      category: hazard.category,
      expires_at: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
    },
  });

  console.log(`[Hazard] Activated: ${hazard.name} (${config.type}) in arena ${arenaId}`);
}

// ============================================================
// CLEAR TIMED EFFECT
// Called by setTimeout when a timed hazard expires.
// Permanent-for-round effects (duration=0) are cleared by updateArenaRound().
// ============================================================

function clearHazardEffect(arenaId: string, hazard: HazardRow, bufferPercent?: number): void {
  const state = getArenaState(arenaId);
  const config = hazard.effect_config as unknown as EffectConfig;
  if (!state) return;

  switch (config.type) {
    case "side_restriction":
      state.activeHazardSideRestriction = null;
      break;
    case "drawdown_buffer":
      if (bufferPercent != null) {
        for (const [, trader] of state.traders) {
          if (trader.status === "active") {
            trader.abilityDrawdownBuffer = Math.max(0, (trader.abilityDrawdownBuffer ?? 0) - bufferPercent);
          }
        }
      }
      break;
    // price_shock + volatility_multiplier self-clear via MockPriceGenerator timers
    // leverage_override + drawdown_reduction: permanent-for-round, cleared by updateArenaRound()
  }

  // Mark expired in DB (fire-and-forget)
  const supabase = getSupabase();
  void supabase
    .from("active_hazard_events")
    .update({ status: "expired" })
    .eq("arena_id", arenaId)
    .eq("hazard_id", hazard.id)
    .eq("status", "active");

  console.log(`[Hazard] Cleared: ${hazard.name} in arena ${arenaId}`);
}

// ============================================================
// QUERY HELPERS (for internal API)
// ============================================================

export async function getActiveHazards(arenaId: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("active_hazard_events")
    .select("id, hazard_id, round_number, warned_at, started_at, expires_at, status, hazard_events(name, description, icon, category, severity)")
    .eq("arena_id", arenaId)
    .in("status", ["warning", "active"])
    .order("warned_at", { ascending: true });
  return data;
}
