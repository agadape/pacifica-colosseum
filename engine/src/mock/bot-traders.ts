import { MockPriceGenerator } from "./price-generator";
import { getSupabase } from "../db";
import { mockCreateMarketOrder } from "./mock-pacifica";

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

  activeBots.delete(arenaId);
  console.log(`[Bot] All bots stopped for arena ${arenaId}`);
}
