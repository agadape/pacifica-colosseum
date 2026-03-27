import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { healthHandler } from "./health";
import { initArenaTimers } from "./timers/arena-timer";

const PORT = parseInt(process.env.ENGINE_PORT || "4000", 10);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", healthHandler);

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

  // Initialize arena timers from DB
  await initArenaTimers();
});
