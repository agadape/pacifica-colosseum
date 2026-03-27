# Layer 5: Trading Engine — Iteration Summary

**Date**: 2026-03-27
**Status**: 8/8 tasks completed

---

## Files Created (6 files)

### Engine Services
| File | Purpose |
|------|---------|
| `engine/src/services/order-validator.ts` | `validateOrder()` — checks participant status, allowed pairs, leverage cap, margin mode, grace period |
| `engine/src/services/order-relay.ts` | `executeOrder()` — validate → decrypt key → Pacifica API → record trade → update counters → emit event. Also: `cancelOrder()`, `getPositions()`, `getAccountInfo()` |

### API Routes (4 routes, all auth-protected)
| File | Method | Purpose |
|------|--------|---------|
| `src/app/api/arenas/[arenaId]/trade/route.ts` | POST | Execute trade — Zod-validated, calls engine `/internal/trade` |
| `src/app/api/arenas/[arenaId]/trade/[orderId]/route.ts` | DELETE | Cancel order — calls engine `/internal/cancel-order` |
| `src/app/api/arenas/[arenaId]/positions/route.ts` | GET | Get positions — calls engine `/internal/positions` |
| `src/app/api/arenas/[arenaId]/orders/route.ts` | GET | Get open orders — calls engine `/internal/account-info` |

---

## Files Modified

| File | Change |
|------|--------|
| `engine/src/index.ts` | Added 5 internal endpoints: `/internal/trade`, `/internal/cancel-order`, `/internal/positions`, `/internal/account-info`, `/internal/arenas/:id/schedule`. Added `internalAuth` middleware with `x-internal-key` header check. |

---

## Architecture: Next.js ↔ Engine Communication

```
User → Next.js API Route → fetch(ENGINE_URL/internal/trade) → Engine validates + relays → Pacifica
                              ↑ x-internal-key header          ↑ decrypt subaccount key
                              ↑ INTERNAL_API_KEY env var        ↑ sign with Ed25519
```

Internal endpoints are guarded by `x-internal-key` header. Default key is `dev-internal-key` for local dev. Set `INTERNAL_API_KEY` env var for production.

---

## Order Validation Rules

| Check | Rule | Error Message |
|-------|------|---------------|
| Arena status | Must be in active round (round_1/2/3/sudden_death) | "Arena is not in an active trading round" |
| Participant status | Must be "active" | "Cannot trade — status is ..." |
| Symbol | Must be in round's `allowed_pairs` | "Symbol X not allowed. Allowed: ..." |
| Leverage | Must not exceed round's `max_leverage` | "Leverage Xx exceeds round max of Yx" |
| Grace period | If round status is "eliminating", only reduce_only orders | "Grace period active — only reduce/close orders" |

---

## Verification Results

```
Engine:
  GET  /health                    → 200 OK
  POST /internal/trade (no key)   → 401 Unauthorized
  POST /internal/trade (fake arena) → {"success":false,"error":"Arena not found"}

Next.js API:
  POST   /api/arenas/fake/trade     → 401 Unauthorized
  DELETE /api/arenas/fake/trade/123 → 401 Unauthorized
  GET    /api/arenas/fake/positions  → 401 Unauthorized
  GET    /api/arenas/fake/orders     → 401 Unauthorized

tsc --noEmit (Next.js) → CLEAN
tsc --noEmit (Engine)  → CLEAN
```

---

## What's Next

**Layer 6 (Risk Engine)** — Real-time equity calculation from WebSocket mark prices, drawdown monitoring, equity snapshots. This is the core of the battle royale elimination logic.
