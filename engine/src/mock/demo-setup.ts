import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/lib/supabase/types";
import { generateKeypair, publicKeyToString, secretKeyToString } from "../../../src/lib/utils/keypair";
import { encryptPrivateKey } from "../../../src/lib/utils/encryption";
import { PRESETS, STARTING_CAPITAL, calculateRoundTimings } from "../../../src/lib/utils/constants";
import { MockPriceGenerator } from "./price-generator";
import { mockTransferFunds, mockCreateSubaccount } from "./mock-pacifica";
import { startBotTraders } from "./bot-traders";
import { startArena } from "../services/arena-manager";

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

  // Check if there's already a demo arena running
  const { data: existing } = await supabase
    .from("arenas")
    .select("id")
    .eq("name", "Demo Arena")
    .in("status", ["registration", "round_1", "round_2", "round_3", "sudden_death"])
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
  const botParticipants: Array<{ id: string; subaccount_address: string }> = [];

  for (const botName of BOT_NAMES) {
    // Create bot user
    const botKeypair = generateKeypair();
    const { data: botUser } = await supabase
      .from("users")
      .insert({
        wallet_address: `demo:${botName.toLowerCase().replace(/\s/g, "-")}`,
        referral_code: `BOT${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        username: botName,
      })
      .select("id")
      .single();

    if (!botUser) continue;

    // Create participant
    const subKeypair = generateKeypair();
    const { data: participant } = await supabase
      .from("arena_participants")
      .insert({
        arena_id: arena.id,
        user_id: botUser.id,
        subaccount_address: publicKeyToString(subKeypair.publicKey),
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
      mockCreateSubaccount(publicKeyToString(vault.publicKey), participant.subaccount_address!);
      mockTransferFunds(publicKeyToString(vault.publicKey), participant.subaccount_address!, STARTING_CAPITAL);

      botParticipants.push({
        id: participant.id,
        subaccount_address: participant.subaccount_address!,
      });
    }
  }

  console.log(`[Demo] Created arena "${arena.id}" with ${botParticipants.length} bots`);
  console.log(`[Demo] Arena starts in 30 seconds...`);

  // Start price generator
  const priceGenerator = new MockPriceGenerator(0.002); // slightly higher volatility for demo
  priceGenerator.start();

  // Schedule arena start
  setTimeout(async () => {
    console.log("[Demo] Starting arena...");

    // Update all participants to active
    for (const p of botParticipants) {
      await supabase
        .from("arena_participants")
        .update({ status: "active", equity_round_1_start: STARTING_CAPITAL })
        .eq("id", p.id);
    }

    // Update arena status
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

    // Start bot traders
    startBotTraders(arena.id, botParticipants, priceGenerator, ["BTC", "ETH", "SOL"]);

    console.log("[Demo] Arena running! Bots are trading.");
  }, 30_000);
}
