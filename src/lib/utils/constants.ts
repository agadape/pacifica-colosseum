// ============================================================
// Status Union Types
// ============================================================

/** All possible arena lifecycle statuses stored in the arenas.status column. */
export type ArenaStatus =
  | "registration"
  | "round_1"
  | "round_2"
  | "round_3"
  | "sudden_death"
  | "settling"
  | "completed"
  | "cancelled";

/** All possible participant statuses stored in arena_participants.status column. */
export type ParticipantStatus =
  | "registered"
  | "active"
  | "eliminated"
  | "winner"
  | "completed";

/** All possible round statuses stored in rounds.status column. */
export type RoundStatus =
  | "pending"
  | "active"
  | "eliminating"
  | "completed";

/** Alliance lifecycle statuses. */
export type AllianceStatus = "pending" | "active" | "dissolved";

// ============================================================
// Protocol Constants
// ============================================================

export const MIN_PARTICIPANTS = 4;
export const MAX_PARTICIPANTS = 100;
export const STARTING_CAPITAL = 1000; // USDC testnet
export const GRACE_PERIOD_SECONDS = 120; // 2 min (60s for Sudden Death)
export const GRACE_PERIOD_SUDDEN_DEATH = 60;
export const MIN_TRADES_PER_ROUND = 3;
export const MIN_VOLUME_PERCENT = 10;

// ============================================================
// Round Parameters
// ============================================================

export interface RoundParams {
  name: string;
  roundNumber: number;
  maxLeverage: number;
  marginMode: "any" | "isolated";
  maxDrawdownPercent: number;
  eliminationPercent: number;
  allowedPairs: string[];
  minActivity: boolean;
}

export const ROUND_PARAMS: RoundParams[] = [
  {
    name: "Open Field",
    roundNumber: 1,
    maxLeverage: 20,
    marginMode: "any",
    maxDrawdownPercent: 20,
    eliminationPercent: 30,
    allowedPairs: ["BTC", "ETH", "SOL"],
    minActivity: true,
  },
  {
    name: "The Storm",
    roundNumber: 2,
    maxLeverage: 10,
    marginMode: "isolated",
    maxDrawdownPercent: 15,
    eliminationPercent: 40,
    allowedPairs: ["BTC", "ETH", "SOL"],
    minActivity: true,
  },
  {
    name: "Final Circle",
    roundNumber: 3,
    maxLeverage: 5,
    marginMode: "isolated",
    maxDrawdownPercent: 10,
    eliminationPercent: 0, // top 5 advance
    allowedPairs: ["BTC"],
    minActivity: true,
  },
  {
    name: "Sudden Death",
    roundNumber: 4,
    maxLeverage: 3,
    marginMode: "isolated",
    maxDrawdownPercent: 8,
    eliminationPercent: 0, // any drawdown breach
    allowedPairs: ["BTC"],
    minActivity: false,
  },
];

// ============================================================
// Preset Durations (in seconds)
// ============================================================

export interface PresetDurations {
  round1: number;
  round2: number;
  round3: number;
  suddenDeath: number;
}

export const PRESETS: Record<string, PresetDurations> = {
  blitz: { round1: 90, round2: 90, round3: 60, suddenDeath: 60 },
  sprint: { round1: 1800, round2: 1800, round3: 1800, suddenDeath: 1800 },
  daily: { round1: 21600, round2: 21600, round3: 21600, suddenDeath: 21600 },
  weekly: { round1: 172800, round2: 172800, round3: 172800, suddenDeath: 86400 },
};

export type PresetName = keyof typeof PRESETS;

/**
 * Calculate round timings from a preset and start time.
 */
export function calculateRoundTimings(preset: PresetName, startsAt: Date) {
  const durations = PRESETS[preset];
  let cursor = startsAt.getTime();

  return ROUND_PARAMS.map((round, i) => {
    const durationKey = (["round1", "round2", "round3", "suddenDeath"] as const)[i];
    const durationMs = durations[durationKey] * 1000;
    const start = new Date(cursor);
    const end = new Date(cursor + durationMs);
    cursor += durationMs;
    return { ...round, startsAt: start, endsAt: end };
  });
}
