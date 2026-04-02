import { NextRequest } from "next/server";
import { verifyAuth, unauthorized } from "@/lib/auth/middleware";
import { findOrCreateUser } from "@/lib/auth/register";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/arenas/[arenaId]/orders — Get own trade history for this arena.
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

  // Get participant record to find participant_id
  const { data: participant } = await supabase
    .from("arena_participants")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("user_id", user.id)
    .single();

  if (!participant) {
    return Response.json({ data: [] });
  }

  const { data: trades } = await supabase
    .from("trades")
    .select("id, symbol, side, order_type, size, price, leverage, created_at, round_number")
    .eq("arena_id", arenaId)
    .eq("participant_id", participant.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return Response.json({ data: trades ?? [] });
}
