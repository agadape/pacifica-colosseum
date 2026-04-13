import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type RealtimeCallback = (payload: Record<string, unknown>) => void;

let sharedClient: ReturnType<typeof createClient> | null = null;

function getClient(): ReturnType<typeof createClient> {
  if (!sharedClient) {
    sharedClient = createClient();
  }
  return sharedClient;
}

/**
 * Subscribe to changes on a Supabase table filtered by arena_id.
 * Reuses a single Supabase client instance across all subscriptions.
 */
export function subscribeToTable(
  channelName: string,
  table: string,
  arenaId: string,
  callback: RealtimeCallback
): RealtimeChannel {
  const supabase = getClient();

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
  const supabase = getClient();
  supabase.removeChannel(channel);
}
