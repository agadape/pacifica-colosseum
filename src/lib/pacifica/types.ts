// ============================================================
// Enums
// ============================================================

export type OrderSide = "bid" | "ask";
export type TimeInForce = "GTC" | "IOC" | "FOK" | "POST_ONLY";
export type OrderType = "market" | "limit";

// ============================================================
// Request Types
// ============================================================

export interface MarketOrderRequest {
  symbol: string;
  side: OrderSide;
  amount: string;
  reduce_only: boolean;
  slippage_percent: string;
  client_order_id?: string;
}

export interface LimitOrderRequest {
  symbol: string;
  side: OrderSide;
  amount: string;
  price: string;
  reduce_only: boolean;
  tif: TimeInForce;
  client_order_id?: string;
}

export interface CancelOrderRequest {
  symbol: string;
  order_id?: number;
  client_order_id?: string;
}

export interface CancelAllOrdersRequest {
  all_symbols: boolean;
  exclude_reduce_only: boolean;
}

export interface BatchAction {
  type: "Create" | "Cancel";
  data: LimitOrderRequest | CancelOrderRequest;
}

export interface BatchOrderRequest {
  actions: BatchAction[];
}

export interface TWAPOrderRequest {
  symbol: string;
  side: OrderSide;
  amount: string;
  reduce_only: boolean;
  slippage_percent: string;
  duration_in_seconds: number;
  client_order_id?: string;
}

export interface CancelTWAPOrderRequest {
  symbol: string;
  order_id?: number;
  client_order_id?: string;
}

export interface TPSLTarget {
  stop_price: string;
  limit_price?: string;
  amount?: string;
  client_order_id?: string;
}

export interface TPSLRequest {
  symbol: string;
  side: OrderSide;
  take_profit?: TPSLTarget;
  stop_loss?: TPSLTarget;
}

export interface LeverageUpdateRequest {
  symbol: string;
  leverage: number;
}

export interface TransferFundsRequest {
  to_account: string;
  amount: string;
}

export interface SubaccountCreatePayload {
  main_account: string;
  subaccount: string;
  main_signature: string;
  sub_signature: string;
  timestamp: number;
  expiry_window: number;
}

// ============================================================
// Response Types
// ============================================================

export interface PacificaResponse<T = unknown> {
  data?: T;
  error?: string;
  code?: number;
}

export interface Position {
  symbol: string;
  side: OrderSide;
  size: string;
  entry_price: string;
  mark_price: string;
  unrealized_pnl: string;
  leverage: number;
  liquidation_price: string;
}

export interface SpotBalance {
  symbol: string;
  amount: string;
  available_to_withdraw: string;
}

export interface AccountInfo {
  balance: string;
  fee_level: number;
  maker_fee: string;
  taker_fee: string;
  account_equity: string;
  spot_collateral: string;
  available_to_spend: string;
  available_to_withdraw: string;
  pending_balance: string;
  pending_interest: string;
  total_margin_used: string;
  cross_mmr: string;
  positions_count: number;
  orders_count: number;
  stop_orders_count: number;
  spot_balances: SpotBalance[];
  updated_at: number;
}

export interface SubaccountInfo {
  address: string;
  balance: string;
  created_at: string;
}

export interface OrderInfo {
  order_id: number;
  symbol: string;
  side: OrderSide;
  price: string;
  amount: string;
  filled: string;
  status: string;
  client_order_id?: string;
}

// ============================================================
// WebSocket Types
// ============================================================

export interface PriceData {
  symbol: string;
  mark_price: string;
  index_price: string;
  best_bid: string;
  best_ask: string;
  timestamp: number;
}

export interface OrderbookEntry {
  price: string;
  size: string;
}

export interface OrderbookData {
  symbol: string;
  bids: OrderbookEntry[];
  asks: OrderbookEntry[];
  timestamp: number;
}

export interface WSSubscribeMessage {
  method: "subscribe";
  params: {
    source: string;
    [key: string]: unknown;
  };
}

export interface WSActionMessage {
  id: string;
  params: Record<string, unknown>;
}
