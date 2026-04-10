/**
 * Alliance Manager Service (M-3)
 *
 * Core mechanics:
 * - Two participants can form an alliance (proposer + target)
 * - Alliance PnL is averaged for elimination ranking (both sink or swim together)
 * - After round ends, a 60s betrayal phase lets members vote stay/betray
 * - Betrayal vote: if both betray → tie-break by individual PnL (lower PnL eliminated)
 *                  if one betrays → betrayer wins, other eliminated
 *                  if neither → alliance continues into next round
 * - Eliminated participant via betrayal is a direct drawdown-style elimination
 * - Alliance dissolves immediately on any member being eliminated mid-round
 */

import { getSupabase } from "../db";
import { getArenaState } from "./risk-monitor";
import { getPriceManager } from "../state/price-manager";
import { calcEquity, safePnlRatio } from "../state/types";

// ============================================================
// PROPOSE / ACCEPT / DECLINE
// ============================================================

export async function proposeAlliance(
  arenaId: string,
  proposerId: string,
  targetId: string
): Promise<{ success: boolean; allianceId?: string; error?: string }> {
  const supabase = getSupabase();

  // Get current round
  const { data: arena } = await supabase
    .from("arenas")
    .select("current_round")
    .eq("id", arenaId)
    .maybeSingle();

  if (!arena) return { success: false, error: "Arena not found" };
  const roundNumber = arena.current_round;

  // Make sure both participants are active
  const { data: participants } = await supabase
    .from("arena_participants")
    .select("id, status")
    .eq("arena_id", arenaId)
    .in("id", [proposerId, targetId]);

  const proposerParticipant = participants?.find(p => p.id === proposerId);
  const targetParticipant = participants?.find(p => p.id === targetId);

  if (!proposerParticipant || proposerParticipant.status !== "active") {
    return { success: false, error: "Proposer is not active" };
  }
  if (!targetParticipant || targetParticipant.status !== "active") {
    return { success: false, error: "Target is not active" };
  }

  // Check neither is already in an alliance this round
  const { data: existingMemberships } = await supabase
    .from("alliance_members")
    .select("id, alliance_id")
    .in("participant_id", [proposerId, targetId])
    .eq("round_number", roundNumber);

  if (existingMemberships && existingMemberships.length > 0) {
    return { success: false, error: "One or both participants already in an alliance this round" };
  }

  // Check no pending proposal already between these two
  const { data: existingProposal } = await supabase
    .from("alliances")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("round_number", roundNumber)
    .eq("proposer_id", proposerId)
    .eq("target_id", targetId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingProposal) {
    return { success: false, error: "Proposal already pending" };
  }

  // Create alliance with 60s expiry
  const expiresAt = new Date(Date.now() + 60_000).toISOString();
  const { data: alliance, error: insertErr } = await supabase
    .from("alliances")
    .insert({
      arena_id: arenaId,
      round_number: roundNumber,
      status: "pending",
      proposer_id: proposerId,
      target_id: targetId,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insertErr || !alliance) {
    return { success: false, error: insertErr?.message ?? "Failed to create alliance" };
  }

  // Create event
  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: roundNumber,
    event_type: "alliance_proposed",
    actor_id: proposerId,
    target_id: targetId,
    message: `Alliance proposal sent!`,
    data: { alliance_id: alliance.id, expires_at: expiresAt },
  });

  // Schedule auto-expiry (no-op if accepted before then)
  setTimeout(() => {
    void expirePendingAlliance(alliance.id);
  }, 60_000);

  console.log(`[Alliance] ${proposerId} proposed to ${targetId} (alliance ${alliance.id})`);
  return { success: true, allianceId: alliance.id };
}

export async function acceptAlliance(
  arenaId: string,
  allianceId: string,
  targetId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { data: alliance } = await supabase
    .from("alliances")
    .select("*")
    .eq("id", allianceId)
    .eq("target_id", targetId)
    .maybeSingle();

  if (!alliance) return { success: false, error: "Alliance not found or not targeted at you" };
  if (alliance.status !== "pending") return { success: false, error: "Alliance is no longer pending" };
  if (alliance.expires_at && new Date(alliance.expires_at) < new Date()) {
    return { success: false, error: "Proposal has expired" };
  }

  // Activate alliance
  await supabase
    .from("alliances")
    .update({ status: "active", updated_at: new Date().toISOString() })
    .eq("id", allianceId);

  // Add both as members
  await supabase.from("alliance_members").insert([
    { alliance_id: allianceId, participant_id: alliance.proposer_id, round_number: alliance.round_number },
    { alliance_id: allianceId, participant_id: alliance.target_id, round_number: alliance.round_number },
  ]);

  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: alliance.round_number,
    event_type: "alliance_formed",
    actor_id: targetId,
    target_id: alliance.proposer_id,
    message: `Alliance formed! Two traders unite.`,
    data: { alliance_id: allianceId },
  });

  console.log(`[Alliance] ${allianceId} accepted — alliance active`);
  return { success: true };
}

