import nacl from "tweetnacl";
import bs58 from "bs58";
import { buildSignedRequest, signMessage, createHeader } from "./auth";
import type {
  MarketOrderRequest,
  LimitOrderRequest,
  CancelOrderRequest,
  CancelAllOrdersRequest,
  BatchOrderRequest,
  TWAPOrderRequest,
  CancelTWAPOrderRequest,
  TPSLRequest,
  LeverageUpdateRequest,
  TransferFundsRequest,
  SubaccountCreatePayload,
  PacificaResponse,
  AccountInfo,
  SubaccountInfo,
  OrderInfo,
} from "./types";

const TESTNET_URL = "https://test-api.pacifica.fi/api/v1";
const MAINNET_URL = "https://api.pacifica.fi/api/v1";

export interface PacificaClientConfig {
  secretKey: Uint8Array;
  publicKey: Uint8Array;
  testnet?: boolean;
  agentWallet?: string;
}

export class PacificaClient {
  private secretKey: Uint8Array;
  private publicKey: Uint8Array;
  private baseUrl: string;
  private agentWallet?: string;

  constructor(config: PacificaClientConfig) {
    this.secretKey = config.secretKey;
    this.publicKey = config.publicKey;
    this.baseUrl = config.testnet !== false ? TESTNET_URL : MAINNET_URL;
    this.agentWallet = config.agentWallet;
  }

  // ============================================================
  // Internal helpers
  // ============================================================

  private async post<T>(
    path: string,
    type: string,
    payload: Record<string, unknown>
  ): Promise<PacificaResponse<T>> {
    const body = buildSignedRequest(type, payload, this.secretKey, this.publicKey, {
      agentWallet: this.agentWallet,
    });

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return this.parseResponse<T>(res);
  }

