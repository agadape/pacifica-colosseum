import { advanceRound } from "../services/round-engine";

const roundTimers = new Map<string, NodeJS.Timeout>();

/**
 * Schedule round end for an arena.
 */
export function scheduleRoundEnd(arenaId: string, endsAt: Date): void {
  // Cancel existing timer
  const existing = roundTimers.get(arenaId);
  if (existing) clearTimeout(existing);

  const delay = endsAt.getTime() - Date.now();

  if (delay <= 0) {
    console.log(`[RoundTimer] Arena ${arenaId} round already ended, advancing now`);
    advanceRound(arenaId).catch((err) =>
      console.error(`[RoundTimer] Failed to advance round for ${arenaId}:`, err)
    );
    return;
  }

  console.log(`[RoundTimer] Arena ${arenaId} round ends in ${Math.round(delay / 1000)}s`);

  const timer = setTimeout(() => {
    roundTimers.delete(arenaId);
    advanceRound(arenaId).catch((err) =>
      console.error(`[RoundTimer] Failed to advance round for ${arenaId}:`, err)
    );
  }, delay);

  roundTimers.set(arenaId, timer);
}

/**
 * Cancel a scheduled round end.
 */
export function cancelRoundTimer(arenaId: string): void {
  const timer = roundTimers.get(arenaId);
  if (timer) {
    clearTimeout(timer);
    roundTimers.delete(arenaId);
  }
}
