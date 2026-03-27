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
 */
export class PriceManager extends EventEmitter {
  private ws: PacificaWS;
  private prices: Map<string, number> = new Map();
  private connected = false;

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

      for (const item of msg.data) {
        const markPrice = parseFloat(item.mark);
        if (isNaN(markPrice)) continue;

        this.prices.set(item.symbol, markPrice);
        this.emit("price", {
          symbol: item.symbol,
          markPrice,
          timestamp: item.timestamp,
        } satisfies PriceUpdate);
      }
    });
  }

  stop(): void {
    this.ws.disconnect();
    this.prices.clear();
  }

  getPrice(symbol: string): number | undefined {
    return this.prices.get(symbol);
  }

  getAllPrices(): Map<string, number> {
    return this.prices;
  }

  get isConnected(): boolean {
    return this.connected;
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
