import { PacificaClient } from "../../../src/lib/pacifica/client";
import { getSupabase } from "../db";
import { keypairFromBase58, publicKeyToString } from "../../../src/lib/utils/keypair";
import { decryptPrivateKey } from "../../../src/lib/utils/encryption";
import { STARTING_CAPITAL, ROUND_PARAMS } from "../../../src/lib/utils/constants";
import { initArena } from "./risk-monitor";
import { generateTerritories, executeTerritoryDraft } from "./territory-manager";
import { startPeriodicSync } from "./periodic-sync";
import { startLeaderboardUpdater } from "./leaderboard-updater";
import { scheduleRoundEnd } from "../timers/round-timer";

/**
 * Start an arena: verify participants, create subaccounts on Pacifica,
 * fund each subaccount, update status.
 */
export async function startArena(arenaId: string): Promise<void> {
  const supabase = getSupabase();
  const encryptionKey = process.env.ENCRYPTION_KEY!;

  // Fetch arena
  const { data: arena } = await supabase
    .from("arenas")
    .select("*")
    .eq("id", arenaId)
    .single();

  if (!arena) throw new Error(`Arena ${arenaId} not found`);
  if (arena.status !== "registration") {
    console.log(`[Arena ${arenaId}] Not in registration status, skipping start`);
    return;
  }

  // Fetch participants
  const { data: participants } = await supabase
    .from("arena_participants")
    .select("*")
    .eq("arena_id", arenaId);

  if (!participants || participants.length < arena.min_participants) {
    await cancelArena(arenaId, "Minimum participants not reached");
    return;
  }

  console.log(`[Arena ${arenaId}] Starting with ${participants.length} participants`);

  // Decrypt vault keypair
  const vaultKeypair = keypairFromBase58(
    decryptPrivateKey(arena.master_private_key_encrypted!, encryptionKey)
  );
  const vaultClient = new PacificaClient({
    secretKey: vaultKeypair.secretKey,
    publicKey: vaultKeypair.publicKey,
    testnet: true,
  });

  // For each participant: create subaccount on Pacifica + fund
  for (const participant of participants) {
    try {
      const subKeypair = keypairFromBase58(
        decryptPrivateKey(participant.subaccount_private_key_encrypted!, encryptionKey)
      );

      // Create subaccount on Pacifica (vault → subaccount link)
      await vaultClient.createSubaccount(subKeypair.secretKey, subKeypair.publicKey);

      // Transfer starting capital
      await vaultClient.transferFunds({
        to_account: publicKeyToString(subKeypair.publicKey),
        amount: STARTING_CAPITAL.toString(),
      });

      // Update participant status + equity baseline
      await supabase
        .from("arena_participants")
        .update({
          status: "active",
          equity_round_1_start: STARTING_CAPITAL,
        })
        .eq("id", participant.id);

      console.log(`[Arena ${arenaId}] Funded participant ${participant.id}`);
    } catch (err) {
      console.error(`[Arena ${arenaId}] Failed to setup participant ${participant.id}:`, err);
    }
  }

  // Update arena status to round_1
  const round1 = ROUND_PARAMS[0];
  await supabase
    .from("arenas")
    .update({
      status: "round_1",
      current_round: 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", arenaId);

  // Set leverage for all participants to round 1 max
  for (const participant of participants) {
    try {
      const subKeypair = keypairFromBase58(
        decryptPrivateKey(participant.subaccount_private_key_encrypted!, encryptionKey)
      );
      const subClient = new PacificaClient({
        secretKey: subKeypair.secretKey,
        publicKey: subKeypair.publicKey,
        testnet: true,
      });
      await subClient.updateLeverage({ symbol: "BTC", leverage: round1.maxLeverage });
    } catch (err) {
      console.error(`[Arena ${arenaId}] Failed to set leverage for ${participant.id}:`, err);
    }
  }

  // Generate territory grid + run Round 1 draft
  // NOTE: executeTerritoryDraft for Rounds 2+ is called by beginNextRound() in round-engine.
  // Round 1 is NOT handled there, so it must be called here explicitly.
  await generateTerritories(arenaId);
  await executeTerritoryDraft(arenaId, 1);

  // Create arena_start event
  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: 1,
    event_type: "arena_start",
    message: `Arena "${arena.name}" has started with ${participants.length} traders!`,
    data: { participant_count: participants.length },
  });

  // Start risk monitoring, periodic sync, and leaderboard updates
  await initArena(arenaId);
  startPeriodicSync(arenaId);
  startLeaderboardUpdater(arenaId);

  // Schedule round 1 end
  const { data: round1Data } = await supabase
    .from("rounds")
    .select("ends_at")
    .eq("arena_id", arenaId)
    .eq("round_number", 1)
    .single();

  if (round1Data?.ends_at) {
    scheduleRoundEnd(arenaId, new Date(round1Data.ends_at));
  }

  console.log(`[Arena ${arenaId}] Started successfully — Round 1 active`);
}

/**
 * Cancel an arena that failed to meet requirements.
 */
export async function cancelArena(arenaId: string, reason: string): Promise<void> {
  const supabase = getSupabase();

  await supabase
    .from("arenas")
    .update({
      status: "cancelled",
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", arenaId);

  await supabase.from("events").insert({
    arena_id: arenaId,
    event_type: "arena_end",
    message: `Arena cancelled: ${reason}`,
    data: { reason },
  });

  console.log(`[Arena ${arenaId}] Cancelled: ${reason}`);
}