export async function declineAlliance(
  arenaId: string,
  allianceId: string,
  targetId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { data: alliance } = await supabase
    .from("alliances")
    .select("*")
    .eq("id", allianceId)
    .eq("target_id", targetId)
    .maybeSingle();

  if (!alliance) return { success: false, error: "Alliance not found" };
  if (alliance.status !== "pending") return { success: false, error: "Already resolved" };

  await supabase
    .from("alliances")
    .update({ status: "dissolved", updated_at: new Date().toISOString() })
    .eq("id", allianceId);

  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: alliance.round_number,
    event_type: "alliance_declined",
    actor_id: targetId,
    target_id: alliance.proposer_id,
    message: `Alliance proposal declined.`,
    data: { alliance_id: allianceId },
  });

  return { success: true };
}

async function expirePendingAlliance(allianceId: string): Promise<void> {
  const supabase = getSupabase();
  // Only dissolve if still pending (accept already updates it)
  await supabase
    .from("alliances")
    .update({ status: "dissolved", updated_at: new Date().toISOString() })
    .eq("id", allianceId)
    .eq("status", "pending");
}

// ============================================================
// ALLIANCE PNL AVERAGING (used in territory-manager elimination ranking)
// ============================================================

/**
 * Return a map of participantId → averaged PnL for all active alliances in an arena.
 * Members not in any alliance are NOT included in the map.
 * Call this in processTerritoryElimination to replace individual PnL with alliance average.
 */
export async function getAveragedPnlMap(
  arenaId: string
): Promise<Map<string, number>> {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  const averaged = new Map<string, number>();

  // Get all active alliances for this arena
  const { data: activeAlliances } = await supabase
    .from("alliances")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("status", "active");

  if (!activeAlliances?.length) return averaged;

  for (const alliance of activeAlliances) {
    const { data: members } = await supabase
      .from("alliance_members")
      .select("participant_id")
      .eq("alliance_id", alliance.id);

    if (!members?.length) continue;

    // Compute individual PnLs
    const pnls: number[] = [];
    for (const m of members) {
      const trader = state?.traders.get(m.participant_id);
      if (trader && trader.status === "active") {
        const pnl = safePnlRatio(calcEquity(trader, allPrices), trader.equityBaseline);
        pnls.push(pnl);
      }
    }
    if (!pnls.length) continue;

    const avgPnl = pnls.reduce((a, b) => a + b, 0) / pnls.length;

    // Assign averaged PnL to each member
    for (const m of members) {
      averaged.set(m.participant_id, avgPnl);
    }
  }

  return averaged;
}

// ============================================================
// DISSOLVE ON ELIMINATION
// ============================================================

/**
 * Called from handleDrawdownBreach when a participant is eliminated mid-round.
 * Dissolves their alliance so the surviving partner becomes independent.
 */
export async function dissolveAllianceOnElimination(
  arenaId: string,
  participantId: string
): Promise<void> {
  const supabase = getSupabase();

  // Find active alliance membership for this participant
  const { data: arena } = await supabase
    .from("arenas")
    .select("current_round")
    .eq("id", arenaId)
    .maybeSingle();

  if (!arena) return;

  const { data: membership } = await supabase
    .from("alliance_members")
    .select("alliance_id, round_number")
    .eq("participant_id", participantId)
    .eq("round_number", arena.current_round)
    .maybeSingle();

  if (!membership) return;

  await supabase
    .from("alliances")
    .update({ status: "dissolved", updated_at: new Date().toISOString() })
    .eq("id", membership.alliance_id)
    .eq("status", "active");

  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: arena.current_round,
    event_type: "alliance_dissolved",
    actor_id: participantId,
    message: `Alliance dissolved — partner was eliminated.`,
    data: { alliance_id: membership.alliance_id },
  });

  console.log(`[Alliance] Alliance ${membership.alliance_id} dissolved (member ${participantId} eliminated)`);
}

// ============================================================
// BETRAYAL PHASE
// ============================================================

