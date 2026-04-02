import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../src/lib/supabase/types";
import { PacificaClient } from "../../../src/lib/pacifica/client";
import { keypairFromBase58 } from "../../../src/lib/utils/keypair";
import { decryptPrivateKey } from "../../../src/lib/utils/encryption";
import { validateOrder, type OrderInput, type ValidationResult } from "./order-validator";
import { onTradeExecuted } from "./risk-monitor";
import { DEMO_MODE } from "../config";
import {
  mockCreateMarketOrder,
  mockGetAccountInfo,
  mockGetPositions,
  getMockPrice,
  computeMockEquity,
} from "../mock/mock-pacifica";
import { STARTING_CAPITAL } from "../../../src/lib/utils/constants";

type TradeInsert = Database["public"]["Tables"]["trades"]["Insert"];

function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export interface OrderResult {
  success: boolean;
  error?: string;
  data?: unknown;
  tradeId?: string;
}

/**
 * Validate, sign, and relay an order to Pacifica.
 */
export async function executeOrder(
  arenaId: string,
  userId: string,
  order: OrderInput
): Promise<OrderResult> {
  // Step 1: Validate
  const validation = await validateOrder(arenaId, userId, order);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const { participant, round } = validation as Required<ValidationResult>;
  const supabase = getSupabase();
  const encryptionKey = process.env.ENCRYPTION_KEY!;
  const subAddress = participant.subaccount_address!;

  // Step 2: Execute order (mock in DEMO_MODE, real Pacifica otherwise)
  let pacificaResult: { data?: unknown; error?: string };

  if (DEMO_MODE) {
    const price = getMockPrice(order.symbol);
    // Interpret size as USD notional → convert to contracts
    const contracts = parseFloat(order.size) / price;
    if (order.type === "market") {
      mockCreateMarketOrder(subAddress, order.symbol, order.side as "bid" | "ask", contracts, price);
    }
    pacificaResult = { data: { order_id: Math.floor(Math.random() * 100000) } };

    // Update participant PnL immediately after trade
    const startCap = participant.equity_round_1_start ?? STARTING_CAPITAL;
    const equity = computeMockEquity(subAddress, getMockPrice, startCap);
    const pnlPct = ((equity - startCap) / startCap) * 100;
    await supabase
      .from("arena_participants")
      .update({
        total_pnl: Math.round((equity - startCap) * 100) / 100,
        total_pnl_percent: Math.round(pnlPct * 100) / 100,
        max_drawdown_hit: Math.max(participant.max_drawdown_hit ?? 0, Math.max(0, -pnlPct)),
      })
      .eq("id", participant.id);
  } else {
    // Real Pacifica path
    const subKeypair = keypairFromBase58(
      decryptPrivateKey(participant.subaccount_private_key_encrypted!, encryptionKey)
    );
    const pacifica = new PacificaClient({
      secretKey: subKeypair.secretKey,
      publicKey: subKeypair.publicKey,
      testnet: true,
    });

    try {
      if (order.type === "market") {
        pacificaResult = await pacifica.createMarketOrder({
          symbol: order.symbol,
          side: order.side,
          amount: order.size,
          reduce_only: order.reduce_only ?? false,
          slippage_percent: order.slippage_percent ?? "1",
        });
      } else {
        if (!order.price) {
          return { success: false, error: "Limit orders require a price" };
        }
        pacificaResult = await pacifica.createLimitOrder({
          symbol: order.symbol,
          side: order.side,
          amount: order.size,
          price: order.price,
          reduce_only: order.reduce_only ?? false,
          tif: order.tif ?? "GTC",
        });
      }
    } catch (err) {
      return { success: false, error: `Pacifica API error: ${err}` };
    }

    if (pacificaResult.error) {
      return { success: false, error: `Pacifica rejected order: ${pacificaResult.error}` };
    }
  }

  // Step 4: Record trade in DB
  // In DEMO_MODE size was converted to contracts (USD / price); use actual contract size
  const tradeSize = DEMO_MODE
    ? parseFloat(order.size) / getMockPrice(order.symbol)
    : parseFloat(order.size);

  const tradeData: TradeInsert = {
    arena_id: arenaId,
    participant_id: participant.id,
    round_number: round.round_number,
    symbol: order.symbol,
    side: order.side === "bid" ? "buy" : "sell",
    order_type: order.type,
    size: tradeSize,
    price: order.price ? parseFloat(order.price) : 0,
    leverage: order.leverage ?? null,
  };

  const { data: trade } = await supabase
    .from("trades")
    .insert(tradeData)
    .select("id")
    .single();

  // Step 5: Update participant activity counters
  await supabase
    .from("arena_participants")
    .update({
      trades_this_round: (participant.trades_this_round ?? 0) + 1,
      volume_this_round: (participant.volume_this_round ?? 0) + parseFloat(order.size),
      total_trades: (participant.total_trades ?? 0) + 1,
    })
    .eq("id", participant.id);

  // Step 6: Create event
  const eventAction = order.reduce_only ? "trade_closed" : "trade_opened";
  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number: round.round_number,
    event_type: eventAction,
    actor_id: userId,
    message: `${order.side === "bid" ? "Long" : "Short"} ${order.size} ${order.symbol} (${order.type})`,
    data: { symbol: order.symbol, side: order.side, size: order.size, type: order.type },
  });

  // Notify risk monitor of position change
  onTradeExecuted(arenaId, participant.id, {
    symbol: order.symbol,
    side: order.side === "bid" ? "buy" : "sell",
    size: parseFloat(order.size),
    price: order.price ? parseFloat(order.price) : 0,
    leverage: order.leverage,
  });

  return {
    success: true,
    data: pacificaResult.data,
    tradeId: trade?.id,
  };
}

