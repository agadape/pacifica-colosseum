# Layer 10: Frontend — Trading UI — Iteration Summary

**Date**: 2026-03-27
**Status**: 10/10 tasks completed

---

## Files Created (12 files)

### Hooks
| File | Purpose |
|------|---------|
| `src/hooks/use-trading.ts` | `useSubmitOrder()`, `useCancelOrder()` — TanStack mutations calling trade API |
| `src/hooks/use-positions.ts` | `usePositions()`, `useOpenOrders()` — auto-refetch every 5s |
| `src/hooks/use-websocket.ts` | `usePacificaWS()` — connects to Pacifica public WS, stores prices in Zustand |

### Stores
| File | Purpose |
|------|---------|
| `src/stores/trading-store.ts` | Order form state: type, side, size, price, leverage, reduceOnly |
| `src/stores/ws-store.ts` | Mark prices from WebSocket, connection status |

### Components
| File | Purpose |
|------|---------|
| `src/components/trading/OrderForm.tsx` | Market/Limit tabs, Long/Short buttons, size, price, leverage slider, reduce-only, error display |
| `src/components/trading/PositionList.tsx` | Positions table with real-time PnL from WS prices, close button |
| `src/components/trading/OrderList.tsx` | Open orders table with cancel button |
| `src/components/trading/Chart.tsx` | Lightweight Charts v5 line chart, live WS price updates, symbol header |
| `src/components/trading/AccountPanel.tsx` | Equity (large mono), balance, uPnL, DrawdownMeter, loot badges |
| `src/components/shared/DrawdownMeter.tsx` | Horizontal bar, 4 color levels (green/yellow/orange/red), pulse on danger zone |

### Pages
| File | Purpose |
|------|---------|
| `src/app/arenas/[arenaId]/trade/page.tsx` | Trading layout: round indicator, symbol selector, chart (3/4), order form + account (1/4), positions + orders (bottom) |

---

## Verification

```
tsc --noEmit → CLEAN
```

---

## What's Next

**Layer 11 (Frontend — Spectator)** — Survivor grid, activity feed, drawdown meters, voting.
