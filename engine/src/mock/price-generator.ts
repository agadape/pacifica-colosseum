import { EventEmitter } from "events";
import { updateMockPrice } from "./mock-pacifica";

interface MockPrice {
  symbol: string;
  mark: number;
  oracle: number;
  timestamp: number;
}

const INITIAL_PRICES: Record<string, number> = {
  BTC: 87000,
  ETH: 2100,
  SOL: 148,
};

/**
 * Mock price generator — random walk with configurable volatility.
 * Emits "price" events every second, matching PriceManager interface.
 */
export class MockPriceGenerator extends EventEmitter {
  private prices: Map<string, number> = new Map();
  private interval: ReturnType<typeof setInterval> | null = null;
  private volatility: number;

  constructor(volatility: number = 0.001) {
    super();
    this.volatility = volatility;

    for (const [symbol, price] of Object.entries(INITIAL_PRICES)) {
      this.prices.set(symbol, price);
    }
  }

  start(): void {
    if (this.interval) return;

    this.interval = setInterval(() => {
      const updates: MockPrice[] = [];

      for (const [symbol, price] of this.prices) {
        // Random walk: price * (1 + random(-vol, +vol))
        const change = price * this.volatility * (Math.random() * 2 - 1);
        const newPrice = Math.max(price * 0.5, price + change); // floor at 50% of current
        this.prices.set(symbol, newPrice);
        updateMockPrice(symbol, newPrice);

        updates.push({
          symbol,
          mark: newPrice,
          oracle: newPrice * (1 + (Math.random() - 0.5) * 0.0002), // tiny oracle spread
          timestamp: Date.now(),
        });
      }

      // Emit in same format as PriceManager expects
      this.emit("prices", updates);
    }, 1000);

    console.log("[MockPrices] Started — BTC/ETH/SOL random walk");
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  getPrice(symbol: string): number | undefined {
    return this.prices.get(symbol);
  }

  getAllPrices(): Map<string, number> {
    return this.prices;
  }
}
