import { PacificaClient } from "../../../src/lib/pacifica/client";
import { getSupabase } from "../db";
import { keypairFromBase58 } from "../../../src/lib/utils/keypair";
import { decryptPrivateKey } from "../../../src/lib/utils/encryption";
import { getArenaState, removeArena } from "./risk-monitor";
import { stopPeriodicSync } from "./periodic-sync";
import { stopLeaderboardUpdater } from "./leaderboard-updater";
import { cancelRoundTimer } from "../timers/round-timer";
import { getPriceManager } from "../state/price-manager";
import { calcEquity } from "../state/types";

/**
 * End an arena — determine winner, close positions, return funds, award badges.
 */
export async function endArena(arenaId: string): Promise<void> {
  const supabase = getSupabase();
  const encryptionKey = process.env.ENCRYPTION_KEY!;
  const state = getArenaState(arenaId);
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();

  console.log(`[Settlement] Arena ${arenaId} — settling...`);

  // Update status
  await supabase
    .from("arenas")
    .update({ status: "settling", updated_at: new Date().toISOString() })
    .eq("id", arenaId);

  // Stop monitoring
  cancelRoundTimer(arenaId);
  stopPeriodicSync(arenaId);
  stopLeaderboardUpdater(arenaId);

  // Get all participants
  const { data: participants } = await supabase
    .from("arena_participants")
    .select("*")
    .eq("arena_id", arenaId);

  if (!participants) return;

  // Close all positions and return funds for active traders
  const { data: arena } = await supabase
    .from("arenas")
    .select("master_wallet_address")
    .eq("id", arenaId)
    .single();

  for (const p of participants) {
    if (p.status !== "active" || !p.subaccount_private_key_encrypted) continue;

    try {
      const subKeypair = keypairFromBase58(
        decryptPrivateKey(p.subaccount_private_key_encrypted, encryptionKey)
      );
      const subClient = new PacificaClient({
        secretKey: subKeypair.secretKey,
        publicKey: subKeypair.publicKey,
        testnet: true,
      });

      // Cancel all orders
      await subClient.cancelAllOrders({ all_symbols: true, exclude_reduce_only: false });

      // Market close all positions
      const { data: positions } = await subClient.getPositions() as {
        data: Array<{ symbol: string; side: string; size: string }> | null;
      };

      if (positions) {
        for (const pos of positions) {
          const closeSide = pos.side === "bid" ? "ask" : "bid";
          await subClient.createMarketOrder({
            symbol: pos.symbol,
            side: closeSide as "bid" | "ask",
            amount: pos.size,
            reduce_only: true,
            slippage_percent: "5",
          });
        }
      }

      // Transfer remaining funds back to vault
      if (arena?.master_wallet_address) {
        await new Promise((r) => setTimeout(r, 2000)); // wait for fills
        const { data: accInfo } = await subClient.getAccountInfo() as {
          data: { balance?: string } | null;
        };
        if (accInfo?.balance && parseFloat(accInfo.balance) > 0) {
          await subClient.transferFunds({
            to_account: arena.master_wallet_address,
            amount: accInfo.balance,
          });
        }
      }
    } catch (err) {
      console.error(`[Settlement] Error closing ${p.id}:`, err);
    }

    // Record final equity
    const trader = state?.traders.get(p.id);
    const equity = trader ? calcEquity(trader, allPrices) : 0;

    await supabase
      .from("arena_participants")
      .update({
        status: "survived",
        equity_final: equity,
      })
      .eq("id", p.id);
  }

  // Determine winner — highest final equity among survivors
  const { data: survivors } = await supabase
    .from("arena_participants")
    .select("id, user_id, equity_final")
    .eq("arena_id", arenaId)
    .eq("status", "survived")
    .order("equity_final", { ascending: false });

  let winnerId: string | null = null;

  if (survivors && survivors.length > 0) {
    // Winner
    winnerId = survivors[0].user_id;
    await supabase
      .from("arena_participants")
      .update({ status: "winner" })
      .eq("id", survivors[0].id);

    // Award badges
    await awardBadges(arenaId, survivors);
  }

  // Finalize arena
  await supabase
    .from("arenas")
    .update({
      status: "completed",
      winner_id: winnerId,
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", arenaId);

  // Create arena_end event
  await supabase.from("events").insert({
    arena_id: arenaId,
    event_type: "arena_end",
    message: winnerId
      ? `Arena completed! Winner determined.`
      : `Arena completed — no survivors.`,
    data: { winner_id: winnerId },
  });

  // Clean up in-memory state
  removeArena(arenaId);

  console.log(`[Settlement] Arena ${arenaId} — completed. Winner: ${winnerId ?? "none"}`);
}

/**
 * Award badges to survivors.
 */
async function awardBadges(
  arenaId: string,
  survivors: Array<{ id: string; user_id: string; equity_final: number | null }>
): Promise<void> {
  const supabase = getSupabase();

  const badgeInserts: Array<{ user_id: string; badge_id: string; arena_id: string }> = [];

  if (survivors.length >= 1) {
    badgeInserts.push({ user_id: survivors[0].user_id, badge_id: "champion", arena_id: arenaId });
  }
  if (survivors.length >= 2) {
    badgeInserts.push({ user_id: survivors[1].user_id, badge_id: "gladiator", arena_id: arenaId });
  }
  if (survivors.length >= 3) {
    badgeInserts.push({ user_id: survivors[2].user_id, badge_id: "warrior", arena_id: arenaId });
  }

  // All survivors get the survivor badge
  for (const s of survivors) {
    badgeInserts.push({ user_id: s.user_id, badge_id: "survivor", arena_id: arenaId });
  }

  if (badgeInserts.length > 0) {
    await supabase.from("user_badges").insert(badgeInserts);
  }

  // Note: user stats (total_arenas_entered, total_arenas_won, etc.) should use
  // Supabase RPC for atomic increments in production. Skipped for MVP.
}
