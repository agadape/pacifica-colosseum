import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/lib/supabase/types";
import { generateKeypair, publicKeyToString, secretKeyToString } from "../../../src/lib/utils/keypair";
import { encryptPrivateKey } from "../../../src/lib/utils/encryption";
import { PRESETS, STARTING_CAPITAL, calculateRoundTimings } from "../../../src/lib/utils/constants";
import { MockPriceGenerator } from "./price-generator";
import { mockTransferFunds, mockCreateSubaccount, getAccount } from "./mock-pacifica";
import { startBotTraders, stopBotTraders } from "./bot-traders";

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const BOT_NAMES = [
  "Conservative Carl",
  "Aggressive Alice",
  "Scalper Sam",
  "YOLO Yuki",
  "Steady Steve",
  "Degen Dave",
];

interface BotParticipant {
  id: string;
  subaccount_address: string;
  name: string;
}

/**
 * Compute equity for a bot from mock in-memory state + current prices.
 */
function computeEquity(address: string, priceGenerator: MockPriceGenerator): number {
  const account = getAccount(address);
  if (!account) return STARTING_CAPITAL;

  let unrealizedPnL = 0;
  for (const [symbol, pos] of account.positions) {
    const currentPrice = priceGenerator.getPrice(symbol) ?? pos.entryPrice;
    const direction = pos.side === "bid" ? 1 : -1;
    unrealizedPnL += (currentPrice - pos.entryPrice) * pos.size * direction;
  }
  return account.balance + unrealizedPnL;
}

/**
 * Start mock leaderboard: every 3s compute equity from mock positions,
 * update arena_participants with real PnL%.
 */
function startMockLeaderboard(
  arenaId: string,
  bots: BotParticipant[],
  activeIds: Set<string>,
  priceGenerator: MockPriceGenerator
): { stop: () => void } {
  const supabase = getSupabase();

  // 3s: update PnL on arena_participants
  const pnlTimer = setInterval(async () => {
    for (const bot of bots) {
      if (!activeIds.has(bot.id)) continue;

      const equity = computeEquity(bot.subaccount_address, priceGenerator);
      const pnlPercent = ((equity - STARTING_CAPITAL) / STARTING_CAPITAL) * 100;
      const drawdown = Math.max(0, -pnlPercent);

      await supabase
        .from("arena_participants")
        .update({
          total_pnl: equity - STARTING_CAPITAL,
          total_pnl_percent: Math.round(pnlPercent * 100) / 100,
          max_drawdown_hit: Math.round(drawdown * 100) / 100,
        })
        .eq("id", bot.id);
    }
  }, 3000);

  // 15s: write equity_snapshots for chart
  const snapshotTimer = setInterval(async () => {
    const { data: arenaRow } = await supabase
      .from("arenas")
      .select("current_round")
      .eq("id", arenaId)
      .single();
    const currentRound = arenaRow?.current_round ?? 1;

    const inserts = [];
    for (const bot of bots) {
      if (!activeIds.has(bot.id)) continue;
      const equity = computeEquity(bot.subaccount_address, priceGenerator);
      const drawdownPct = Math.max(0, ((STARTING_CAPITAL - equity) / STARTING_CAPITAL) * 100);
      inserts.push({
        arena_id: arenaId,
        participant_id: bot.id,
        round_number: currentRound,
        equity: Math.round(equity * 100) / 100,
        balance: Math.round(equity * 100) / 100,
        unrealized_pnl: 0,
        drawdown_percent: Math.round(drawdownPct * 100) / 100,
      });
    }
    if (inserts.length > 0) {
      await supabase.from("equity_snapshots").insert(inserts);
    }
  }, 15000);

  return {
    stop: () => {
      clearInterval(pnlTimer);
      clearInterval(snapshotTimer);
    },
  };
}

/**
 * Schedule demo round progression for Blitz arena.
 * R1 (90s): eliminate bottom 30% = 2 bots
 * R2 (90s): eliminate bottom 40% = 2 bots
 * R3 (60s): advance survivors to Sudden Death
 * SD (60s): declare winner
 */
