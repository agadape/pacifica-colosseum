/**
 * Progression Tree (M-5)
 *
 * Survivors choose a path bonus after each round:
 *   - Aggressive: +N leverage bonus on top of round cap
 *   - Defensive:  +N% drawdown buffer (stacks with territory + ability buffers)
 *   - Scout:      Reveal top-N active traders' positions in activity feed
 *
 * Bots auto-pick based on personality via wallet_address heuristic.
 * Real users have 30s via ProgressionModal.
 */

import { getSupabase } from "../db";
import { getArenaState } from "./risk-monitor";

interface UnlockNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "aggressive" | "defensive" | "scout";
  round_available: number;
  effect_type: "leverage_bonus" | "drawdown_buffer" | "position_scout";
  effect_value: number;
  requires_node_id: string | null;
  display_order: number;
}

// In-memory node cache (loaded once)
let nodeCache: UnlockNode[] | null = null;

async function loadNodes(): Promise<UnlockNode[]> {
  if (nodeCache) return nodeCache;
  const supabase = getSupabase();
  const { data } = await supabase
    .from("unlock_nodes")
    .select("*")
    .order("display_order");
  nodeCache = (data ?? []) as UnlockNode[];
  return nodeCache;
}

/**
 * Called at round end (after ability award). Creates pending choice rows for all survivors.
 * Bots auto-pick after a 3s delay (gives round-transition events time to settle).
 */
export async function awardProgression(arenaId: string, roundNumber: number): Promise<void> {
  // Only award after rounds 1, 2, 3 — not after Sudden Death (no next round)
  if (roundNumber >= 4) return;

  const supabase = getSupabase();

  const { data: survivors } = await supabase
    .from("arena_participants")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("status", "active");

  if (!survivors?.length) return;

  const rows = survivors.map((p) => ({
    arena_id: arenaId,
    participant_id: p.id,
    round_number: roundNumber,
    status: "pending" as const,
    node_id: null as string | null,
    chosen_at: null as string | null,
  }));

  // Upsert — safe to re-run on engine restart
  const { error } = await supabase
    .from("participant_unlocks")
    .upsert(rows, { onConflict: "participant_id,round_number" });

  if (error) {
    console.error(`[Progression] Failed to insert pending choices:`, error.message);
    return;
  }

  console.log(
    `[Progression] Awarded pending choices for ${survivors.length} survivors after round ${roundNumber}`
  );

  // Bots auto-pick after a short delay so frontend events settle first
  setTimeout(() => void autoBotPick(arenaId, roundNumber), 3_000);
}

/**
 * Determine which nodes are available for a participant at a given round end.
 */
export async function getAvailableNodes(
  participantId: string,
  roundNumber: number
): Promise<UnlockNode[]> {
  const supabase = getSupabase();
  const allNodes = await loadNodes();

  const { data: chosen } = await supabase
    .from("participant_unlocks")
    .select("node_id")
    .eq("participant_id", participantId)
    .eq("status", "chosen");

  const chosenIds = new Set<string>(
    (chosen ?? []).map((c) => c.node_id).filter(Boolean) as string[]
  );

  return allNodes.filter((node) => {
    if (node.round_available !== roundNumber) return false;
    if (node.requires_node_id && !chosenIds.has(node.requires_node_id)) return false;
    if (chosenIds.has(node.id)) return false;
    return true;
  });
}

/**
 * Player (or bot) chooses an unlock node. Updates DB + applies to TraderState immediately.
 */
export async function chooseUnlock(
  arenaId: string,
  participantId: string,
  nodeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  // Find the pending row
  const { data: pending } = await supabase
    .from("participant_unlocks")
    .select("id, round_number")
    .eq("participant_id", participantId)
    .eq("arena_id", arenaId)
    .eq("status", "pending")
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pending) return { success: false, error: "No pending progression choice" };

  const allNodes = await loadNodes();
  const node = allNodes.find((n) => n.id === nodeId);
  if (!node) return { success: false, error: "Unknown unlock node" };

  // Verify availability (round + prerequisite)
  const available = await getAvailableNodes(participantId, pending.round_number);
  if (!available.find((n) => n.id === nodeId)) {
    return { success: false, error: "Node not available for your current progression path" };
  }

  // Commit choice
  await supabase
    .from("participant_unlocks")
    .update({
      node_id: nodeId,
      status: "chosen",
      chosen_at: new Date().toISOString(),
    })
    .eq("id", pending.id);

  // Apply to in-memory state immediately
  applyUnlockToState(arenaId, participantId, node);

  // Activity feed event
  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: pending.round_number,
    event_type: "progression_chosen",
    actor_id: participantId,
    message: `Progression unlocked: ${node.icon} ${node.name}`,
    data: { node_id: nodeId, category: node.category, effect_type: node.effect_type },
  });

  console.log(`[Progression] ${participantId} → ${node.name} (${nodeId})`);
  return { success: true };
}

/**
 * Apply unlock effect to TraderState in-memory.
 * For leverage_bonus / drawdown_buffer: sets the value (cumulative levels replace, not stack).
 * For position_scout: fires a one-time position reveal event.
 */