/**
 * Start betrayal phase for all active alliances at round end.
 * Called by advanceRound() after eliminations but before grace period.
 * Sets a 60s window for betrayal votes; resolves via setTimeout.
 */
export async function startBetrayalPhase(
  arenaId: string,
  roundNumber: number
): Promise<void> {
  const supabase = getSupabase();

  const { data: activeAlliances } = await supabase
    .from("alliances")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("round_number", roundNumber)
    .eq("status", "active");

  if (!activeAlliances?.length) return;

  const betrayalStarted = new Date().toISOString();
  const betrayalDeadline = new Date(Date.now() + 60_000).toISOString();

  for (const alliance of activeAlliances) {
    await supabase
      .from("alliances")
      .update({
        status: "betraying",
        betrayal_started_at: betrayalStarted,
        betrayal_deadline_at: betrayalDeadline,
        updated_at: new Date().toISOString(),
      })
      .eq("id", alliance.id);

    // Resolve after 60s
    setTimeout(() => {
      void resolveBetrayal(alliance.id, arenaId);
    }, 60_000);
  }

  // Bots vote immediately (3s delay so UI can show the window)
  setTimeout(() => {
    void runBotBetrayalVotes(arenaId, roundNumber);
  }, 3_000);

  console.log(`[Alliance] Betrayal phase started for ${activeAlliances.length} alliances in arena ${arenaId}`);
}

export async function castBetrayalVote(
  allianceId: string,
  participantId: string,
  vote: "stay" | "betray"
): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase();

  const { data: alliance } = await supabase
    .from("alliances")
    .select("status, betrayal_deadline_at, arena_id, round_number")
    .eq("id", allianceId)
    .maybeSingle();

  if (!alliance) return { success: false, error: "Alliance not found" };
  if (alliance.status !== "betraying") return { success: false, error: "Not in betrayal phase" };
  if (alliance.betrayal_deadline_at && new Date(alliance.betrayal_deadline_at) < new Date()) {
    return { success: false, error: "Voting window has closed" };
  }

  const { data: member } = await supabase
    .from("alliance_members")
    .select("id, betrayal_vote")
    .eq("alliance_id", allianceId)
    .eq("participant_id", participantId)
    .maybeSingle();

  if (!member) return { success: false, error: "Not a member of this alliance" };
  if (member.betrayal_vote !== null) return { success: false, error: "Already voted" };

  await supabase
    .from("alliance_members")
    .update({ betrayal_vote: vote, voted_at: new Date().toISOString() })
    .eq("id", member.id);

  await supabase.from("events").insert({
    arena_id: alliance.arena_id,
    round_number: alliance.round_number,
    event_type: "betrayal_vote_cast",
    actor_id: participantId,
    message: vote === "betray" ? `A trader voted to BETRAY their ally!` : `A trader chose loyalty.`,
    data: { alliance_id: allianceId, vote },
  });

  // Check if all votes are in — resolve early
  const { data: allMembers } = await supabase
    .from("alliance_members")
    .select("betrayal_vote")
    .eq("alliance_id", allianceId);

  const allVoted = allMembers?.every(m => m.betrayal_vote !== null);
  if (allVoted) {
    void resolveBetrayal(allianceId, alliance.arena_id);
  }

  return { success: true };
}