function scheduleDemoRounds(
  arenaId: string,
  bots: BotParticipant[],
  activeIds: Set<string>,
  priceGenerator: MockPriceGenerator,
  leaderboard: { stop: () => void }
): void {
  const supabase = getSupabase();
  const blitz = PRESETS.blitz;

  const ROUND_SCHEDULE = [
    { from: 1, to: 2, status: "round_2", name: "The Storm", eliminatePct: 30, delayMs: blitz.round1 * 1000 },
    { from: 2, to: 3, status: "round_3", name: "Final Circle", eliminatePct: 40, delayMs: (blitz.round1 + blitz.round2) * 1000 },
    { from: 3, to: 4, status: "sudden_death", name: "Sudden Death", eliminatePct: 0, delayMs: (blitz.round1 + blitz.round2 + blitz.round3) * 1000 },
  ];

  const endDelayMs = (blitz.round1 + blitz.round2 + blitz.round3 + blitz.suddenDeath) * 1000;

  for (const round of ROUND_SCHEDULE) {
    setTimeout(async () => {
      const activeBots = bots.filter((b) => activeIds.has(b.id));
      if (activeBots.length === 0) return;

      // Score all active bots
      const scored = activeBots.map((bot) => {
        const equity = computeEquity(bot.subaccount_address, priceGenerator);
        return { bot, equity, pnlPct: ((equity - STARTING_CAPITAL) / STARTING_CAPITAL) * 100 };
      });

      // Eliminate bottom % (worst PnL first)
      scored.sort((a, b) => a.pnlPct - b.pnlPct);
      const numEliminate = round.eliminatePct > 0
        ? Math.max(1, Math.ceil(activeBots.length * round.eliminatePct / 100))
        : 0;

      const toEliminate = scored.slice(0, numEliminate);
      const toAdvance = scored.slice(numEliminate);

      for (const { bot, equity, pnlPct } of toEliminate) {
        activeIds.delete(bot.id);

        await supabase
          .from("arena_participants")
          .update({
            status: "eliminated",
            eliminated_at: new Date().toISOString(),
            eliminated_in_round: round.from,
            elimination_reason: "ranking",
            elimination_equity: Math.round(equity * 100) / 100,
            total_pnl: Math.round((equity - STARTING_CAPITAL) * 100) / 100,
            total_pnl_percent: Math.round(pnlPct * 100) / 100,
          })
          .eq("id", bot.id);

        await supabase.from("events").insert({
          arena_id: arenaId,
          round_number: round.from,
          event_type: "elimination",
          message: `${bot.name} eliminated! Final equity: $${equity.toFixed(2)} (${pnlPct.toFixed(1)}%)`,
          data: { reason: "ranking", equity, pnlPct, botName: bot.name },
        });

        console.log(`[Demo] ${bot.name} eliminated in round ${round.from} (equity: $${equity.toFixed(2)})`);
      }

      // Update round fields on eliminated bots
      for (const { bot, equity } of toEliminate) {
        const roundKey = `equity_round_${round.from}_end` as keyof Database["public"]["Tables"]["arena_participants"]["Update"];
        await supabase
          .from("arena_participants")
          .update({ [roundKey]: Math.round(equity * 100) / 100 })
          .eq("id", bot.id);
      }

      // Update surviving bots' round start equity for next round
      for (const { bot, equity } of toAdvance) {
        const roundKey = `equity_round_${round.to}_start` as keyof Database["public"]["Tables"]["arena_participants"]["Update"];
        await supabase
          .from("arena_participants")
          .update({ [roundKey]: Math.round(equity * 100) / 100 })
          .eq("id", bot.id);
      }

      // Advance arena round
      await supabase
        .from("arenas")
        .update({ status: round.status, current_round: round.to })
        .eq("id", arenaId);

      await supabase.from("events").insert({
        arena_id: arenaId,
        round_number: round.to,
        event_type: "round_start",
        message: `${round.name} begins! ${toAdvance.length} traders remain.`,
        data: { round: round.to, survivorCount: toAdvance.length },
      });

      console.log(`[Demo] Round ${round.from} → ${round.to}. ${toAdvance.length} survivors.`);
    }, round.delayMs);
  }

  // Final: declare winner
  setTimeout(async () => {
    leaderboard.stop();
    stopBotTraders(arenaId);

    const activeBots = bots.filter((b) => activeIds.has(b.id));

    if (activeBots.length === 0) {
      await supabase
        .from("arenas")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", arenaId);
      return;
    }

    // Pick winner: highest equity among survivors
    const finalScores = activeBots.map((bot) => {
      const equity = computeEquity(bot.subaccount_address, priceGenerator);
      return { bot, equity, pnlPct: ((equity - STARTING_CAPITAL) / STARTING_CAPITAL) * 100 };
    });
    finalScores.sort((a, b) => b.pnlPct - a.pnlPct);

    const winner = finalScores[0];
    const loser = finalScores.slice(1);

    // Eliminate runners-up
    for (const { bot, equity, pnlPct } of loser) {
      activeIds.delete(bot.id);
      await supabase
        .from("arena_participants")
        .update({
          status: "eliminated",
          eliminated_at: new Date().toISOString(),
          eliminated_in_round: 4,
          elimination_reason: "ranking",
          elimination_equity: Math.round(equity * 100) / 100,
          total_pnl_percent: Math.round(pnlPct * 100) / 100,
        })
        .eq("id", bot.id);
    }

    // Get winner's user_id to set as arena winner
    const { data: winnerParticipant } = await supabase
      .from("arena_participants")
      .select("user_id")
      .eq("id", winner.bot.id)
      .single();

    const finalEquity = computeEquity(winner.bot.subaccount_address, priceGenerator);
    const finalPnl = finalEquity - STARTING_CAPITAL;
    const finalPct = (finalPnl / STARTING_CAPITAL) * 100;

    await supabase
      .from("arena_participants")
      .update({
        status: "active",
        total_pnl: Math.round(finalPnl * 100) / 100,
        total_pnl_percent: Math.round(finalPct * 100) / 100,
        equity_final: Math.round(finalEquity * 100) / 100,
      })
      .eq("id", winner.bot.id);

    await supabase
      .from("arenas")
      .update({
        status: "completed",
        ended_at: new Date().toISOString(),
        winner_id: winnerParticipant?.user_id ?? null,
      })
      .eq("id", arenaId);

    await supabase.from("events").insert({
      arena_id: arenaId,
      round_number: 4,
      event_type: "arena_end",
      message: `${winner.bot.name} wins the arena! Final PnL: ${finalPct.toFixed(1)}%`,
      data: { winner: winner.bot.name, equity: finalEquity, pnlPct: finalPct },
    });

    console.log(`[Demo] Arena complete! Winner: ${winner.bot.name} ($${finalEquity.toFixed(2)})`);

    // Auto-restart: start a fresh demo arena after 60s cooldown
    console.log("[Demo] New arena starting in 60s...");
    setTimeout(() => {
      setupDemoArena().catch((err) => console.error("[Demo] Auto-restart failed:", err));
    }, 60_000);
  }, endDelayMs);
}

