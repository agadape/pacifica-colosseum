/**
 * Test 2.9: Subscribe to Pacifica price WebSocket, receive mark prices.
 * No wallet needed — public subscription.
 */
import WebSocket from "ws";

const WS_URL = "wss://test-ws.pacifica.fi/ws";

console.log(`Connecting to ${WS_URL}...`);
const ws = new WebSocket(WS_URL);

ws.on("open", () => {
  console.log("Connected! Subscribing to prices...\n");
  ws.send(JSON.stringify({
    method: "subscribe",
    params: { source: "prices" },
  }));
});

let count = 0;
ws.on("message", (raw) => {
  const data = JSON.parse(raw.toString());
  console.log(`[Price #${++count}]`, JSON.stringify(data, null, 2));

  if (count >= 5) {
    console.log("\n5 price updates received. Test PASSED.");
    ws.close();
    process.exit(0);
  }
});

ws.on("error", (err) => {
  console.error("WS Error:", err.message);
  process.exit(1);
});

// Timeout after 15 seconds
setTimeout(() => {
  console.log("Timeout — no data received after 15s");
  ws.close();
  process.exit(1);
}, 15000);
