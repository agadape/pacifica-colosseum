import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY } from "@/lib/env";

/**
 * Server-side Supabase client using service role key.
 * Use this for all write operations and engine-to-DB communication.
 * NEVER expose this on the client side.
 */
export function createServerClient() {
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Public read-only Supabase client using anon key.
 * Safe for listing public data (arenas, leaderboard) when service role
 * key is unavailable or when we only need anon-level access.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
}