/**
 * Auto-setup a demo arena with bot traders.
 * Called on engine startup when DEMO_MODE=true.
 */
export async function setupDemoArena(): Promise<void> {
  const supabase = getSupabase();
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    console.error("[Demo] ENCRYPTION_KEY required for demo mode");
    return;
  }

  console.log("[Demo] Setting up demo arena...");

  // Check if there's already a demo arena actively running (not ended/broken)
  const { data: existing } = await supabase
    .from("arenas")
    .select("id")
    .eq("name", "Demo Arena")
    .in("status", ["registration", "round_1", "round_2", "round_3", "sudden_death"])
    .is("ended_at", null)
    .single();

  if (existing) {
    console.log("[Demo] Demo arena already exists, skipping setup");
    return;
  }

  // Create a "system" user for demo (or find existing)
  let systemUserId: string;
  const { data: systemUser } = await supabase
    .from("users")
    .select("id")
    .eq("wallet_address", "demo:system")
    .single();

  if (systemUser) {
    systemUserId = systemUser.id;
  } else {
    const { data: newUser } = await supabase
      .from("users")
      .insert({
        wallet_address: "demo:system",
        referral_code: "DEMO0000",
        username: "DemoHost",
      })
      .select("id")
      .single();
    if (!newUser) {
      console.error("[Demo] Failed to create system user");
      return;
    }
    systemUserId = newUser.id;
  }

  // Generate vault keypair
  const vault = generateKeypair();
  const startsAt = new Date(Date.now() + 30_000); // starts in 30 seconds
  const durations = PRESETS.blitz;

  // Create arena
  const { data: arena, error } = await supabase
    .from("arenas")
    .insert({
      creator_id: systemUserId,
      name: "Demo Arena",
      description: "Automated demo — watch bots battle it out!",
      preset: "blitz",
      starting_capital: STARTING_CAPITAL,
      min_participants: 4,
      max_participants: 8,
      registration_deadline: new Date(startsAt.getTime() - 5000).toISOString(),
      starts_at: startsAt.toISOString(),
      round_1_duration: durations.round1,
      round_2_duration: durations.round2,
      round_3_duration: durations.round3,
      sudden_death_duration: durations.suddenDeath,
      master_wallet_address: publicKeyToString(vault.publicKey),
      master_private_key_encrypted: encryptPrivateKey(secretKeyToString(vault.secretKey), encryptionKey),
    })
    .select("id")
    .single();

  if (error || !arena) {
    console.error("[Demo] Failed to create arena:", error?.message);
    return;
  }

  // Create round records
  const roundTimings = calculateRoundTimings("blitz", startsAt);
  for (const r of roundTimings) {
    await supabase.from("rounds").insert({
      arena_id: arena.id,
      round_number: r.roundNumber,
      name: r.name,
      starts_at: r.startsAt.toISOString(),
      ends_at: r.endsAt.toISOString(),
      max_leverage: r.maxLeverage,
      margin_mode: r.marginMode,
      max_drawdown_percent: r.maxDrawdownPercent,
      elimination_percent: r.eliminationPercent,
      allowed_pairs: r.allowedPairs,
    });
  }

  // Create bot users + participants
  const botParticipants: BotParticipant[] = [];

  for (let i = 0; i < BOT_NAMES.length; i++) {
    const botName = BOT_NAMES[i];

    // Create bot user (or reuse existing)
    const botWallet = `demo:${botName.toLowerCase().replace(/\s/g, "-")}`;
    let botUserId: string;

    const { data: existingBot } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", botWallet)
      .single();

    if (existingBot) {
      botUserId = existingBot.id;
    } else {
      const { data: botUser } = await supabase
        .from("users")
        .insert({
          wallet_address: botWallet,
          referral_code: `BOT${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          username: botName,
        })
        .select("id")
        .single();
      if (!botUser) continue;
      botUserId = botUser.id;
    }

    // Create participant
    const subKeypair = generateKeypair();
    const subAddress = publicKeyToString(subKeypair.publicKey);
    const { data: participant } = await supabase
      .from("arena_participants")
      .insert({
        arena_id: arena.id,
        user_id: botUserId,
        subaccount_address: subAddress,
        subaccount_private_key_encrypted: encryptPrivateKey(
          secretKeyToString(subKeypair.secretKey),
          encryptionKey
        ),
        status: "registered",
      })
      .select("id, subaccount_address")
      .single();

    if (participant) {
      // Mock: create subaccount + fund it
      mockCreateSubaccount(publicKeyToString(vault.publicKey), subAddress);
      mockTransferFunds(publicKeyToString(vault.publicKey), subAddress, STARTING_CAPITAL);

      botParticipants.push({
        id: participant.id,
        subaccount_address: subAddress,
        name: botName,
      });
    }
  }

  console.log(`[Demo] Created arena "${arena.id}" with ${botParticipants.length} bots`);
  console.log(`[Demo] Arena starts in 30 seconds...`);

  // Start price generator
  const priceGenerator = new MockPriceGenerator(0.002);
  priceGenerator.start();

  // Schedule arena start in 30s
  setTimeout(async () => {
    console.log("[Demo] Starting arena...");

    // Activate all participants
    for (const p of botParticipants) {
      await supabase
        .from("arena_participants")
        .update({ status: "active", equity_round_1_start: STARTING_CAPITAL })
        .eq("id", p.id);
    }

    // Update arena status to round_1
    await supabase
      .from("arenas")
      .update({ status: "round_1", current_round: 1 })
      .eq("id", arena.id);

    // Create start event
    await supabase.from("events").insert({
      arena_id: arena.id,
      round_number: 1,
      event_type: "arena_start",
      message: `Demo Arena started with ${botParticipants.length} bot traders!`,
      data: { participant_count: botParticipants.length, demo: true },
    });

    // Track which bots are still active
    const activeIds = new Set(botParticipants.map((b) => b.id));

    // Start bot traders
    startBotTraders(arena.id, botParticipants, priceGenerator, ["BTC", "ETH", "SOL"]);

    // Start mock leaderboard updater + snapshot writer
    const leaderboard = startMockLeaderboard(arena.id, botParticipants, activeIds, priceGenerator);

    // Schedule round progression + eliminations
    scheduleDemoRounds(arena.id, botParticipants, activeIds, priceGenerator, leaderboard);

    console.log("[Demo] Arena running! Bots trading, rounds scheduled.");
  }, 30_000);
}
