"use client";

import { useEffect, useRef } from "react";
import { useWSStore } from "@/stores/ws-store";

const WS_URL = "wss://test-ws.pacifica.fi/ws";

/**
 * Connect to Pacifica public WebSocket for real-time prices.
 * Stores prices in Zustand ws-store.
 */
export function usePacificaWS() {
  const wsRef = useRef<WebSocket | null>(null);
  const { setConnected, updatePrice } = useWSStore();

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({
        method: "subscribe",
        params: { source: "prices" },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.channel === "prices" && Array.isArray(msg.data)) {
          for (const item of msg.data) {
            updatePrice({
              symbol: item.symbol,
              markPrice: parseFloat(item.mark),
              indexPrice: parseFloat(item.oracle),
              timestamp: item.timestamp,
            });
          }
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 3s
      setTimeout(() => {
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      }, 3000);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [setConnected, updatePrice]);
}
