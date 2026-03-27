"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

async function fetchWithToken(url: string, token: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });
  return res.json();
}

export function useSubmitOrder(arenaId: string) {
  const queryClient = useQueryClient();
  const { getAccessToken } = usePrivy();

  return useMutation({
    mutationFn: async (order: {
      type: "market" | "limit";
      symbol: string;
      side: "bid" | "ask";
      size: string;
      price?: string;
      leverage?: number;
      reduce_only?: boolean;
      slippage_percent?: string;
    }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return fetchWithToken(`/api/arenas/${arenaId}/trade`, token, {
        method: "POST",
        body: JSON.stringify(order),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions", arenaId] });
      queryClient.invalidateQueries({ queryKey: ["orders", arenaId] });
    },
  });
}

export function useCancelOrder(arenaId: string) {
  const queryClient = useQueryClient();
  const { getAccessToken } = usePrivy();

  return useMutation({
    mutationFn: async (params: { orderId: string; symbol: string }) => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return fetchWithToken(
        `/api/arenas/${arenaId}/trade/${params.orderId}?symbol=${params.symbol}`,
        token,
        { method: "DELETE" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", arenaId] });
    },
  });
}
