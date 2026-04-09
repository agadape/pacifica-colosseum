import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth, unauthorized } from "@/lib/auth/middleware";
import { findOrCreateUser } from "@/lib/auth/register";
import { createServerClient } from "@/lib/supabase/server";

const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:4000";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "dev-internal-key";

const activateSchema = z.object({
  abilityId: z.string(),
  targetParticipantId: z.string().uuid().optional(),
});

/**
 * POST /api/arenas/[arenaId]/abilities/activate — Activate an ability.
 * Auth required — resolves participant from session.
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

  const body = await request.json();
  const parsed = activateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: participant } = await supabase
    .from("arena_participants")
    .select("id, status")
    .eq("arena_id", arenaId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!participant) {
    return Response.json({ error: "Not a participant in this arena" }, { status: 403 });
  }
  if (participant.status !== "active") {
    return Response.json({ error: "Only active participants can activate abilities" }, { status: 400 });
  }

  const res = await fetch(`${ENGINE_URL}/internal/abilities/activate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": INTERNAL_KEY,
    },
    body: JSON.stringify({
      arenaId,
      participantId: participant.id,
      abilityId: parsed.data.abilityId,
      targetParticipantId: parsed.data.targetParticipantId,
    }),
  });

  const result = await res.json();

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ data: { success: true, message: result.message, expiresAt: result.expiresAt } });
}
