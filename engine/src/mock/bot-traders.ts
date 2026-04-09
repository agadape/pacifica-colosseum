import { MockPriceGenerator } from "./price-generator";
import { getSupabase } from "../db";
import { mockCreateMarketOrder } from "./mock-pacifica";
import { resolveSkirmish } from "../services/territory-manager";

interface BotPersonality {
  name: string;
  tradeInterval: number; // ms between trades
  positionSize: number; // fraction of balance
  longBias: number; // 0-1, probability of going long
  maxPositions: number;
  description: string;
}

const PERSONALITIES: BotPersonality[] = [
  { name: "Conservative Carl", tradeInterval: 15000, positionSize: 0.05, longBias: 0.6, maxPositions: 1, description: "Small positions, patient" },
  { name: "Aggressive Alice", tradeInterval: 5000, positionSize: 0.2, longBias: 0.5, maxPositions: 3, description: "Big positions, high risk" },
  { name: "Scalper Sam", tradeInterval: 3000, positionSize: 0.03, longBias: 0.5, maxPositions: 2, description: "Frequent small trades" },
  { name: "YOLO Yuki", tradeInterval: 8000, positionSize: 0.35, longBias: 0.7, maxPositions: 2, description: "Max leverage, will get eliminated" },
  { name: "Steady Steve", tradeInterval: 20000, positionSize: 0.08, longBias: 0.55, maxPositions: 1, description: "Methodical, survives rounds" },
  { name: "Degen Dave", tradeInterval: 4000, positionSize: 0.25, longBias: 0.4, maxPositions: 3, description: "Short bias, volatile" },
];

interface ActiveBot {
  participantId: string;
  subaccountAddress: string;
  personality: BotPersonality;
  interval: ReturnType<typeof setInterval> | null;
  tradeCount: number;
}

const activeBots = new Map<string, ActiveBot[]>();

/**
 * Start bot traders for a demo arena.
 */
export function startBotTraders(
  arenaId: string,
  participants: Array<{ id: string; subaccount_address: string }>,
  priceGenerator: MockPriceGenerator,
  allowedPairs: string[]
): void {
  const bots: ActiveBot[] = [];

  for (let i = 0; i < participants.length; i++) {
    const personality = PERSONALITIES[i % PERSONALITIES.length];
    const participant = participants[i];

    const bot: ActiveBot = {
      participantId: participant.id,
      subaccountAddress: participant.subaccount_address,
      personality,
      interval: null,
      tradeCount: 0,
    };

    bot.interval = setInterval(() => {
      executeBotTrade(arenaId, bot, priceGenerator, allowedPairs);
    }, personality.tradeInterval + Math.random() * 2000); // slight randomization

    bots.push(bot);
    console.log(`[Bot] ${personality.name} started for ${participant.id}`);
  }

  activeBots.set(arenaId, bots);

  // Start skirmish scheduler so bots auto-attack when they have ≥15% PnL lead
  startBotSkirmishScheduler(arenaId);
}

/**
 * Execute a single bot trade.
 */
async function executeBotTrade(
  arenaId: string,
  bot: ActiveBot,
  priceGenerator: MockPriceGenerator,
  allowedPairs: string[]
): Promise<void> {
  const symbol = allowedPairs[Math.floor(Math.random() * allowedPairs.length)];
  const currentPrice = priceGenerator.getPrice(symbol);
  if (!currentPrice) return;

  const side: "bid" | "ask" = Math.random() < bot.personality.longBias ? "bid" : "ask";
  const size = bot.personality.positionSize * (0.5 + Math.random());

  // Execute mock trade
  mockCreateMarketOrder(bot.subaccountAddress, symbol, side, size, currentPrice);
  bot.tradeCount++;

  // Record in DB
  const supabase = getSupabase();
  await supabase.from("trades").insert({
    arena_id: arenaId,
    participant_id: bot.participantId,
    round_number: 1,
    symbol,
    side: side === "bid" ? "buy" : "sell",
    order_type: "market",
    size,
    price: currentPrice,
  });

  // Update trade count
  await supabase
    .from("arena_participants")
    .update({
      trades_this_round: bot.tradeCount,
      total_trades: bot.tradeCount,
    })
    .eq("id", bot.participantId);

  // Create event
  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: 1,
    event_type: "trade_opened",
    message: `${bot.personality.name}: ${side === "bid" ? "Long" : "Short"} ${size.toFixed(4)} ${symbol}`,
    data: { bot: bot.personality.name, symbol, side, size },
  });
}

