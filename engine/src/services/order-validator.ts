import type { Database } from "../../../src/lib/supabase/types";
import { ROUND_PARAMS } from "../../../src/lib/utils/constants";
import { getSupabase } from "../db";

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

  // Check leverage
  if (order.leverage && order.leverage > round.max_leverage) {
    return {
      valid: false,
      error: `Leverage ${order.leverage}x exceeds round max of ${round.max_leverage}x`,
    };
  }

  // Check margin mode (Round 2+ requires isolated)
  if (round.margin_mode === "isolated" && order.type === "market") {
    // Margin mode is enforced at the account level via Pacifica API
    // We just validate the intent here — actual enforcement happens on Pacifica side
  }

  return { valid: true, arena, participant, round };
}