async function resolveBetrayal(allianceId: string, arenaId: string): Promise<void> {
  const supabase = getSupabase();

  const { data: alliance } = await supabase
    .from("alliances")
    .select("*")
    .eq("id", allianceId)
    .maybeSingle();

  if (!alliance || alliance.status === "dissolved") return;

  const { data: members } = await supabase
    .from("alliance_members")
    .select("participant_id, betrayal_vote, round_number")
    .eq("alliance_id", allianceId);

  if (!members || members.length < 2) return;

  const state = getArenaState(arenaId);
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  const betrayers = members.filter(m => m.betrayal_vote === "betray");
  const roundNumber = members[0].round_number;

  let toEliminate: string | null = null;
  let reason = "";

  if (betrayers.length === 0) {
    // Both stay — alliance continues (updated to active for next round tracking)
    await supabase
      .from("alliances")
      .update({ status: "dissolved", updated_at: new Date().toISOString() })
      .eq("id", allianceId);

    await supabase.from("events").insert({
      arena_id: arenaId,
      round_number: roundNumber,
      event_type: "alliance_survived",
      message: `Alliance held! Both traders remain.`,
      data: { alliance_id: allianceId },
    });

    console.log(`[Alliance] ${allianceId} — both stayed loyal, alliance dissolves peacefully`);
    return;

  } else if (betrayers.length === 1) {
    // One betrayer wins — eliminate the other
    const loyalMember = members.find(m => m.betrayal_vote !== "betray");
    toEliminate = loyalMember?.participant_id ?? null;
    reason = "betrayed";

  } else {
    // Both betray — eliminate the one with lower PnL
    let lowestPnl = Infinity;
    let lowestId: string | null = null;
    for (const m of members) {
      const trader = state?.traders.get(m.participant_id);
      const pnl = trader ? safePnlRatio(calcEquity(trader, allPrices), trader.equityBaseline) : 0;
      if (pnl < lowestPnl) {
        lowestPnl = pnl;
        lowestId = m.participant_id;
      }
    }
    toEliminate = lowestId;
    reason = "mutual_betrayal";
  }

  // Mark alliance dissolved
  await supabase
    .from("alliances")
    .update({ status: "dissolved", updated_at: new Date().toISOString() })
    .eq("id", allianceId);

  if (toEliminate) {
    // Direct elimination via DB update
    const trader = state?.traders.get(toEliminate);
    if (trader) trader.status = "eliminated";

    await supabase
      .from("arena_participants")
      .update({
        status: "eliminated",
        eliminated_at: new Date().toISOString(),
        eliminated_in_round: roundNumber,
        elimination_reason: "betrayal",
        elimination_equity: trader?.currentEquity ?? 0,
      })
      .eq("id", toEliminate);

    await supabase.from("eliminations").insert({
      arena_id: arenaId,
      participant_id: toEliminate,
      round_number: roundNumber,
      reason: "betrayal",
      equity_at_elimination: trader?.currentEquity ?? 0,
      drawdown_at_elimination: trader?.currentDrawdownPercent ?? 0,
      positions_snapshot: {},
    });

    await supabase.from("events").insert({
      arena_id: arenaId,
      round_number: roundNumber,
      event_type: "betrayal_elimination",
      actor_id: toEliminate,
      message: reason === "betrayed" ? `Betrayed by their ally! Eliminated.` : `Mutual betrayal — lower PnL trader eliminated!`,
      data: { alliance_id: allianceId, reason },
    });

    console.log(`[Alliance] ${allianceId} resolved — ${toEliminate} eliminated via ${reason}`);
  }
}

// ============================================================
// BOT ALLIANCE BEHAVIOR
// ============================================================

/**
 * Carl (conservative) proposes to Steve (steady) at round start.
 * Called from round-engine.ts beginNextRound() after draft.
 */
export async function runBotAllianceProposal(arenaId: string): Promise<void> {
  const supabase = getSupabase();

  // Find Carl and Steve's participants in this arena
  type ParticipantWithWallet = { id: string; users: { wallet_address: string } | null };

  const { data: rawParticipants } = await supabase
    .from("arena_participants")
    .select("id, users!inner(wallet_address)")
    .eq("arena_id", arenaId)
    .eq("status", "active");

  const participants = rawParticipants as unknown as ParticipantWithWallet[] | null;
  if (!participants?.length) return;

  const carl = participants.find(p =>
    (p.users as { wallet_address: string } | null)?.wallet_address?.includes("conservative-carl")
  );
  const steve = participants.find(p =>
    (p.users as { wallet_address: string } | null)?.wallet_address?.includes("steady-steve")
  );

  if (!carl || !steve) return;

  // Check if already allied this round
  const { data: arena } = await supabase
    .from("arenas")
    .select("current_round")
    .eq("id", arenaId)
    .maybeSingle();

  if (!arena) return;

  const { data: existing } = await supabase
    .from("alliance_members")
    .select("id")
    .in("participant_id", [carl.id, steve.id])
    .eq("round_number", arena.current_round)
    .limit(1)
    .maybeSingle();

  if (existing) return; // Already allied

  const result = await proposeAlliance(arenaId, carl.id, steve.id);
  if (!result.success || !result.allianceId) return;

  // Steve auto-accepts after 2s
  setTimeout(async () => {
    await acceptAlliance(arenaId, result.allianceId!, steve.id);
    console.log(`[Bot Alliance] Carl+Steve alliance formed in arena ${arenaId}`);
  }, 2_000);
}

/**
 * Bot betrayal votes — bots vote for whoever has higher individual PnL (self-interest).
 */