function applyUnlockToState(
  arenaId: string,
  participantId: string,
  node: UnlockNode
): void {
  const state = getArenaState(arenaId);
  if (!state) return;

  const trader = state.traders.get(participantId);
  if (!trader) return;

  switch (node.effect_type) {
    case "leverage_bonus":
      trader.progressionLeverageBonus = node.effect_value;
      break;
    case "drawdown_buffer":
      trader.progressionDrawdownBuffer = node.effect_value;
      break;
    case "position_scout":
      void fireScoutEvent(arenaId, participantId, Math.round(node.effect_value));
      break;
  }
}

/**
 * Write an activity-feed event revealing the top N traders' positions.
 */
async function fireScoutEvent(
  arenaId: string,
  participantId: string,
  revealCount: number
): Promise<void> {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  if (!state) return;

  const others = Array.from(state.traders.values())
    .filter((t) => t.status === "active" && t.participantId !== participantId)
    .sort((a, b) => b.currentEquity - a.currentEquity)
    .slice(0, revealCount === 99 ? undefined : revealCount);

  if (!others.length) return;

  const revealed = others.map((t) => ({
    participantId: t.participantId,
    equity: Math.round(t.currentEquity * 100) / 100,
    drawdownPct: Math.round(t.currentDrawdownPercent * 10) / 10,
    positions: Array.from(t.positions.values()).map((p) => ({
      symbol: p.symbol,
      side: p.side,
      leverage: p.leverage,
    })),
  }));

  const label = revealCount === 99 ? "all active traders" : `top ${others.length} trader${others.length !== 1 ? "s" : ""}`;

  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: state.currentRound,
    event_type: "scout_reveal",
    actor_id: participantId,
    message: `🔍 Scout: ${label}' positions revealed`,
    data: { revealed, revealCount: others.length },
  });
}

/**
 * Auto-pick for bot participants (those whose wallet_address starts with "demo:").
 * Called 3s after awardProgression.
 */
async function autoBotPick(arenaId: string, roundNumber: number): Promise<void> {
  const supabase = getSupabase();

  // Get all still-pending rows for this round
  const { data: pendingRows } = await supabase
    .from("participant_unlocks")
    .select("participant_id, arena_participants!inner(user_id, users!inner(wallet_address))")
    .eq("arena_id", arenaId)
    .eq("round_number", roundNumber)
    .eq("status", "pending");

  if (!pendingRows?.length) return;

  type PendingRow = {
    participant_id: string;
    arena_participants: { user_id: string; users: { wallet_address: string } };
  };

  for (const row of pendingRows as unknown as PendingRow[]) {
    const wallet = row.arena_participants?.users?.wallet_address ?? "";
    if (!wallet.startsWith("demo:")) continue; // Real user — skip, they'll pick via UI

    // Bot personality → path preference
    const botName = wallet.replace("demo:", "");
    let preferredCategory: "aggressive" | "defensive" | "scout";
    if (["aggressive-alice", "yolo-yuki", "degen-dave"].includes(botName)) {
      preferredCategory = "aggressive";
    } else if (["conservative-carl", "steady-steve"].includes(botName)) {
      preferredCategory = "defensive";
    } else {
      preferredCategory = "scout"; // Scalper Sam
    }

    const available = await getAvailableNodes(row.participant_id, roundNumber);
    if (!available.length) continue;

    // Pick preferred category, fall back to first available
    const preferred = available.find((n) => n.category === preferredCategory);
    const chosen = preferred ?? available[0];

    await chooseUnlock(arenaId, row.participant_id, chosen.id);
  }
}

/**
 * Get a participant's full progression state (for API).
 */
export async function getParticipantProgression(
  arenaId: string,
  participantId: string
): Promise<{
  chosen: { nodeId: string; roundNumber: number; chosenAt: string }[];
  pending: { roundNumber: number } | null;
  available: UnlockNode[];
  allNodes: UnlockNode[];
}> {
  const supabase = getSupabase();

  const { data: rows } = await supabase
    .from("participant_unlocks")
    .select("node_id, round_number, status, chosen_at")
    .eq("participant_id", participantId)
    .eq("arena_id", arenaId)
    .order("round_number");

  const chosen = (rows ?? [])
    .filter((r) => r.status === "chosen" && r.node_id)
    .map((r) => ({
      nodeId: r.node_id as string,
      roundNumber: r.round_number,
      chosenAt: r.chosen_at ?? "",
    }));

  const pendingRow = (rows ?? []).find((r) => r.status === "pending");
  const pending = pendingRow ? { roundNumber: pendingRow.round_number } : null;

  const available = pending
    ? await getAvailableNodes(participantId, pending.roundNumber)
    : [];

  const allNodes = await loadNodes();

  return { chosen, pending, available, allNodes };
}

/**
 * Reload progression state from DB on engine restart.
 * Restores progressionLeverageBonus and progressionDrawdownBuffer for all traders.
 */
export async function reloadProgressionState(arenaId: string): Promise<void> {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  if (!state) return;

  const allNodes = await loadNodes();
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  const { data: chosen } = await supabase
    .from("participant_unlocks")
    .select("participant_id, node_id")
    .eq("arena_id", arenaId)
    .eq("status", "chosen")
    .not("node_id", "is", null);

  for (const row of chosen ?? []) {
    if (!row.node_id) continue;
    const node = nodeMap.get(row.node_id);
    if (node) applyUnlockToState(arenaId, row.participant_id, node);
  }

  console.log(`[Progression] State reloaded for arena ${arenaId}`);
}
