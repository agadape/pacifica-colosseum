import { NextRequest } from "next/server";
import { verifyAuth, unauthorized } from "@/lib/auth/middleware";
import { findOrCreateUser } from "@/lib/auth/register";
import { createServerClient } from "@/lib/supabase/server";

const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:4000";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "dev-internal-key";

/**
 * POST /api/arenas/[arenaId]/alliances/decline
 * Body: { allianceId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
) {
  const authUser = await verifyAuth(request);
  if (!authUser) return unauthorized();

  const user = await findOrCreateUser(authUser);
  if (!user) return Response.json({ error: "Failed to load user" }, { status: 500 });

  const { arenaId } = await params;
  const body = await request.json() as { allianceId?: string };
  if (!body.allianceId) return Response.json({ error: "allianceId required" }, { status: 400 });

  const supabase = createServerClient();
  const { data: participant } = await supabase
    .from("arena_participants")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participant) return Response.json({ error: "Not a participant" }, { status: 404 });

  const res = await fetch(`${ENGINE_URL}/internal/alliances/decline`, {
    method: "POST",
    headers: { "x-internal-key": INTERNAL_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ arenaId, allianceId: body.allianceId, participantId: participant.id }),
  });

  const json = await res.json();
  return Response.json(json, { status: res.ok ? 200 : 400 });
}
