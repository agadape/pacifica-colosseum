# Layer 15 — Session Apr 9 2026 (Supabase Stability — Full Resolution)

## Problem Summary

Supabase free tier kept hitting connection pool exhaustion, causing 522/521 errors,
engine zombie loops, and arenas page 500s. This session identified and fixed every
root cause. The system is now stable.

---

## Root Cause Chain (full picture)

```
.single() fails on multiple rows
  → setupDemoArena falls through → creates new arena
    → race condition (auto-restart + watchdog both run)
      → 2 arenas created per cycle
        → pnlTimer running for each arena (6 concurrent UPDATEs × multiple arenas)
          → PostgREST connection pool exhausted
            → Supabase 522 → engine can't read DB
              → .single() returns null again → more arenas
                → (repeat forever)
```

---

## Fixes Applied

### 1. `engine/src/mock/demo-setup.ts`

**`maybeSingle()` on arena existence checks** (was `.single()`):
- `.single()` returns `null` when multiple rows match (PostgREST 406 error)
- When `existing = null`, setup falls through and CREATE a new arena
- Fix: `.order("created_at", { ascending: false }).limit(1).maybeSingle()`
- Always picks the newest matching arena, never fails on multiple rows

**Mutex guard on `setupDemoArena` and `setupTraderDemoArena`**:
- Race condition: auto-restart callback (fires immediately after game ends) AND watchdog (60s) both see no existing arena → both create one simultaneously
- Fix: `_demoSetupBusy` / `_traderSetupBusy` boolean guards — second concurrent call returns immediately

**pnlTimer 10s→15s + busy-guard**:
- 15s interval (was 10s, originally 3s)
- `pnlBusy` flag skips tick if previous DB calls still in-flight

**snapshotTimer 5s→30s** on trader arena (was accidentally left at 5s)

**roundRefreshTimer extracted** — round config (current_round, max_drawdown_percent) now fetched every 60s in its own timer instead of inside every 10s pnlTimer tick

**Note**: upsert was attempted but reverted — Supabase `.upsert()` requires all non-nullable columns (`arena_id`, `user_id`, etc.). Partial PnL updates must use `.update().eq("id", ...)`.

### 2. `engine/src/index.ts`

**`waitForSupabase()`**:
```typescript
async function waitForSupabase(maxRetries = 24): Promise<void> {
  // pings DB every 5s up to 2 minutes before running any setup
}
```
- Prevents startup burst from overwhelming a recovering Supabase
- Engine logs `[Engine] Supabase ready (attempt N)` before proceeding

**Staggered startup** — 5s gap between `setupDemoArena()` and `setupTraderDemoArena()`

**Watchdog 30s→60s**

### 3. `src/hooks/use-leaderboard.ts`, `use-arena.ts`, `use-positions.ts`

Frontend hooks had both Realtime subscriptions AND aggressive polling active simultaneously:
- `useLeaderboard`: 3s → 60s fallback
- `useArenaEvents`: 3s → 60s fallback
- `useArena` (detail): 5s → 60s fallback
- `useVoteStatus`: 5s → 60s fallback
- `useEquitySnapshots`: 5s → 60s fallback, `refetchIntervalInBackground: false`
- `useArenas` (list): 10s → 30s
- `usePositions`, `useOpenOrders`: 5s → 15s (no realtime coverage)

Estimated reduction: ~3,370 req/hr per user → ~480 req/hr (85% cut)

---

## Emergency Procedures (for next agent)

### If Supabase goes down again:

**Step 1** — Pause engine (stops all DB requests):
```
railway.toml: startCommand = "node -e \"setTimeout(()=>{}, 2147483647)\""
git add railway.toml && git commit -m "chore: pause engine" && git push
```
Then redeploy Railway.

**Step 2** — Restart Supabase project (Settings → Infrastructure → Restart)

**Step 3** — Wait ~60s, verify Supabase responds, then run cleanup SQL:
```sql
UPDATE arenas SET status = 'cancelled', ended_at = NOW()
WHERE name IN ('Demo Arena', 'Open Arena')
AND status NOT IN ('completed', 'cancelled')
AND id != (
  SELECT id FROM arenas WHERE name = 'Demo Arena'
  AND status NOT IN ('completed', 'cancelled')
  ORDER BY created_at DESC LIMIT 1
);
```

**Step 4** — Restore engine start command:
```
railway.toml: startCommand = "cd engine && node dist/engine/src/index.js"
git add railway.toml && git commit -m "chore: restore engine" && git push
```
Then redeploy Railway.

---

## Current State (end of session)

- Supabase: ✅ healthy, ~0.6s response, ~15-20 req/min
- Railway engine: ✅ running, latest commit `aa7182a`, uptime stable
- Vercel frontend: ✅ deployed, arenas page working
- DB: ✅ exactly 1 Demo Arena (running blitz) + 1 Open Arena (registration)
- No zombie arenas

---

## What's Next

- 15.21 — Record backup demo video (user records this)
- 15.23 — Write final README.md
- 15.24 — Prepare submission materials
- 15.25 — Submit via https://forms.gle/zYm9ZBH1SoUE9t9o7