/**
 * Cancel an order on Pacifica.
 */
export async function cancelOrder(
  arenaId: string,
  userId: string,
  symbol: string,
  orderId: number
): Promise<OrderResult> {
  const supabase = getSupabase();
  const encryptionKey = process.env.ENCRYPTION_KEY!;

  // Fetch participant
  const { data: participant } = await supabase
    .from("arena_participants")
    .select("*")
    .eq("arena_id", arenaId)
    .eq("user_id", userId)
    .single();

  if (!participant || participant.status !== "active") {
    return { success: false, error: "Not an active participant" };
  }

  const subKeypair = keypairFromBase58(
    decryptPrivateKey(participant.subaccount_private_key_encrypted!, encryptionKey)
  );

  const pacifica = new PacificaClient({
    secretKey: subKeypair.secretKey,
    publicKey: subKeypair.publicKey,
    testnet: true,
  });

  try {
    const result = await pacifica.cancelOrder({ symbol, order_id: orderId });
    if (result.error) {
      return { success: false, error: `Pacifica: ${result.error}` };
    }
    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: `Cancel failed: ${err}` };
  }
}

/**
 * Get positions for a participant's subaccount from Pacifica.
 */
export async function getPositions(
  arenaId: string,
  userId: string
): Promise<OrderResult> {
  const supabase = getSupabase();
  const encryptionKey = process.env.ENCRYPTION_KEY!;

  const { data: participant } = await supabase
    .from("arena_participants")
    .select("*")
    .eq("arena_id", arenaId)
    .eq("user_id", userId)
    .single();

  if (!participant) {
    return { success: false, error: "Not a participant" };
  }

  if (DEMO_MODE) {
    return { success: true, data: mockGetPositions(participant.subaccount_address!).data };
  }

  const subKeypair = keypairFromBase58(
    decryptPrivateKey(participant.subaccount_private_key_encrypted!, encryptionKey)
  );

  const pacifica = new PacificaClient({
    secretKey: subKeypair.secretKey,
    publicKey: subKeypair.publicKey,
    testnet: true,
  });

  try {
    const result = await pacifica.getPositions();
    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: `Failed to fetch positions: ${err}` };
  }
}

/**
 * Get account info for a participant's subaccount from Pacifica.
 */
export async function getAccountInfo(
  arenaId: string,
  userId: string
): Promise<OrderResult> {
  const supabase = getSupabase();
  const encryptionKey = process.env.ENCRYPTION_KEY!;

  const { data: participant } = await supabase
    .from("arena_participants")
    .select("*")
    .eq("arena_id", arenaId)
    .eq("user_id", userId)
    .single();

  if (!participant) {
    return { success: false, error: "Not a participant" };
  }

  if (DEMO_MODE) {
    return { success: true, data: mockGetAccountInfo(participant.subaccount_address!).data };
  }

  const subKeypair = keypairFromBase58(
    decryptPrivateKey(participant.subaccount_private_key_encrypted!, encryptionKey)
  );

  const pacifica = new PacificaClient({
    secretKey: subKeypair.secretKey,
    publicKey: subKeypair.publicKey,
    testnet: true,
  });

  try {
    const result = await pacifica.getAccountInfo();
    return { success: true, data: result.data };
  } catch (err) {
    return { success: false, error: `Failed to fetch account: ${err}` };
  }
}
