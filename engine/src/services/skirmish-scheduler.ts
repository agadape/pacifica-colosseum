/**
 * Skirmish Scheduler
 *
 * WHAT THIS DOES:
 * Runs a global 10s poll that manages territory skirmish phases across all active arenas.
 * Each phase has a declaration window where traders declare attacks, then all attacks resolve.
 *
 * PRESET-AWARE INTERVALS:
 * - Blitz arenas: 30s total phase (15s declaration window) — 90s rounds need shorter cycles
 * - All other presets: 60s total phase (30s declaration window)
 *
 * HOW IT CONNECTS:
 * - Started by engine/src/index.ts on startup
 * - Calls resolveSkirmish() from territory-manager.ts to resolve attacks
 * - Exposes declareAttack() for frontend API (via index.ts internal endpoint)
 * - Exposes getSkirmishPhase() for frontend to check phase status
 */

import { getArenaState } from "./risk-monitor";
import { resolveSkirmish } from "./territory-manager";
import { getSupabase } from "../db";

// Default intervals (non-Blitz arenas)
const DEFAULT_PHASE_MS = 60_000;         // 60s total phase duration
const DEFAULT_DECLARATION_MS = 30_000;   // 30s declaration window

// Blitz intervals — shorter because rounds are only 90s
const BLITZ_PHASE_MS = 30_000;          // 30s total phase duration
const BLITZ_DECLARATION_MS = 15_000;    // 15s declaration window

// Poll interval — checks all arenas every 10s to catch phase transitions accurately
const POLL_INTERVAL_MS = 10_000;

interface SkirmishPhase {
  arenaId: string;
  declarationOpenAt: number;
  declarationCloseAt: number;
  resolutionAt: number;
  declaredAttacks: Array<{ attackerId: string; defenderId: string }>;
  resolved: boolean;
}

const activePhases = new Map<string, SkirmishPhase>();

let skirmishIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Start the global skirmish scheduler.
 * Called by engine/src/index.ts during startup.
 * Idempotent — safe to call multiple times, only one interval runs.
 */
export function startSkirmishScheduler(): void {
  if (skirmishIntervalId !== null) {
    console.log("[Skirmish] Scheduler already running, skipping");
    return;
  }

  console.log("[Skirmish] Scheduler started");

  skirmishIntervalId = setInterval(async () => {
    const supabase = getSupabase();

    const { data: arenas } = await supabase
      .from("arenas")
      .select("id, status, current_round, preset")
      .in("status", ["round_1", "round_2", "round_3", "sudden_death"]);

    if (!arenas?.length) return;

    const now = Date.now();

    for (const arena of arenas) {
      const phase = activePhases.get(arena.id);
      const isBlitz = (arena.preset as string | null) === "blitz";

      if (!phase) {
        openSkirmishPhase(arena.id, isBlitz);
        continue;
      }

      if (now >= phase.declarationCloseAt && !phase.resolved) {
        await resolveSkirmishPhase(arena.id);
        phase.resolved = true;
      }

      if (now >= phase.resolutionAt + 10_000) {
        activePhases.delete(arena.id);
      }
    }
  }, POLL_INTERVAL_MS);
}

/**
 * Stop the global skirmish scheduler.
 * Called on engine shutdown to prevent interval buildup.
 */
export function stopSkirmishScheduler(): void {
  if (skirmishIntervalId !== null) {
    clearInterval(skirmishIntervalId);
    skirmishIntervalId = null;
    console.log("[Skirmish] Scheduler stopped");
  }
}

function openSkirmishPhase(arenaId: string, isBlitz: boolean): void {
  const now = Date.now();
  const declarationMs = isBlitz ? BLITZ_DECLARATION_MS : DEFAULT_DECLARATION_MS;
  const phaseMs = isBlitz ? BLITZ_PHASE_MS : DEFAULT_PHASE_MS;

  activePhases.set(arenaId, {
    arenaId,
    declarationOpenAt: now,
    declarationCloseAt: now + declarationMs,
    resolutionAt: now + phaseMs,
    declaredAttacks: [],
    resolved: false,
  });

  console.log(`[Skirmish] Phase opened for ${arenaId} (${isBlitz ? "blitz 30s" : "60s"} cycle)`);
}

/**
 * Declare an attack during an active skirmish phase.
 * Called by frontend via POST /internal/territory/attack.
 * Each trader can only declare one attack per phase.
 */
export function declareAttack(
  arenaId: string,
  attackerId: string,
  defenderId: string
): { success: boolean; error?: string } {
  const phase = activePhases.get(arenaId);

  if (!phase) {
    return { success: false, error: "No active skirmish phase" };
  }

  const now = Date.now();
  if (now < phase.declarationOpenAt || now > phase.declarationCloseAt) {
    return { success: false, error: "Declaration window is closed" };
  }

  if (attackerId === defenderId) {
    return { success: false, error: "Cannot attack yourself" };
  }

  if (phase.declaredAttacks.some((a) => a.attackerId === attackerId)) {
    return { success: false, error: "Already declared an attack this phase" };
  }

  phase.declaredAttacks.push({ attackerId, defenderId });
  console.log(`[Skirmish] Attack declared: ${attackerId} → ${defenderId} in arena ${arenaId}`);
  return { success: true };
}

async function resolveSkirmishPhase(arenaId: string): Promise<void> {
  const phase = activePhases.get(arenaId);
  if (!phase || phase.resolved) return;

  const state = getArenaState(arenaId);
  const roundNumber = state?.currentRound ?? 1;

  console.log(`[Skirmish] Resolving ${phase.declaredAttacks.length} attack(s) in arena ${arenaId}`);

  for (const attack of phase.declaredAttacks) {
    try {
      const result = await resolveSkirmish(
        arenaId,
        roundNumber,
        attack.attackerId,
        attack.defenderId
      );

      if (!result.success) {
        console.error(`[Skirmish] Failed: ${attack.attackerId} → ${attack.defenderId}:`, result.error);
      } else {
        console.log(`[Skirmish] ${attack.attackerId} → ${attack.defenderId}: ${result.winner} won (swapped: ${result.territoriesSwapped})`);
      }
    } catch (err) {
      console.error(`[Skirmish] resolveSkirmish threw:`, err);
    }
  }

  phase.declaredAttacks = [];
}

/**
 * Get current skirmish phase status for an arena.
 * Called by frontend via GET /internal/territory/phase/:arenaId.
 */
export function getSkirmishPhase(arenaId: string): SkirmishPhase | null {
  return activePhases.get(arenaId) ?? null;
}
