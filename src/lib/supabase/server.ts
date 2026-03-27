import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Server-side Supabase client using service role key.
 * Use this for all write operations and engine-to-DB communication.
 * NEVER expose this on the client side.
 */
export function createServerClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