async function runBotBetrayalVotes(arenaId: string, roundNumber: number): Promise<void> {
  const supabase = getSupabase();
  const state = getArenaState(arenaId);
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  const { data: betrayingAlliances } = await supabase
    .from("alliances")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("round_number", roundNumber)
    .eq("status", "betraying");

  if (!betrayingAlliances?.length) return;

  for (const alliance of betrayingAlliances) {
    const { data: members } = await supabase
      .from("alliance_members")
      .select("participant_id, betrayal_vote")
      .eq("alliance_id", alliance.id);

    if (!members?.length) continue;

    // For each bot member, cast a vote if they haven't
    for (const member of members) {
      if (member.betrayal_vote !== null) continue;

      // Check if this is a bot (wallet contains 'demo:')
      const { data: participant } = await supabase
        .from("arena_participants")
        .select("users!inner(wallet_address)")
        .eq("id", member.participant_id)
        .maybeSingle();

      type ParticipantWithWallet = { users: { wallet_address: string } | null };
      const p = participant as unknown as ParticipantWithWallet | null;
      const wallet = p?.users?.wallet_address ?? "";
      if (!wallet.startsWith("demo:")) continue;

      // Bot votes: betray if they have higher PnL than their partner
      const partnerMember = members.find(m => m.participant_id !== member.participant_id);
      const selfTrader = state?.traders.get(member.participant_id);
      const partnerTrader = partnerMember ? state?.traders.get(partnerMember.participant_id) : null;

      const selfPnl = selfTrader ? calcEquity(selfTrader, allPrices) / selfTrader.equityBaseline - 1 : 0;
      const partnerPnl = partnerTrader ? calcEquity(partnerTrader, allPrices) / partnerTrader.equityBaseline - 1 : 0;

      // Vote betray if significantly ahead, otherwise stay
      const vote: "stay" | "betray" = selfPnl > partnerPnl * 1.1 ? "betray" : "stay";
      await castBetrayalVote(alliance.id, member.participant_id, vote);
    }
  }
}

// ============================================================
// QUERY HELPERS
// ============================================================

export async function getAlliancesForParticipant(
  arenaId: string,
  participantId: string
): Promise<{
  myAlliance: {
    id: string;
    status: string;
    partnerId: string;
    betrayalDeadlineAt: string | null;
    myVote: string | null;
    partnerVote: string | null;
  } | null;
  incomingProposals: Array<{ id: string; proposerId: string; expiresAt: string | null }>;
}> {
  const supabase = getSupabase();

  // Get current round
  const { data: arena } = await supabase
    .from("arenas")
    .select("current_round")
    .eq("id", arenaId)
    .maybeSingle();

  if (!arena) return { myAlliance: null, incomingProposals: [] };

  const roundNumber = arena.current_round;

  // Active/betraying alliance
  const { data: membership } = await supabase
    .from("alliance_members")
    .select("alliance_id, betrayal_vote")
    .eq("participant_id", participantId)
    .eq("round_number", roundNumber)
    .maybeSingle();

  let myAlliance = null;

  if (membership) {
    const { data: alliance } = await supabase
      .from("alliances")
      .select("id, status, betrayal_deadline_at, proposer_id, target_id")
      .eq("id", membership.alliance_id)
      .in("status", ["active", "betraying"])
      .maybeSingle();

    if (alliance) {
      const partnerId = alliance.proposer_id === participantId
        ? alliance.target_id
        : alliance.proposer_id;

      const { data: partnerMembership } = await supabase
        .from("alliance_members")
        .select("betrayal_vote")
        .eq("alliance_id", alliance.id)
        .eq("participant_id", partnerId)
        .maybeSingle();

      myAlliance = {
        id: alliance.id,
        status: alliance.status,
        partnerId,
        betrayalDeadlineAt: alliance.betrayal_deadline_at,
        myVote: membership.betrayal_vote,
        partnerVote: partnerMembership?.betrayal_vote ?? null,
      };
    }
  }

  // Incoming pending proposals
  const { data: incomingRaw } = await supabase
    .from("alliances")
    .select("id, proposer_id, expires_at")
    .eq("arena_id", arenaId)
    .eq("target_id", participantId)
    .eq("round_number", roundNumber)
    .eq("status", "pending");

  const incomingProposals = (incomingRaw ?? [])
    .filter(a => !a.expires_at || new Date(a.expires_at) > new Date())
    .map(a => ({ id: a.id, proposerId: a.proposer_id, expiresAt: a.expires_at }));

  return { myAlliance, incomingProposals };
}
