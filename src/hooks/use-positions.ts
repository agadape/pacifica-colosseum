"use client";

import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

async function fetchWithToken(url: string, token: string) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return res.json();
}

export function usePositions(arenaId: string) {
  const { getAccessToken, authenticated } = usePrivy();

  return useQuery({
    queryKey: ["positions", arenaId],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return fetchWithToken(`/api/arenas/${arenaId}/positions`, token);
    },
    enabled: authenticated && !!arenaId,
    staleTime: 8000,
    refetchInterval: 15000,
  });
}

export function useOpenOrders(arenaId: string) {
  const { getAccessToken, authenticated } = usePrivy();

  return useQuery({
    queryKey: ["orders", arenaId],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Not authenticated");
      return fetchWithToken(`/api/arenas/${arenaId}/orders`, token);
    },
    enabled: authenticated && !!arenaId,
    staleTime: 8000,
    refetchInterval: 15000,
  });
}
