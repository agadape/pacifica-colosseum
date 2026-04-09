import { NextRequest } from "next/server";
import { verifyAuth, unauthorized } from "@/lib/auth/middleware";
import { findOrCreateUser } from "@/lib/auth/register";
import { createServerClient } from "@/lib/supabase/server";

const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:4000";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "dev-internal-key";

/**
 * GET /api/arenas/[arenaId]/abilities — Participant's ability inventory.
 * Auth required — returns abilities owned by the calling participant.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
) {
  const authUser = await verifyAuth(request);
  if (!authUser) return unauthorized();

  const user = await findOrCreateUser(authUser);
  if (!user) return Response.json({ error: "Failed to load user" }, { status: 500 });

  const { arenaId } = await params;
  const supabase = createServerClient();

  const { data: participant } = await supabase
    .from("arena_participants")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participant) {
    return Response.json({ data: [] });
  }

  const res = await fetch(
    `${ENGINE_URL}/internal/abilities/${arenaId}/${participant.id}`,
    { headers: { "x-internal-key": INTERNAL_KEY } }
  );

  if (!res.ok) {
    return Response.json({ error: "Failed to fetch abilities" }, { status: 502 });
  }

  const json = await res.json();
  return Response.json(json);
}
