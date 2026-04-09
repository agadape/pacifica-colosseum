"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeToTable, unsubscribeChannel } from "@/lib/supabase/realtime";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Subscribe to Supabase Realtime for an arena.
 * Automatically invalidates TanStack Query caches on updates.
 */
export function useArenaRealtime(arenaId: string) {
  const queryClient = useQueryClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!arenaId) return;

    const channels: RealtimeChannel[] = [];

    // Arena status changes (round transitions, completion)
    channels.push(
      subscribeToTable(`arena-${arenaId}`, "arenas", arenaId, () => {
        queryClient.invalidateQueries({ queryKey: ["arena", arenaId] });
      })
    );

    // Participant updates (PnL, status, elimination)
    channels.push(
      subscribeToTable(`participants-${arenaId}`, "arena_participants", arenaId, () => {
        queryClient.invalidateQueries({ queryKey: ["leaderboard", arenaId] });
        queryClient.invalidateQueries({ queryKey: ["arena", arenaId] });
      })
    );

    // New events (trades, eliminations, loots)
    channels.push(
      subscribeToTable(`events-${arenaId}`, "events", arenaId, () => {
        queryClient.invalidateQueries({ queryKey: ["events", arenaId] });
      })
    );

    // Equity snapshots (for charts)
    channels.push(
      subscribeToTable(`snapshots-${arenaId}`, "equity_snapshots", arenaId, () => {
        queryClient.invalidateQueries({ queryKey: ["snapshots", arenaId] });
      })
    );

    // Votes
    channels.push(
      subscribeToTable(`votes-${arenaId}`, "spectator_votes", arenaId, () => {
        queryClient.invalidateQueries({ queryKey: ["votes", arenaId] });
      })
    );

    // Territory changes (swaps from skirmish, new drafts)
    channels.push(
      subscribeToTable(`territories-${arenaId}`, "participant_territories", arenaId, () => {
        queryClient.invalidateQueries({ queryKey: ["territories", arenaId] });
      })
    );

    channelsRef.current = channels;

    return () => {
      for (const ch of channels) {
        unsubscribeChannel(ch);
      }
      channelsRef.current = [];
    };
  }, [arenaId, queryClient]);
}
