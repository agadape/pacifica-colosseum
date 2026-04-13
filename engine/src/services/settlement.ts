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

  // Get all participants for badge calculations
  const { data: allParticipants } = await supabase
    .from("arena_participants")
    .select("id, user_id, status, eliminated_in_round, max_drawdown_hit, has_second_life, second_life_used")
    .eq("arena_id", arenaId);

  // Get round data for additional context
  const { data: roundData } = await supabase
    .from("rounds")
    .select("round_number, traders_at_start, traders_eliminated")
    .eq("arena_id", arenaId)
    .order("round_number", { ascending: true });

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
    await awardBadges(arenaId, survivors, allParticipants || [], roundData || []);
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
 * Award badges to survivors and track all achievements.
 */
async function awardBadges(
  arenaId: string,
  survivors: Array<{ id: string; user_id: string; equity_final: number | null }>,
  allParticipants: Array<{ id: string; user_id: string; status: string; eliminated_in_round: number | null }>,
  roundData: Array<{ round_number: number; traders_at_start: number | null; traders_eliminated: number | null }>
): Promise<void> {
  const supabase = getSupabase();

  const badgeInserts: Array<{ user_id: string; badge_id: string; arena_id: string }> = [];
  const userStatUpdates: Map<string, { total_arenas_entered?: number; total_arenas_won?: number; total_rounds_survived?: number; current_win_streak?: number; win_streak?: number }> = new Map();

  // === POSITION-BASED BADGES ===
  if (survivors.length >= 1) {
    badgeInserts.push({ user_id: survivors[0].user_id, badge_id: "champion", arena_id: arenaId });
    const existing = userStatUpdates.get(survivors[0].user_id) || {};
    userStatUpdates.set(survivors[0].user_id, {
      total_arenas_won: (existing.total_arenas_won || 0) + 1,
      current_win_streak: 1,
    });
  }
  if (survivors.length >= 2) {
    badgeInserts.push({ user_id: survivors[1].user_id, badge_id: "gladiator", arena_id: arenaId });
  }
  if (survivors.length >= 3) {
    badgeInserts.push({ user_id: survivors[2].user_id, badge_id: "warrior", arena_id: arenaId });
  }

  // All survivors get survivor badge
  for (const s of survivors) {
    badgeInserts.push({ user_id: s.user_id, badge_id: "survivor", arena_id: arenaId });
    const existing = userStatUpdates.get(s.user_id) || {};
    userStatUpdates.set(s.user_id, {
      total_rounds_survived: (existing.total_rounds_survived || 0) + 1,
    });
  }

  // === "ALMOST" BADGE — 4th place (reached finals but eliminated before top 3) ===
  // Get the first eliminated participant from round 3 or sudden death
  const { data: almostParticipant } = await supabase
    .from("arena_participants")
    .select("user_id, eliminated_in_round, status")
    .eq("arena_id", arenaId)
    .in("status", ["eliminated", "survived"])
    .order("equity_final", { ascending: false })
    .limit(1);
  
  if (survivors.length === 1) {
    // Only 1 survivor = 4th place got eliminated at the end
    const { data: fourthPlace } = await supabase
      .from("arena_participants")
      .select("user_id")
      .eq("arena_id", arenaId)
      .eq("status", "eliminated")
      .order("equity_final", { ascending: false })
      .limit(1)
      .single();
    if (fourthPlace) {
      badgeInserts.push({ user_id: fourthPlace.user_id, badge_id: "almost", arena_id: arenaId });
    }
  }

  // === FIRST BLOOD — first elimination in the arena ===
  const { data: firstElimination } = await supabase
    .from("eliminations")
    .select("participant_id, arena_id")
    .eq("arena_id", arenaId)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  if (firstElimination) {
    const { data: firstBloodParticipant } = await supabase
      .from("arena_participants")
      .select("user_id")
      .eq("id", firstElimination.participant_id)
      .single();
    if (firstBloodParticipant) {
      badgeInserts.push({ user_id: firstBloodParticipant.user_id, badge_id: "first_blood", arena_id: arenaId });
    }
  }

  // === ZERO DD BADGE — won a round with 0% drawdown ===
  // Check for participants who had 0 max drawdown when eliminated or won
  const { data: zeroDdParticipants } = await supabase
    .from("arena_participants")
    .select("user_id, max_drawdown_hit, status")
    .eq("arena_id", arenaId)
    .eq("max_drawdown_hit", 0);

  if (zeroDdParticipants && zeroDdParticipants.length > 0) {
    for (const p of zeroDdParticipants) {
      badgeInserts.push({ user_id: p.user_id, badge_id: "zero_dd", arena_id: arenaId });
    }
  }

  // === VETERAN BADGES — count total arenas entered ===
  // These are computed from user stats, not per-arena
  const { data: allArenaParticipants } = await supabase
    .from("arena_participants")
    .select("user_id")
    .eq("arena_id", arenaId);

  if (allArenaParticipants) {
    const userArenasCount: Map<string, number> = new Map();
    for (const p of allArenaParticipants) {
      const count = userArenasCount.get(p.user_id) || 0;
      userArenasCount.set(p.user_id, count + 1);
    }
    // Award veteran badges based on total career arenas (we'll check this via RPC in production)
    for (const [userId, count] of userArenasCount) {
      if (count >= 1) updateUserStat(userId, { total_arenas_entered: 1 });
    }
  }

  // === STREAK BADGES — won 3 arenas in a row ===
  // Check user's current win streak
  const { data: championData } = await supabase
    .from("arena_participants")
    .select("user_id")
    .eq("arena_id", arenaId)
    .eq("status", "winner")
    .single();

  if (championData) {
    const { data: championUser } = await supabase
      .from("users")
      .select("current_win_streak")
      .eq("id", championData.user_id)
      .single();

    if (championUser && championUser.current_win_streak >= 3) {
      badgeInserts.push({ user_id: championData.user_id, badge_id: "streak_3", arena_id: arenaId });
    }
    // Update win streak for next arena
    updateUserStat(championData.user_id, { current_win_streak: 1 });
  }

  // === FAN FAVORITE — most Second Life votes ===
  // Second Life votes stored in events with event_type = 'second_life_vote'
  const { data: secondLifeVotes } = await supabase
    .from("events")
    .select("actor_id, data")
    .eq("arena_id", arenaId)
    .eq("event_type", "second_life_vote");

  if (secondLifeVotes && secondLifeVotes.length > 0) {
    const voteCounts: Map<string, number> = new Map();
    for (const vote of secondLifeVotes) {
      if (vote.actor_id) {
        const count = voteCounts.get(vote.actor_id) || 0;
        voteCounts.set(vote.actor_id, count + 1);
      }
    }
    let maxVotes = 0;
    let fanFavoriteId: string | null = null;
    for (const [userId, votes] of voteCounts) {
      if (votes > maxVotes) {
        maxVotes = votes;
        fanFavoriteId = userId;
      }
    }
    if (fanFavoriteId && maxVotes > 0) {
      badgeInserts.push({ user_id: fanFavoriteId, badge_id: "fan_favorite", arena_id: arenaId });
    }
  }

  // === IRON WILL — used Second Life and survived the round ===
  const { data: ironWillRecipients } = await supabase
    .from("arena_participants")
    .select("user_id")
    .eq("arena_id", arenaId)
    .eq("has_second_life", true)
    .eq("second_life_used", true)
    .in("status", ["active", "survived", "winner"]);

  if (ironWillRecipients && ironWillRecipients.length > 0) {
    for (const r of ironWillRecipients) {
      badgeInserts.push({ user_id: r.user_id, badge_id: "iron_will", arena_id: arenaId });
    }
  }

  // === STRATEGIST — highest Sharpe Ratio (we use total_pnl / max_drawdown as proxy) ===
  const { data: strategistCandidates } = await supabase
    .from("arena_participants")
    .select("user_id, total_pnl_percent, max_drawdown_hit")
    .eq("arena_id", arenaId)
    .in("status", ["survived", "winner"]);

  if (strategistCandidates && strategistCandidates.length > 0) {
    let bestScore = -Infinity;
    let bestStrategist: string | null = null;
    for (const c of strategistCandidates) {
      // Sharpe-like ratio: PnL% / (max_drawdown + 1)
      const score = Math.abs(c.total_pnl_percent ?? 0) / ((c.max_drawdown_hit ?? 0) + 1);
      if (score > bestScore && c.total_pnl_percent !== 0) {
        bestScore = score;
        bestStrategist = c.user_id;
      }
    }
    if (bestStrategist) {
      badgeInserts.push({ user_id: bestStrategist, badge_id: "strategist", arena_id: arenaId });
    }
  }

  // === INSERT ALL BADGES ===
  if (badgeInserts.length > 0) {
    const { error } = await supabase.from("user_badges").insert(badgeInserts);
    if (error) {
      console.error("[Badge] Failed to insert badges:", error);
    } else {
      console.log(`[Badge] Awarded ${badgeInserts.length} badges for arena ${arenaId}`);
    }
  }

  // === UPDATE USER STATS ===
  for (const [userId, stats] of userStatUpdates) {
    const updateData: Record<string, number | string> = {};
    if (stats.total_arenas_entered) updateData.total_arenas_entered = stats.total_arenas_entered;
    if (stats.total_arenas_won) updateData.total_arenas_won = stats.total_arenas_won;
    if (stats.total_rounds_survived) updateData.total_rounds_survived = stats.total_rounds_survived;
    if (stats.current_win_streak) updateData.current_win_streak = stats.current_win_streak;
    if (stats.win_streak) updateData.win_streak = stats.win_streak;
    updateData.updated_at = new Date().toISOString();

    if (Object.keys(updateData).length > 1) {
      await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId);
    }
  }

  // === VETERAN BADGE CHECK (10 and 50 arenas) ===
  const { data: veteranUsers } = await supabase
    .from("users")
    .select("id, total_arenas_entered")
    .gte("total_arenas_entered", 10);

  if (veteranUsers) {
    const veteranInserts: Array<{ user_id: string; badge_id: string; arena_id: string }> = [];
    for (const u of veteranUsers) {
      if (u.total_arenas_entered >= 50) {
        veteranInserts.push({ user_id: u.id, badge_id: "veteran_50", arena_id: arenaId });
      } else if (u.total_arenas_entered >= 10) {
        veteranInserts.push({ user_id: u.id, badge_id: "veteran_10", arena_id: arenaId });
      }
    }
    if (veteranInserts.length > 0) {
      for (const v of veteranInserts) {
        await supabase.from("user_badges").upsert(v, { onConflict: "user_id,badge_id,arena_id" });
      }
    }
  }
}

function updateUserStat(
  userId: string,
  updates: { total_arenas_entered?: number; total_arenas_won?: number; total_rounds_survived?: number; current_win_streak?: number; win_streak?: number },
  userStatUpdates?: Map<string, { total_arenas_entered?: number; total_arenas_won?: number; total_rounds_survived?: number; current_win_streak?: number; win_streak?: number }>
) {
  if (!userStatUpdates) return;
  const existing = userStatUpdates.get(userId) || {};
  userStatUpdates.set(userId, {
    total_arenas_entered: (existing.total_arenas_entered || 0) + (updates.total_arenas_entered || 0),
    total_arenas_won: (existing.total_arenas_won || 0) + (updates.total_arenas_won || 0),
    total_rounds_survived: (existing.total_rounds_survived || 0) + (updates.total_rounds_survived || 0),
    current_win_streak: updates.current_win_streak || existing.current_win_streak,
    win_streak: updates.win_streak || existing.win_streak,
  });
}
