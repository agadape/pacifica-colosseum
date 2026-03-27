import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/lib/supabase/types";
import { ROUND_PARAMS } from "../../../src/lib/utils/constants";
import { updateArenaRound, getArenaState } from "./risk-monitor";
import { startGracePeriod } from "./grace-period";
import { processInactivityElimination, processRankingElimination } from "./elimination-engine";
import { endArena } from "./settlement";
import { scheduleRoundEnd } from "../timers/round-timer";

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Advance to the next round. Called when current round timer expires.
 *
 * Flow: inactivity check → ranking elimination → loot (stub) →
 *       check if arena should end → grace period → next round starts
 */
export async function advanceRound(arenaId: string): Promise<void> {
  const supabase = getSupabase();

  const { data: arena } = await supabase
    .from("arenas")
    .select("*")
    .eq("id", arenaId)
    .single();

  if (!arena) return;

  const currentRound = arena.current_round;
  const roundParams = ROUND_PARAMS[currentRound - 1]; // 0-indexed

  console.log(`[RoundEngine] Arena ${arenaId} — Round ${currentRound} ending`);

  // Step 1: Process inactivity eliminations (except Sudden Death)
  if (roundParams.minActivity) {
    await processInactivityElimination(arenaId, currentRound, arena.starting_capital);
  }

  // Step 2: Process ranking eliminations
  if (roundParams.eliminationPercent > 0) {
    await processRankingElimination(arenaId, currentRound, roundParams.eliminationPercent);
  } else if (currentRound === 3) {
    // Round 3: top 5 advance (handled inside processRankingElimination)
    await processRankingElimination(arenaId, currentRound, 0);
  }

  // Step 3: Loot calculation (stub — filled in Layer 8)
  // await calculateLoot(arenaId, currentRound);

  // Step 4: Count remaining active traders
  const state = getArenaState(arenaId);
  let activeCount = 0;
  if (state) {
    for (const [, trader] of state.traders) {
      if (trader.status === "active") activeCount++;
    }
  }

  // Step 5: Check if arena should end
  if (currentRound >= 4 || activeCount <= 1) {
    await endArena(arenaId);
    return;
  }

  // Step 6: Update round status to completed
  await supabase
    .from("rounds")
    .update({
      actual_ended_at: new Date().toISOString(),
      traders_at_end: activeCount,
      traders_eliminated: (state?.traders.size ?? 0) - activeCount,
      status: "completed",
    })
    .eq("arena_id", arenaId)
    .eq("round_number", currentRound);

  // Create round_end event
  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: currentRound,
    event_type: "round_end",
    message: `Round ${currentRound} ended. ${activeCount} traders remain.`,
    data: { active_count: activeCount },
  });

  // Step 7: Start grace period, then begin next round
  const nextRound = currentRound + 1;
  startGracePeriod(arenaId, nextRound, async () => {
    await beginNextRound(arenaId, nextRound);
  });
}

/**
 * Begin the next round after grace period ends.
 */
async function beginNextRound(arenaId: string, roundNumber: number): Promise<void> {
  const supabase = getSupabase();
  const nextParams = ROUND_PARAMS[roundNumber - 1];

  if (!nextParams) {
    await endArena(arenaId);
    return;
  }

  // Update arena
  const statusMap: Record<number, string> = {
    1: "round_1",
    2: "round_2",
    3: "round_3",
    4: "sudden_death",
  };

  const { data: round } = await supabase
    .from("rounds")
    .select("ends_at")
    .eq("arena_id", arenaId)
    .eq("round_number", roundNumber)
    .single();

  await supabase
    .from("arenas")
    .update({
      status: statusMap[roundNumber] ?? "sudden_death",
      current_round: roundNumber,
      current_round_ends_at: round?.ends_at ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", arenaId);

  // Update round status
  const state = getArenaState(arenaId);
  let activeCount = 0;
  if (state) {
    for (const [, trader] of state.traders) {
      if (trader.status === "active") activeCount++;
    }
  }

  await supabase
    .from("rounds")
    .update({
      traders_at_start: activeCount,
      status: "active",
    })
    .eq("arena_id", arenaId)
    .eq("round_number", roundNumber);

  // Update in-memory round params
  updateArenaRound(
    arenaId,
    roundNumber,
    nextParams.maxDrawdownPercent,
    nextParams.maxLeverage,
    nextParams.allowedPairs
  );

  // Set leverage for all active traders
  // (actual Pacifica API calls — will fail without beta but state is correct)
  const encryptionKey = process.env.ENCRYPTION_KEY!;
  if (state) {
    for (const [, trader] of state.traders) {
      if (trader.status !== "active") continue;
      try {
        const { keypairFromBase58 } = await import("../../../src/lib/utils/keypair");
        const { decryptPrivateKey } = await import("../../../src/lib/utils/encryption");
        const { PacificaClient } = await import("../../../src/lib/pacifica/client");

        const { data: p } = await supabase
          .from("arena_participants")
          .select("subaccount_private_key_encrypted")
          .eq("id", trader.participantId)
          .single();

        if (p?.subaccount_private_key_encrypted) {
          const subKeypair = keypairFromBase58(
            decryptPrivateKey(p.subaccount_private_key_encrypted, encryptionKey)
          );
          const client = new PacificaClient({
            secretKey: subKeypair.secretKey,
            publicKey: subKeypair.publicKey,
            testnet: true,
          });
          await client.updateLeverage({ symbol: "BTC", leverage: nextParams.maxLeverage });
        }
      } catch (err) {
        console.error(`[RoundEngine] Failed to set leverage for ${trader.participantId}:`, err);
      }
    }
  }

  // Schedule next round end
  if (round?.ends_at) {
    scheduleRoundEnd(arenaId, new Date(round.ends_at));
  }

  // Create round_start event
  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: roundNumber,
    event_type: "round_start",
    message: `Round ${roundNumber}: ${nextParams.name} — Max ${nextParams.maxLeverage}x leverage, ${nextParams.maxDrawdownPercent}% max drawdown`,
    data: {
      name: nextParams.name,
      max_leverage: nextParams.maxLeverage,
      max_drawdown: nextParams.maxDrawdownPercent,
      allowed_pairs: nextParams.allowedPairs,
    },
  });

  console.log(`[RoundEngine] Arena ${arenaId} — Round ${roundNumber} (${nextParams.name}) started`);
}
