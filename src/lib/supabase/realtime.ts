import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type RealtimeCallback = (payload: Record<string, unknown>) => void;

/**
 * Subscribe to changes on a Supabase table filtered by arena_id.
 */
export function subscribeToTable(
  channelName: string,
  table: string,
  arenaId: string,
  callback: RealtimeCallback
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: `arena_id=eq.${arenaId}`,
      },
      (payload) => {
        callback(payload as unknown as Record<string, unknown>);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a Supabase Realtime channel.
 */
export function unsubscribeChannel(channel: RealtimeChannel): void {
  const supabase = createClient();
  supabase.removeChannel(channel);
}
