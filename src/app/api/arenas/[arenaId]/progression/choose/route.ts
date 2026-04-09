import { NextRequest } from "next/server";
import { verifyAuth, unauthorized } from "@/lib/auth/middleware";
import { findOrCreateUser } from "@/lib/auth/register";
import { createServerClient } from "@/lib/supabase/server";

const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:4000";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "dev-internal-key";

/**
 * POST /api/arenas/[arenaId]/progression/choose
 * Body: { nodeId: string }
 * Chooses an unlock node for the current pending progression choice.
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

  const body = await request.json() as { nodeId?: string };
  if (!body.nodeId) return Response.json({ error: "nodeId required" }, { status: 400 });

  const supabase = createServerClient();
  const { data: participant } = await supabase
    .from("arena_participants")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participant) return Response.json({ error: "Not a participant" }, { status: 404 });

  const res = await fetch(`${ENGINE_URL}/internal/progression/choose`, {
    method: "POST",
    headers: {
      "x-internal-key": INTERNAL_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      arenaId,
      participantId: participant.id,
      nodeId: body.nodeId,
    }),
  });

  const json = await res.json();
  return Response.json(json, { status: res.ok ? 200 : 400 });
}
