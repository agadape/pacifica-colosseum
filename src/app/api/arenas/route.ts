import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth, unauthorized } from "@/lib/auth/middleware";
import { findOrCreateUser } from "@/lib/auth/register";
import { createServerClient, createPublicClient } from "@/lib/supabase/server";
import { generateKeypair, publicKeyToString, secretKeyToString } from "@/lib/utils/keypair";
import { encryptPrivateKey } from "@/lib/utils/encryption";
import { PRESETS, STARTING_CAPITAL, MIN_PARTICIPANTS, MAX_PARTICIPANTS, calculateRoundTimings } from "@/lib/utils/constants";
import { ARENA_PUBLIC_COLUMNS } from "@/lib/utils/columns";
import type { Database } from "@/lib/supabase/types";

type ArenaRow = Database["public"]["Tables"]["arenas"]["Row"];
type ArenaInsert = Database["public"]["Tables"]["arenas"]["Insert"];
type RoundInsert = Database["public"]["Tables"]["rounds"]["Insert"];

const createArenaSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().max(200).optional(),
  preset: z.enum(["blitz", "sprint", "daily", "weekly"]),
  starts_at: z.string().datetime(),
  min_participants: z.number().int().min(MIN_PARTICIPANTS).max(MAX_PARTICIPANTS).optional(),
  max_participants: z.number().int().min(MIN_PARTICIPANTS).max(MAX_PARTICIPANTS).optional(),
  is_invite_only: z.boolean().optional(),
});

/**
 * POST /api/arenas — Create a new arena.
 */
export async function POST(request: NextRequest) {
  const authUser = await verifyAuth(request);
  if (!authUser) return unauthorized();

  const user = await findOrCreateUser(authUser);
  if (!user) return Response.json({ error: "Failed to load user" }, { status: 500 });

  const body = await request.json();
  const parsed = createArenaSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const input = parsed.data;
  const presetDurations = PRESETS[input.preset];
  const startsAt = new Date(input.starts_at);

  // Registration deadline = 2 minutes before start (or 30s for blitz)
  const regBuffer = input.preset === "blitz" ? 30_000 : 120_000;
  const registrationDeadline = new Date(startsAt.getTime() - regBuffer);

  // Generate vault keypair
  const vault = generateKeypair();
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    return Response.json({ error: "Server encryption key not configured" }, { status: 500 });
  }

  const supabase = createServerClient();

  // Insert arena
  const arenaData: ArenaInsert = {
    creator_id: user.id,
    name: input.name,
    description: input.description ?? null,
    preset: input.preset,
    starting_capital: STARTING_CAPITAL,
    min_participants: input.min_participants ?? MIN_PARTICIPANTS,
    max_participants: input.max_participants ?? MAX_PARTICIPANTS,
    is_invite_only: input.is_invite_only ?? false,
    registration_deadline: registrationDeadline.toISOString(),
    starts_at: startsAt.toISOString(),
    round_1_duration: presetDurations.round1,
    round_2_duration: presetDurations.round2,
    round_3_duration: presetDurations.round3,
    sudden_death_duration: presetDurations.suddenDeath,
    master_wallet_address: publicKeyToString(vault.publicKey),
    master_private_key_encrypted: encryptPrivateKey(secretKeyToString(vault.secretKey), encryptionKey),
  };

  const { data: arena, error: arenaError } = await supabase
    .from("arenas")
    .insert(arenaData)
    .select(ARENA_PUBLIC_COLUMNS)
    .single() as { data: ArenaRow | null; error: { message: string } | null };

  if (arenaError || !arena) {
    return Response.json({ error: arenaError?.message ?? "Failed to create arena" }, { status: 500 });
  }

  // Insert round records
  const roundTimings = calculateRoundTimings(input.preset, startsAt);
  const roundInserts: RoundInsert[] = roundTimings.map((r) => ({
    arena_id: arena.id,
    round_number: r.roundNumber,
    name: r.name,
    starts_at: r.startsAt.toISOString(),
    ends_at: r.endsAt.toISOString(),
    max_leverage: r.maxLeverage,
    margin_mode: r.marginMode,
    max_drawdown_percent: r.maxDrawdownPercent,
    elimination_percent: r.eliminationPercent,
    allowed_pairs: r.allowedPairs,
  }));

  const { error: roundsError } = await supabase.from("rounds").insert(roundInserts);
  if (roundsError) {
    // Clean up arena if rounds fail
    await supabase.from("arenas").delete().eq("id", arena.id);
    return Response.json({ error: roundsError.message }, { status: 500 });
  }

  // Notify engine to schedule arena start (fire-and-forget)
  const engineUrl = process.env.ENGINE_URL || "http://localhost:4000";
  const internalKey = process.env.INTERNAL_API_KEY || "dev-internal-key";
  fetch(`${engineUrl}/internal/arenas/${arena.id}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": internalKey },
    body: JSON.stringify({ startsAt: startsAt.toISOString() }),
  }).catch((err) => console.error("[Arena] Failed to notify engine to schedule:", err));

  return Response.json({ data: arena }, { status: 201 });
}

/**
 * GET /api/arenas — List arenas.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const preset = searchParams.get("preset");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
  const offset = (page - 1) * limit;

  // Public list endpoint — anon key is sufficient if RLS allows it;
  // service role bypasses RLS (preferred when available).
  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServerClient()
    : createPublicClient();

  let query = supabase
    .from("arenas")
    .select(ARENA_PUBLIC_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const ACTIVE_STATUSES = ["round_1", "round_2", "round_3", "sudden_death"];
  if (status === "active") query = query.in("status", ACTIVE_STATUSES);
  else if (status) query = query.eq("status", status);
  if (preset) query = query.eq("preset", preset);

  const { data, error, count } = await query;

  if (error) {
    console.error("[GET /api/arenas] Supabase error:", error.message, error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    data,
    pagination: { page, limit, total: count ?? 0 },
  });
}
