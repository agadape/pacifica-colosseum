"use client";

import { useQuery } from "@tanstack/react-query";

async function fetchJson(url: string) {
  const res = await fetch(url);
  return res.json();
}

export function useLeaderboard(arenaId: string) {
  return useQuery({
    queryKey: ["leaderboard", arenaId],
    queryFn: () => fetchJson(`/api/arenas/${arenaId}`),
    enabled: !!arenaId,
    refetchInterval: 3000,
    select: (data) => {
      const participants = data?.data?.participants ?? [];
      return [...participants].sort(
        (a: Record<string, number>, b: Record<string, number>) =>
          (b.total_pnl_percent ?? 0) - (a.total_pnl_percent ?? 0)
      );
    },
  });
}

export function useArenaEvents(arenaId: string) {
  return useQuery({
    queryKey: ["events", arenaId],
    queryFn: async () => {
      const res = await fetch(`/api/arenas/${arenaId}/events`);
      return res.json();
    },
    enabled: !!arenaId,
    refetchInterval: 3000,
  });
}
