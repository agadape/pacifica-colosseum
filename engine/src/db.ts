import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/types";

/**
 * Shared Supabase client singleton for the engine process.
 * All services import this instead of calling createClient() themselves.
 * Prevents connection pool exhaustion on Supabase Nano/Free tier.
 */
let _client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabase(): ReturnType<typeof createClient<Database>> {
  if (!_client) {
    _client = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _client;
}
