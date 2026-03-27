import { NextRequest } from "next/server";
import { verifyAuth, unauthorized } from "@/lib/auth/middleware";
import { findOrCreateUser } from "@/lib/auth/register";
import { createServerClient } from "@/lib/supabase/server";

/**
 * DELETE /api/arenas/[arenaId]/leave — Leave an arena (registration phase only).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
) {
  const authUser = await verifyAuth(request);
  if (!authUser) return unauthorized();

  const user = await findOrCreateUser(authUser);
  if (!user) return Response.json({ error: "Failed to load user" }, { status: 500 });

  const { arenaId } = await params;
  const supabase = createServerClient();

  // Fetch arena
  const { data: arena } = await supabase
    .from("arenas")
    .select("status")
    .eq("id", arenaId)
    .single();

  if (!arena) {
    return Response.json({ error: "Arena not found" }, { status: 404 });
  }

  if (arena.status !== "registration") {
    return Response.json({ error: "Can only leave during registration phase" }, { status: 400 });
  }

  // Delete participant record
  const { error } = await supabase
    .from("arena_participants")
    .delete()
    .eq("arena_id", arenaId)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: { message: "Left arena" } });
}
