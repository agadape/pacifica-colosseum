import { EventEmitter } from "events";
import { updateMockPrice } from "./mock-pacifica";

interface MockPrice {
  symbol: string;
  mark: number;
  oracle: number;
  timestamp: number;
}

interface ActiveShock {
  stepsLeft: number;
  stepSize: number; // price change per tick (negative = crash, positive = pump)
}

const INITIAL_PRICES: Record<string, number> = {
  BTC: 87000,
  ETH: 2100,
  SOL: 148,
};

/**
 * Mock price generator — random walk with configurable volatility.
 * Emits "price" events every second, matching PriceManager interface.
 *
 * Hazard extensions:
 * - applyShock(): gradual directional price move (flash crash / pump)
 * - setVolatilityMultiplier(): temporarily scale volatility (high_volatility hazard)
 */
export class MockPriceGenerator extends EventEmitter {
  private prices: Map<string, number> = new Map();
  private interval: ReturnType<typeof setInterval> | null = null;
  private volatility: number;

  // Hazard state
  private activeShocks: Map<string, ActiveShock> = new Map();
  private volatilityMultiplier: number = 1;
  private volatilityResetTimer: ReturnType<typeof setTimeout> | null = null;

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
        let newPrice: number;

        const shock = this.activeShocks.get(symbol);
        if (shock && shock.stepsLeft > 0) {
          // Shock mode: move toward target price deterministically
          newPrice = Math.max(price * 0.01, price + shock.stepSize);
          shock.stepsLeft--;
          if (shock.stepsLeft === 0) {
            this.activeShocks.delete(symbol);
            console.log(`[MockPrices] Shock expired for ${symbol}, price now ${newPrice.toFixed(2)}`);
          }
        } else {
          // Normal random walk — apply volatility multiplier if active
          const effectiveVol = this.volatility * this.volatilityMultiplier;
          const change = price * effectiveVol * (Math.random() * 2 - 1);
          newPrice = Math.max(price * 0.5, price + change);
        }

        this.prices.set(symbol, newPrice);
        updateMockPrice(symbol, newPrice);

        updates.push({
          symbol,
          mark: newPrice,
          oracle: newPrice * (1 + (Math.random() - 0.5) * 0.0002),
          timestamp: Date.now(),
        });
      }

      this.emit("prices", updates);
    }, 1000);

    console.log("[MockPrices] Started — BTC/ETH/SOL random walk");
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.volatilityResetTimer) {
      clearTimeout(this.volatilityResetTimer);
      this.volatilityResetTimer = null;
    }
  }

  getPrice(symbol: string): number | undefined {
    return this.prices.get(symbol);
  }

  getAllPrices(): Map<string, number> {
    return this.prices;
  }

  /**
   * Apply a directional price shock over durationMs.
   * Used by flash_crash hazard (DEMO_MODE only).
   *
   * @param symbol      - Which asset to shock (e.g. "BTC")
   * @param magnitudePct - Fractional move (negative = down, e.g. -0.10 = -10%)
   * @param durationMs   - Total duration of the move in ms (steps = durationMs / 1000)
   */
  applyShock(symbol: string, magnitudePct: number, durationMs: number): void {
    const currentPrice = this.prices.get(symbol);
    if (!currentPrice) {
      console.warn(`[MockPrices] applyShock: unknown symbol ${symbol}`);
      return;
    }

    const steps = Math.max(1, Math.floor(durationMs / 1000));
    const totalMove = currentPrice * magnitudePct;
    const stepSize = totalMove / steps;

    this.activeShocks.set(symbol, { stepsLeft: steps, stepSize });
    console.log(`[MockPrices] Shock started: ${symbol} ${magnitudePct > 0 ? "+" : ""}${(magnitudePct * 100).toFixed(0)}% over ${steps}s (${stepSize.toFixed(2)}/tick)`);
  }

  /**
   * Temporarily multiply price swing volatility.
   * Used by high_volatility hazard (DEMO_MODE only).
   *
   * @param multiplier  - How much to scale volatility (e.g. 2.0 = double swings)
   * @param durationMs  - How long before reverting to 1.0
   */
  setVolatilityMultiplier(multiplier: number, durationMs: number): void {
    // Cancel any existing reset timer
    if (this.volatilityResetTimer) {
      clearTimeout(this.volatilityResetTimer);
      this.volatilityResetTimer = null;
    }

    this.volatilityMultiplier = multiplier;
    console.log(`[MockPrices] Volatility multiplier set to ${multiplier}× for ${durationMs / 1000}s`);

    this.volatilityResetTimer = setTimeout(() => {
      this.volatilityMultiplier = 1;
      this.volatilityResetTimer = null;
      console.log("[MockPrices] Volatility multiplier reset to 1×");
    }, durationMs);
  }
}
