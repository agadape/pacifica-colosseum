"use client";

import { useEffect, useRef, useCallback } from "react";
import { useWSStore } from "@/stores/ws-store";

const WS_URL = "wss://test-ws.pacifica.fi/ws";
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000, 30000];

/**
 * Connect to Pacifica public WebSocket for real-time prices.
 * Stores prices in Zustand ws-store.
 * Auto-reconnects with exponential backoff.
 */
export function usePacificaWS() {
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);
  const { setConnected, updatePrice } = useWSStore();

  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      attemptRef.current = 0;
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
      if (!mountedRef.current) return;

      const delay = RECONNECT_DELAYS[Math.min(attemptRef.current, RECONNECT_DELAYS.length - 1)];
      attemptRef.current++;
      setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [setConnected, updatePrice]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);
}
