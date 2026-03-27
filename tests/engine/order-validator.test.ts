import { describe, it, expect } from "vitest";
import { ROUND_PARAMS, PRESETS, calculateRoundTimings } from "../../src/lib/utils/constants";

describe("ROUND_PARAMS", () => {
  it("has 4 rounds", () => {
    expect(ROUND_PARAMS).toHaveLength(4);
  });

  it("round 1 allows 20x leverage", () => {
    expect(ROUND_PARAMS[0].maxLeverage).toBe(20);
  });

  it("round 2 requires isolated margin", () => {
    expect(ROUND_PARAMS[1].marginMode).toBe("isolated");
  });

  it("round 3 allows only BTC", () => {
    expect(ROUND_PARAMS[2].allowedPairs).toEqual(["BTC"]);
  });

  it("sudden death has 8% max drawdown", () => {
    expect(ROUND_PARAMS[3].maxDrawdownPercent).toBe(8);
  });

  it("round names are correct", () => {
    expect(ROUND_PARAMS.map((r) => r.name)).toEqual([
      "Open Field",
      "The Storm",
      "Final Circle",
      "Sudden Death",
    ]);
  });

  it("leverage decreases each round", () => {
    for (let i = 1; i < ROUND_PARAMS.length; i++) {
      expect(ROUND_PARAMS[i].maxLeverage).toBeLessThan(ROUND_PARAMS[i - 1].maxLeverage);
    }
  });

  it("drawdown tightens each round", () => {
    for (let i = 1; i < ROUND_PARAMS.length; i++) {
      expect(ROUND_PARAMS[i].maxDrawdownPercent).toBeLessThan(ROUND_PARAMS[i - 1].maxDrawdownPercent);
    }
  });
});

describe("PRESETS", () => {
  it("blitz totals 5 minutes (300s)", () => {
    const b = PRESETS.blitz;
    expect(b.round1 + b.round2 + b.round3 + b.suddenDeath).toBe(300);
  });

  it("sprint totals 2 hours (7200s)", () => {
    const s = PRESETS.sprint;
    expect(s.round1 + s.round2 + s.round3 + s.suddenDeath).toBe(7200);
  });

  it("daily totals 24 hours (86400s)", () => {
    const d = PRESETS.daily;
    expect(d.round1 + d.round2 + d.round3 + d.suddenDeath).toBe(86400);
  });

  it("weekly totals 7 days (604800s)", () => {
    const w = PRESETS.weekly;
    expect(w.round1 + w.round2 + w.round3 + w.suddenDeath).toBe(604800);
  });
});

describe("calculateRoundTimings", () => {
  it("generates 4 rounds", () => {
    const timings = calculateRoundTimings("blitz", new Date("2026-04-01T00:00:00Z"));
    expect(timings).toHaveLength(4);
  });

  it("rounds are sequential (no gaps)", () => {
    const timings = calculateRoundTimings("blitz", new Date("2026-04-01T00:00:00Z"));
    for (let i = 1; i < timings.length; i++) {
      expect(timings[i].startsAt.getTime()).toBe(timings[i - 1].endsAt.getTime());
    }
  });

  it("first round starts at startsAt", () => {
    const start = new Date("2026-04-01T00:00:00Z");
    const timings = calculateRoundTimings("blitz", start);
    expect(timings[0].startsAt.getTime()).toBe(start.getTime());
  });

  it("last round ends at correct total duration", () => {
    const start = new Date("2026-04-01T00:00:00Z");
    const timings = calculateRoundTimings("blitz", start);
    const expectedEnd = new Date(start.getTime() + 300 * 1000); // 5 min
    expect(timings[3].endsAt.getTime()).toBe(expectedEnd.getTime());
  });
});