  private async get<T>(path: string): Promise<PacificaResponse<T>> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    return this.parseResponse<T>(res);
  }

  private async parseResponse<T>(res: Response): Promise<PacificaResponse<T>> {
    const text = await res.text();
    try {
      return JSON.parse(text) as PacificaResponse<T>;
    } catch {
      return { data: null as T, error: text } as PacificaResponse<T>;
    }
  }

  get accountAddress(): string {
    return bs58.encode(this.publicKey);
  }

  // ============================================================
  // Orders
  // ============================================================

  async createMarketOrder(params: MarketOrderRequest) {
    return this.post<OrderInfo>("/orders/create_market", "create_market_order", {
      symbol: params.symbol,
      side: params.side,
      amount: params.amount,
      reduce_only: params.reduce_only,
      slippage_percent: params.slippage_percent,
      ...(params.client_order_id && { client_order_id: params.client_order_id }),
    });
  }

  async createLimitOrder(params: LimitOrderRequest) {
    return this.post<OrderInfo>("/orders/create", "create_order", {
      symbol: params.symbol,
      side: params.side,
      amount: params.amount,
      price: params.price,
      reduce_only: params.reduce_only,
      tif: params.tif,
      ...(params.client_order_id && { client_order_id: params.client_order_id }),
    });
  }

  async cancelOrder(params: CancelOrderRequest) {
    return this.post("/orders/cancel", "cancel_order", {
      symbol: params.symbol,
      ...(params.order_id !== undefined && { order_id: params.order_id }),
      ...(params.client_order_id && { client_order_id: params.client_order_id }),
    });
  }

  async cancelAllOrders(params: CancelAllOrdersRequest) {
    return this.post("/orders/cancel_all", "cancel_all_orders", {
      all_symbols: params.all_symbols,
      exclude_reduce_only: params.exclude_reduce_only,
    });
  }

  async batchOrders(params: BatchOrderRequest) {
    return this.post("/orders/batch", "batch_orders", {
      actions: params.actions,
    });
  }

  // ============================================================
  // TWAP Orders
  // ============================================================

  async createTWAPOrder(params: TWAPOrderRequest) {
    return this.post("/orders/twap/create", "create_twap_order", {
      symbol: params.symbol,
      side: params.side,
      amount: params.amount,
      reduce_only: params.reduce_only,
      slippage_percent: params.slippage_percent,
      duration_in_seconds: params.duration_in_seconds,
      ...(params.client_order_id && { client_order_id: params.client_order_id }),
    });
  }

  async cancelTWAPOrder(params: CancelTWAPOrderRequest) {
    return this.post("/orders/twap/cancel", "cancel_twap_order", {
      symbol: params.symbol,
      ...(params.order_id !== undefined && { order_id: params.order_id }),
      ...(params.client_order_id && { client_order_id: params.client_order_id }),
    });
  }

  async getOpenTWAPOrders() {
    return this.get(`/orders/twap?account=${this.accountAddress}`);
  }

  async getTWAPHistory() {
    return this.get(`/orders/twap/history?account=${this.accountAddress}`);
  }

  async getTWAPHistoryById(orderId: number) {
    return this.get(`/orders/twap/history_by_id?order_id=${orderId}`);
  }

  // ============================================================
  // Positions
  // ============================================================

  async setTPSL(params: TPSLRequest) {
    const payload: Record<string, unknown> = {
      symbol: params.symbol,
      side: params.side,
    };
    if (params.take_profit) payload.take_profit = params.take_profit;
    if (params.stop_loss) payload.stop_loss = params.stop_loss;

    return this.post("/positions/tpsl", "set_tpsl", payload);
  }

  // ============================================================
  // Account
  // ============================================================

  async updateLeverage(params: LeverageUpdateRequest) {
    return this.post("/account/leverage", "update_leverage", {
      symbol: params.symbol,
      leverage: params.leverage,
    });
  }

  async getAccountInfo() {
    return this.get<AccountInfo>(`/account?account=${this.accountAddress}`);
  }

  async getPositions() {
    return this.get(`/positions?account=${this.accountAddress}`);
  }

  // ============================================================
  // Subaccounts
  // ============================================================

  /**
   * Create a subaccount with dual-signature flow (matches Python SDK exactly):
   * 1. Sub signs main's public key with type "subaccount_initiate"
   * 2. Main signs sub_signature with type "subaccount_confirm"
   * Both use the same timestamp and expiry_window.
   */
  async createSubaccount(subSecretKey: Uint8Array, subPublicKey: Uint8Array) {
    const mainPubStr = bs58.encode(this.publicKey);
    const subPubStr = bs58.encode(subPublicKey);
    const timestamp = Date.now();
    const expiryWindow = 5000;

    // Step 1: Subaccount signs main account's public key
    const subHeader = { type: "subaccount_initiate", timestamp, expiry_window: expiryWindow };
    const subPayload = { account: mainPubStr };
    const { signature: subSignature } = signMessage(subHeader, subPayload, subSecretKey);

    // Step 2: Main account signs the sub_signature
    const mainHeader = { type: "subaccount_confirm", timestamp, expiry_window: expiryWindow };
    const mainPayload = { signature: subSignature };
    const { signature: mainSignature } = signMessage(mainHeader, mainPayload, this.secretKey);

    const body: SubaccountCreatePayload = {
      main_account: mainPubStr,
      subaccount: subPubStr,
      main_signature: mainSignature,
      sub_signature: subSignature,
      timestamp,
      expiry_window: expiryWindow,
    };

    const res = await fetch(`${this.baseUrl}/account/subaccount/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return res.json() as Promise<PacificaResponse>;
  }

  async listSubaccounts() {
    return this.post<{ subaccounts: SubaccountInfo[] }>(
      "/account/subaccount/list",
      "list_subaccounts",
      {}
    );
  }

  async transferFunds(params: TransferFundsRequest) {
    return this.post("/account/subaccount/transfer", "transfer_funds", {
      to_account: params.to_account,
      amount: params.amount,
    });
  }
}
