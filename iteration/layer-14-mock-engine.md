# Layer 14: Mock Engine — Iteration Summary

**Date**: 2026-03-27
**Status**: 6/6 tasks completed

---

## Files Created (5 files)

| File | Purpose |
|------|---------|
| `engine/src/config.ts` | `DEMO_MODE` toggle from `process.env.DEMO_MODE` |
| `engine/src/mock/price-generator.ts` | Random walk prices for BTC ($87k), ETH ($2.1k), SOL ($148). 1s interval. Configurable volatility. |
| `engine/src/mock/mock-pacifica.ts` | In-memory Pacifica: accounts, positions, order fills, transfers. Same interface, zero network. |
| `engine/src/mock/bot-traders.ts` | 6 bot personalities: Conservative Carl, Aggressive Alice, Scalper Sam, YOLO Yuki, Steady Steve, Degen Dave. Each trades at different intervals with different strategies. |
| `engine/src/mock/demo-setup.ts` | `setupDemoArena()`: creates system user, Blitz arena, 6 bot participants, funds them via mock, starts bot trading after 30s. |

## Files Modified (1 file)

| File | Change |
|------|--------|
| `engine/src/index.ts` | On startup: if DEMO_MODE → setupDemoArena(), else → real PriceManager |

## How to Use

```bash
# Normal mode (real Pacifica)
DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config engine/src/index.ts

# Demo mode (mock everything)
DEMO_MODE=true DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config engine/src/index.ts
```

Demo creates a Blitz arena (5 min total) with 6 bots trading automatically. Frontend shows real data from Supabase.

---

## What's Next

**Layer 15 (Polish & Deployment)** — the final layer.
