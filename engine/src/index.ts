import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { healthHandler } from "./health";
import { initArenaTimers, scheduleArenaStart } from "./timers/arena-timer";
import { getPriceManager } from "./state/price-manager";
import { DEMO_MODE } from "./config";
import { setupDemoArena, setupTraderDemoArena } from "./mock/demo-setup";
import { executeOrder, cancelOrder, getPositions, getAccountInfo } from "./services/order-relay";
import { getSupabase } from "./db";
import type { OrderInput } from "./services/order-validator";
import { startSkirmishScheduler, declareAttack, getSkirmishPhase } from "./services/skirmish-scheduler";
import { getTerritoryBoardState } from "./services/territory-manager";

/**
 * Wait until Supabase responds to a simple ping before starting heavy setup.
 * Retries every 5s up to maxRetries times.
 */
async function waitForSupabase(maxRetries = 24): Promise<void> {
  const supabase = getSupabase();
  for (let i = 1; i <= maxRetries; i++) {
    try {
      const { error } = await supabase.from("arenas").select("id").limit(1).maybeSingle();
      if (!error) {
        console.log(`[Engine] Supabase ready (attempt ${i})`);
        return;
      }
      console.warn(`[Engine] Supabase not ready (attempt ${i}/${maxRetries}): ${error.message}`);
    } catch (e) {
      console.warn(`[Engine] Supabase ping failed (attempt ${i}/${maxRetries})`);
    }
    await new Promise(r => setTimeout(r, 5_000));
  }
  console.error("[Engine] Supabase never responded — proceeding anyway");
}

const PORT = parseInt(process.env.ENGINE_PORT || "4000", 10);
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "dev-internal-key";

const app = express();
app.use(cors());
app.use(express.json());

// Internal auth middleware
function internalAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = req.headers["x-internal-key"] as string | undefined;
  if (key !== INTERNAL_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.get("/health", healthHandler);

// ---- Debug endpoint (demo retrigger) ----
app.get("/debug/demo", (_req, res) => {
  res.json({ demoMode: DEMO_MODE });
});

app.post("/debug/demo/restart", async (_req, res) => {
  if (!DEMO_MODE) {
    res.status(400).json({ error: "DEMO_MODE is not enabled" });
    return;
  }
  try {
    await setupDemoArena();
    res.json({ ok: true, message: "setupDemoArena() completed" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post("/debug/demo/restart-trader", async (_req, res) => {
  if (!DEMO_MODE) {
    res.status(400).json({ error: "DEMO_MODE is not enabled" });
    return;
  }
  try {
    await setupTraderDemoArena();
    res.json({ ok: true, message: "setupTraderDemoArena() completed" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// ---- Internal endpoints (called by Next.js API routes) ----

app.post("/internal/trade", internalAuth, async (req, res) => {
  const { arenaId, userId, order } = req.body as {
    arenaId: string;
    userId: string;
    order: OrderInput;
  };
  const result = await executeOrder(arenaId, userId, order);
  res.status(result.success ? 200 : 400).json(result);
});

app.post("/internal/cancel-order", internalAuth, async (req, res) => {
  const { arenaId, userId, symbol, orderId } = req.body as {
    arenaId: string;
    userId: string;
    symbol: string;
    orderId: number;
  };
  const result = await cancelOrder(arenaId, userId, symbol, orderId);
  res.status(result.success ? 200 : 400).json(result);
});

app.post("/internal/positions", internalAuth, async (req, res) => {
  const { arenaId, userId } = req.body as { arenaId: string; userId: string };
  const result = await getPositions(arenaId, userId);
  res.status(result.success ? 200 : 400).json(result);
});

app.post("/internal/account-info", internalAuth, async (req, res) => {
  const { arenaId, userId } = req.body as { arenaId: string; userId: string };
  const result = await getAccountInfo(arenaId, userId);
  res.status(result.success ? 200 : 400).json(result);
});

app.post("/internal/arenas/:id/schedule", internalAuth, (req, res) => {
  const { startsAt } = req.body as { startsAt: string };
  scheduleArenaStart(req.params.id as string, new Date(startsAt));
  res.json({ success: true });
});

// ---- Territory endpoints ----

app.get("/internal/territory/board/:arenaId", internalAuth, async (req, res) => {
  const arenaId = req.params.arenaId as string;
  const board = await getTerritoryBoardState(arenaId);
  if (!board) {
    res.status(404).json({ error: "No territory board found for this arena" });
    return;
  }
  res.json(board);
});

app.post("/internal/territory/attack", internalAuth, (req, res) => {
  const { arenaId, attackerId, defenderId } = req.body as {
    arenaId: string;
    attackerId: string;
    defenderId: string;
  };
  const result = declareAttack(arenaId, attackerId, defenderId);
  res.status(result.success ? 200 : 400).json(result);
});

app.get("/internal/territory/phase/:arenaId", internalAuth, (req, res) => {
  const arenaId = req.params.arenaId as string;
  const phase = getSkirmishPhase(arenaId);
  if (phase) {
    res.json({
      active: true,
      declarationOpen: Date.now() < phase.declarationCloseAt,
      declarationClosesAt: new Date(phase.declarationCloseAt).toISOString(),
      resolutionAt: new Date(phase.resolutionAt).toISOString(),
      declaredAttacks: phase.declaredAttacks,
    });
  } else {
    res.json({ active: false });
  }
});

const server = createServer(app);

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");
  ws.on("close", () => {
    console.log("[WS] Client disconnected");
  });
});

server.listen(PORT, async () => {
  console.log(`[Engine] HTTP server running on http://localhost:${PORT}`);
  console.log(`[Engine] WebSocket server running on ws://localhost:${PORT}/ws`);

  if (DEMO_MODE) {
    console.log("[Engine] DEMO_MODE enabled — using mock data");
    // Wait for Supabase to be ready before any setup (avoids overwhelming it on restart)
    await waitForSupabase();
    // Stagger startup: Demo Arena first, then Open Arena 5s later.
    try {
      await setupDemoArena();
    } catch (err) {
      console.error("[Engine] setupDemoArena() threw:", err);
    }
    await new Promise(r => setTimeout(r, 5_000));
    try {
      await setupTraderDemoArena();
    } catch (err) {
      console.error("[Engine] setupTraderDemoArena() threw:", err);
    }

    // Watchdog: re-check both arenas every 60s (was 30s).
    // Both setup functions are idempotent — they no-op if healthy, recover if zombie.
    setInterval(async () => {
      try { await setupDemoArena(); } catch (e) { console.error("[Watchdog] Demo Arena:", e); }
      try { await setupTraderDemoArena(); } catch (e) { console.error("[Watchdog] Open Arena:", e); }
    }, 60_000);

    // Start skirmish scheduler in demo mode
    startSkirmishScheduler();
    console.log("[Engine] Skirmish scheduler started (demo mode)");

    // Skip real arena timers in demo mode — demo manages its own scheduling
  } else {
    // Start real price feed
    const priceManager = getPriceManager();
    priceManager.start();
    console.log("[Engine] Price manager started");

    // Start skirmish scheduler
    startSkirmishScheduler();
    console.log("[Engine] Skirmish scheduler started");

    // Initialize arena timers from DB (real mode only)
    await initArenaTimers();
  }
});