/**
 * Stop all bots for an arena.
 */
export function stopBotTraders(arenaId: string): void {
  const bots = activeBots.get(arenaId);
  if (!bots) return;

  for (const bot of bots) {
    if (bot.interval) clearInterval(bot.interval);
  }

  // Clear skirmish scheduler too
  const skirmishTimer = skirmishSchedulers.get(arenaId);
  if (skirmishTimer) {
    clearInterval(skirmishTimer);
    skirmishSchedulers.delete(arenaId);
  }

  activeBots.delete(arenaId);
  console.log(`[Bot] All bots stopped for arena ${arenaId}`);
}

// Tracks skirmish scheduler timers per arena
const skirmishSchedulers = new Map<string, ReturnType<typeof setInterval>>();

/**
 * Start bot skirmish scheduler.
 * Every 60s, each bot checks if it has a ≥15% PnL lead over an adjacent territory holder.
 * If so, it declares a skirmish attack. This ensures territory steals happen in demo.
 */
function startBotSkirmishScheduler(arenaId: string, intervalMs = 60_000): void {
  const timer = setInterval(async () => {
    await runBotSkirmishChecks(arenaId);
  }, intervalMs);

  skirmishSchedulers.set(arenaId, timer);
}

async function runBotSkirmishChecks(arenaId: string): Promise<void> {
  const supabase = getSupabase();
  const bots = activeBots.get(arenaId);
  if (!bots?.length) return;

  // Get arena current round
  const { data: arena } = await supabase
    .from("arenas")
    .select("current_round")
    .eq("id", arenaId)
    .maybeSingle();

  if (!arena) return;
  const roundNumber = arena.current_round;

  // Batch-fetch all active territories + participant PnL for this arena
  const { data: participants } = await supabase
    .from("arena_participants")
    .select("id, total_pnl_percent, status")
    .eq("arena_id", arenaId)
    .eq("status", "active");

  if (!participants?.length) return;

  const pnlByParticipant = new Map<string, number>();
  for (const p of participants) {
    pnlByParticipant.set(p.id, p.total_pnl_percent ?? 0);
  }

  type TerritoryRow = {
    participant_id: string;
    territory_id: string;
    territories: { row_index: number; col_index: number; is_elimination_zone: boolean };
  };

  const { data: rawTerritories } = await supabase
    .from("participant_territories")
    .select("participant_id, territory_id, territories!inner(row_index, col_index, is_elimination_zone)")
    .eq("arena_id", arenaId)
    .eq("is_active", true);

  const territories = rawTerritories as unknown as TerritoryRow[] | null;
  if (!territories?.length) return;

  // Build a map: participantId → territory position
  const territoryByParticipant = new Map<string, { row: number; col: number; territoryId: string }>();
  for (const t of territories) {
    territoryByParticipant.set(t.participant_id, {
      row: t.territories.row_index,
      col: t.territories.col_index,
      territoryId: t.territory_id,
    });
  }

  // For each bot, check if it can attack any adjacent holder
  for (const bot of bots) {
    const botTerritory = territoryByParticipant.get(bot.participantId);
    if (!botTerritory) continue;

    const botPnl = pnlByParticipant.get(bot.participantId) ?? 0;

    for (const [participantId, pos] of territoryByParticipant) {
      if (participantId === bot.participantId) continue;

      // Check adjacency (cardinal directions only)
      const rowDiff = Math.abs(botTerritory.row - pos.row);
      const colDiff = Math.abs(botTerritory.col - pos.col);
      const isAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
      if (!isAdjacent) continue;

      const defenderPnl = pnlByParticipant.get(participantId) ?? 0;
      const requiredLead = defenderPnl * 1.15;

      if (botPnl >= requiredLead) {
        console.log(`[Bot Skirmish] ${bot.personality.name} attacking ${participantId} (${botPnl.toFixed(2)}% vs ${defenderPnl.toFixed(2)}%)`);
        try {
          await resolveSkirmish(arenaId, roundNumber, bot.participantId, participantId);
        } catch (err) {
          console.error(`[Bot Skirmish] resolveSkirmish failed:`, err);
        }
        break; // One attack per bot per interval
      }
    }
  }
}
