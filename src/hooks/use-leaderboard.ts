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

export interface EquitySnapshot {
  id: number;
  participant_id: string;
  round_number: number;
  equity: number;
  drawdown_percent: number;
  recorded_at: string;
}

export function useEquitySnapshots(arenaId: string) {
  return useQuery({
    queryKey: ["snapshots", arenaId],
    queryFn: async () => {
      const res = await fetch(`/api/arenas/${arenaId}/snapshots`);
      const json = await res.json();
      // Group snapshots by participant_id for easy chart consumption
      const byParticipant = new Map<string, EquitySnapshot[]>();
      for (const snap of (json.data ?? []) as EquitySnapshot[]) {
        const arr = byParticipant.get(snap.participant_id) ?? [];
        arr.push(snap);
        byParticipant.set(snap.participant_id, arr);
      }
      return byParticipant;
    },
    enabled: !!arenaId,
    refetchInterval: 5000,
  });
}
