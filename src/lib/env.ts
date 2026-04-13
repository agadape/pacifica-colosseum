/**
 * Environment variable validation.
 * Throws immediately at import time if required vars are missing.
 * Import this file in server-side code (API routes, Server Components) only.
 *
 * NEVER import in client components — server-side secrets would leak.
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[env] Missing required environment variable: ${name}\n` +
        `Check your .env.local file or deployment environment settings.`
    );
  }
  return value;
}

// ── Supabase ───────────────────────────────────────────────────────────────
export const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
export const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

// ── Auth (Privy) ───────────────────────────────────────────────────────────
export const PRIVY_APP_ID = requireEnv("NEXT_PUBLIC_PRIVY_APP_ID");
export const PRIVY_APP_SECRET = requireEnv("PRIVY_APP_SECRET");

// ── Encryption ─────────────────────────────────────────────────────────────
export const ENCRYPTION_KEY = requireEnv("ENCRYPTION_KEY");

// ── Engine ─────────────────────────────────────────────────────────────────
// ENGINE_URL and INTERNAL_API_KEY have sane dev defaults so they're optional.
export const ENGINE_URL =
  process.env.ENGINE_URL ?? "http://localhost:4000";
export const ENGINE_INTERNAL_URL =
  process.env.ENGINE_INTERNAL_URL ?? process.env.ENGINE_URL ?? "http://localhost:4000";
export const INTERNAL_API_KEY =
  process.env.INTERNAL_API_KEY ?? "dev-internal-key";

// ── Optional integrations ──────────────────────────────────────────────────
export const ELFA_API_KEY = process.env.ELFA_API_KEY;
export const FUUL_API_KEY = process.env.FUUL_API_KEY;
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
