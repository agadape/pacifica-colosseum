import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/lib/supabase/types";
import { startArena } from "../services/arena-manager";

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const scheduledTimers = new Map<string, NodeJS.Timeout>();

/**
 * Schedule an arena to start at its starts_at time.
 */
export function scheduleArenaStart(arenaId: string, startsAt: Date): void {
  // Cancel existing timer if any
  const existing = scheduledTimers.get(arenaId);
  if (existing) clearTimeout(existing);

  const delay = startsAt.getTime() - Date.now();

  if (delay <= 0) {
    // Already past start time, start immediately
    console.log(`[Timer] Arena ${arenaId} start time already passed, starting now`);
    startArena(arenaId).catch((err) =>
      console.error(`[Timer] Failed to start arena ${arenaId}:`, err)
    );
    return;
  }

  console.log(`[Timer] Scheduled arena ${arenaId} to start in ${Math.round(delay / 1000)}s`);

  const timer = setTimeout(() => {
    scheduledTimers.delete(arenaId);
    startArena(arenaId).catch((err) =>
      console.error(`[Timer] Failed to start arena ${arenaId}:`, err)
    );
  }, delay);

  scheduledTimers.set(arenaId, timer);
}

/**
 * Cancel a scheduled arena start.
 */
export function cancelScheduledStart(arenaId: string): void {
  const timer = scheduledTimers.get(arenaId);
  if (timer) {
    clearTimeout(timer);
    scheduledTimers.delete(arenaId);
    console.log(`[Timer] Cancelled scheduled start for arena ${arenaId}`);
  }
}

/**
 * On engine startup: query all arenas in 'registration' status
 * with starts_at in the future, and schedule their starts.
 */
export async function initArenaTimers(): Promise<void> {
  const supabase = getSupabase();

  const { data: arenas } = await supabase
    .from("arenas")
    .select("id, starts_at")
    .eq("status", "registration")
    .gte("starts_at", new Date().toISOString());

  if (!arenas || arenas.length === 0) {
    console.log("[Timer] No pending arenas to schedule");
    return;
  }

  for (const arena of arenas) {
    scheduleArenaStart(arena.id, new Date(arena.starts_at));
  }

  console.log(`[Timer] Initialized ${arenas.length} arena timer(s)`);
}
