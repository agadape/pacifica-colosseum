import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { healthHandler } from "./health";
import { initArenaTimers, scheduleArenaStart } from "./timers/arena-timer";
import { getPriceManager } from "./state/price-manager";
import { executeOrder, cancelOrder, getPositions, getAccountInfo } from "./services/order-relay";
import type { OrderInput } from "./services/order-validator";

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

  // Start price feed
  const priceManager = getPriceManager();
  priceManager.start();
  console.log("[Engine] Price manager started");

  // Initialize arena timers from DB
  await initArenaTimers();
});
