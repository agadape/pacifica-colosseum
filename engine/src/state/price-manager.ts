import { PacificaWS } from "../../../src/lib/pacifica/websocket";
import { EventEmitter } from "events";

export interface PriceUpdate {
  symbol: string;
  markPrice: number;
  timestamp: number;
}

/**
 * Manages real-time mark prices from Pacifica WebSocket.
 * Maintains an in-memory Map<symbol, markPrice> and emits "price" events.
 * Includes staleness detection — if no update for >10s, marks price as stale.
 */
export class PriceManager extends EventEmitter {
  private ws: PacificaWS;
  private prices: Map<string, number> = new Map();
  private priceTimestamps: Map<string, number> = new Map();
  private connected = false;
  private stalenessThresholdMs = 10_000;

  constructor() {
    super();
    this.ws = new PacificaWS({
      testnet: true,
      onConnect: () => {
        this.connected = true;
        console.log("[PriceManager] Connected to Pacifica WS");
      },
      onDisconnect: () => {
        this.connected = false;
        console.log("[PriceManager] Disconnected — will auto-reconnect");
      },
      onError: (err) => {
        console.error("[PriceManager] WS error:", err.message);
      },
    });
  }

  start(): void {
    this.ws.connect();
    this.ws.subscribePrices((data: unknown) => {
      const msg = data as { channel?: string; data?: Array<{
        symbol: string;
        mark: string;
        timestamp: number;
      }> };

      if (msg.channel !== "prices" || !Array.isArray(msg.data)) return;

      const now = Date.now();
      for (const item of msg.data) {
        const markPrice = parseFloat(item.mark);
        if (isNaN(markPrice)) continue;

        this.prices.set(item.symbol, markPrice);
        this.priceTimestamps.set(item.symbol, now);
        this.emit("price", {
          symbol: item.symbol,
          markPrice,
          timestamp: now,
        } satisfies PriceUpdate);
      }
    });
  }

  stop(): void {
    this.ws.disconnect();
    this.prices.clear();
    this.priceTimestamps.clear();
  }

  getPrice(symbol: string): number | undefined {
    return this.prices.get(symbol);
  }

  /**
   * Returns price only if fresh (updated within stalenessThresholdMs).
   * Returns undefined if stale — caller should use last known price cautiously.
   */
  getFreshPrice(symbol: string): { price: number; stale: boolean } | undefined {
    const price = this.prices.get(symbol);
    if (price === undefined) return undefined;
    const ts = this.priceTimestamps.get(symbol);
    const stale = ts === undefined || (Date.now() - ts) > this.stalenessThresholdMs;
    return { price, stale };
  }

  getAllPrices(): Map<string, number> {
    return this.prices;
  }

  get isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if any price is stale (used for alerts/monitoring).
   */
  hasStalePrices(): boolean {
    const now = Date.now();
    for (const [, ts] of this.priceTimestamps) {
      if ((now - ts) > this.stalenessThresholdMs) return true;
    }
    return false;
  }
}

// Singleton instance
let instance: PriceManager | null = null;

export function getPriceManager(): PriceManager {
  if (!instance) {
    instance = new PriceManager();
  }
  return instance;
}
