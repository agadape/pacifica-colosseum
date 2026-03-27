# Layer 4: Arena Management — Iteration Summary

**Date**: 2026-03-27
**Status**: 9/9 tasks completed

---

## Files Created (7 files)

### Shared Constants
| File | Purpose |
|------|---------|
| `src/lib/utils/constants.ts` | Round params (Open Field/Storm/Final Circle/Sudden Death), preset durations (Blitz/Sprint/Daily/Weekly), protocol constants, `calculateRoundTimings()` helper |

### API Routes (5 routes)
| File | Method | Auth | Purpose |
|------|--------|------|---------|
| `src/app/api/arenas/route.ts` | POST | Yes | Create arena — Zod validation, vault keypair gen, encrypt key, insert arena + 4 rounds |
| `src/app/api/arenas/route.ts` | GET | No | List arenas — filter by status/preset, pagination, includes participant count |
| `src/app/api/arenas/[arenaId]/route.ts` | GET | No | Arena detail — arena + participants + rounds |
| `src/app/api/arenas/[arenaId]/join/route.ts` | POST | Yes | Join arena — validates registration/capacity/duplicates, generates subaccount keypair, encrypts + stores |
| `src/app/api/arenas/[arenaId]/leave/route.ts` | DELETE | Yes | Leave arena — only during registration phase |

### Engine Services (2 files)
| File | Purpose |
|------|---------|
| `engine/src/services/arena-manager.ts` | `startArena()` — verify participants, create Pacifica subaccounts, fund $1000 each, set leverage, update status. `cancelArena()` — mark cancelled + event. |
| `engine/src/timers/arena-timer.ts` | `initArenaTimers()` — on engine startup, schedule all pending arenas. `scheduleArenaStart()` — setTimeout to trigger startArena at starts_at. |

---

## Files Modified

| File | Change |
|------|--------|
| `engine/src/index.ts` | Added `initArenaTimers()` call on server startup |
| `engine/tsconfig.json` | Changed `rootDir` to `..`, added shared lib includes, so engine can import from `src/lib/` |

---

## Packages Installed

| Package | Purpose |
|---------|---------|
| `zod` | API input validation for arena creation |

---

## Key Architecture Decisions

1. **Engine imports from `../src/lib/`** — Engine uses `tsx` at runtime which resolves cross-directory imports fine. Adjusted `tsconfig.json` with `rootDir: ".."` and selective includes (only `supabase/types`, `pacifica/*`, `utils/*`) to avoid pulling in Next.js-specific files that use `@/` aliases.

2. **Vault keypair per arena** — Each arena gets its own Ed25519 keypair as a "vault". The private key is AES-256-GCM encrypted and stored in the `arenas` table. On start, engine decrypts it to create subaccounts and transfer funds.

3. **Subaccount keypair per participant** — On join, a subaccount keypair is generated and encrypted in `arena_participants`. The Pacifica subaccount creation (dual-signature) happens at arena start, not at join time, to batch the operations.

4. **Timer-based arena starts** — Engine uses `setTimeout` to schedule `startArena()` at each arena's `starts_at` time. On engine restart, `initArenaTimers()` re-schedules all pending arenas from DB.

---

## Verification Results

```
GET  /api/arenas           → {"data":[],"pagination":{"page":1,"limit":20,"total":0}}
GET  /api/arenas/fake-id   → {"error":"Arena not found"}
POST /api/arenas (no auth) → {"error":"Unauthorized"}
POST /api/arenas/x/join    → {"error":"Unauthorized"}
tsc --noEmit (Next.js)     → zero errors
tsc --noEmit (Engine)      → zero errors
```

---

## What's Next

**Layer 5 (Trading Engine)** — Order validation against round rules, execution relay to Pacifica, position tracking.
