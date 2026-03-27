import WebSocket from "ws";
import { randomUUID } from "crypto";
import bs58 from "bs58";
import { buildSignedRequest } from "./auth";
import type { PriceData, WSSubscribeMessage } from "./types";

const TESTNET_WS = "wss://test-ws.pacifica.fi/ws";
const MAINNET_WS = "wss://ws.pacifica.fi/ws";

export type PriceCallback = (data: PriceData) => void;
export type MessageCallback = (data: unknown) => void;

export interface PacificaWSConfig {
  testnet?: boolean;
  secretKey?: Uint8Array;
  publicKey?: Uint8Array;
  agentWallet?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export class PacificaWS {
  private ws: WebSocket | null = null;
  private url: string;
  private config: PacificaWSConfig;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private shouldReconnect = true;
  private subscriptions: Map<string, MessageCallback> = new Map();
  private pendingSubscriptions: WSSubscribeMessage[] = [];
  private pingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: PacificaWSConfig = {}) {
    this.config = config;
    this.url = config.testnet !== false ? TESTNET_WS : MAINNET_WS;
  }

  // ============================================================
  // Connection management
  // ============================================================

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url);

    this.ws.on("open", () => {
      this.reconnectAttempts = 0;
      this.config.onConnect?.();
      this.startPing();
      this.resubscribe();
    });

    this.ws.on("message", (raw: Buffer | ArrayBuffer | Buffer[]) => {
      try {
        const data = JSON.parse(raw.toString());
        this.handleMessage(data);
      } catch {
        // ignore malformed messages
      }
    });

    this.ws.on("close", () => {
      this.stopPing();
      this.config.onDisconnect?.();
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    });

    this.ws.on("error", (err: Error) => {
      this.config.onError?.(err);
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.stopPing();
    this.ws?.close();
    this.ws = null;
  }

  private scheduleReconnect(): void {
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    this.reconnectAttempts++;

    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private resubscribe(): void {
    for (const msg of this.pendingSubscriptions) {
      this.send(msg);
    }
  }

  // ============================================================
  // Message handling
  // ============================================================

  private send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleMessage(data: Record<string, unknown>): void {
    // Route to appropriate subscription callback
    const source = data.source as string | undefined;
    if (source && this.subscriptions.has(source)) {
      this.subscriptions.get(source)!(data);
    }

    // Also check for action responses (have an id field)
    const id = data.id as string | undefined;
    if (id && this.subscriptions.has(id)) {
      this.subscriptions.get(id)!(data);
      this.subscriptions.delete(id);
    }
  }

  // ============================================================
  // Public subscriptions (no auth required)
  // ============================================================

  subscribe(source: string, callback: MessageCallback): void {
    const msg: WSSubscribeMessage = {
      method: "subscribe",
      params: { source },
    };

    this.subscriptions.set(source, callback);
    this.pendingSubscriptions.push(msg);
    this.send(msg);
  }

  subscribePrices(callback: PriceCallback): void {
    this.subscribe("prices", callback as MessageCallback);
  }

  subscribeOrderbook(symbol: string, callback: MessageCallback): void {
    const msg: WSSubscribeMessage = {
      method: "subscribe",
      params: { source: "orderbook", symbol },
    };

    this.subscriptions.set(`orderbook:${symbol}`, callback);
    this.pendingSubscriptions.push(msg);
    this.send(msg);
  }

  subscribeTWAPOrders(account: string, callback: MessageCallback): void {
    const msg: WSSubscribeMessage = {
      method: "subscribe",
      params: { source: "account_twap_orders", account },
    };

    this.subscriptions.set("account_twap_orders", callback);
    this.pendingSubscriptions.push(msg);
    this.send(msg);
  }

  // ============================================================
  // Authenticated actions (require secretKey/publicKey)
  // ============================================================

  sendOrder(
    actionName: string,
    payload: Record<string, unknown>,
    callback?: MessageCallback
  ): string {
    if (!this.config.secretKey || !this.config.publicKey) {
      throw new Error("secretKey and publicKey required for authenticated actions");
    }

    const id = randomUUID();
    const signedPayload = buildSignedRequest(
      actionName,
      payload,
      this.config.secretKey,
      this.config.publicKey,
      { agentWallet: this.config.agentWallet }
    );

    const msg = {
      id,
      params: {
        [actionName]: signedPayload,
      },
    };

    if (callback) {
      this.subscriptions.set(id, callback);
    }

    this.send(msg);
    return id;
  }

  createMarketOrderWS(
    params: {
      symbol: string;
      side: "bid" | "ask";
      amount: string;
      reduce_only: boolean;
      slippage_percent: string;
      client_order_id?: string;
    },
    callback?: MessageCallback
  ): string {
    return this.sendOrder("create_market_order", params as unknown as Record<string, unknown>, callback);
  }

  createLimitOrderWS(
    params: {
      symbol: string;
      side: "bid" | "ask";
      amount: string;
      price: string;
      reduce_only: boolean;
      tif: string;
      client_order_id?: string;
    },
    callback?: MessageCallback
  ): string {
    return this.sendOrder("create_order", params as unknown as Record<string, unknown>, callback);
  }

  cancelOrderWS(
    params: { symbol: string; order_id?: number; client_order_id?: string },
    callback?: MessageCallback
  ): string {
    return this.sendOrder("cancel_order", params as unknown as Record<string, unknown>, callback);
  }

  cancelAllOrdersWS(
    params: { all_symbols: boolean; exclude_reduce_only: boolean },
    callback?: MessageCallback
  ): string {
    return this.sendOrder("cancel_all_orders", params as unknown as Record<string, unknown>, callback);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
