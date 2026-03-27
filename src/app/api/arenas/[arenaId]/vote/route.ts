import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth, unauthorized } from "@/lib/auth/middleware";
import { findOrCreateUser } from "@/lib/auth/register";
import { createServerClient } from "@/lib/supabase/server";

const voteSchema = z.object({
  round_number: z.number().int().min(1),
  voted_for_id: z.string().uuid(),
});

/**
 * POST /api/arenas/[arenaId]/vote — Cast a Second Life vote.
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
  const parsed = voteSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const { round_number, voted_for_id } = parsed.data;
  const supabase = createServerClient();

  // Check arena exists and is active
  const { data: arena } = await supabase
    .from("arenas")
    .select("id, status, current_round")
    .eq("id", arenaId)
    .single();

  if (!arena) {
    return Response.json({ error: "Arena not found" }, { status: 404 });
  }

  if (arena.current_round !== round_number) {
    return Response.json({ error: "Can only vote for the current round" }, { status: 400 });
  }

  // Check not already voted this round
  const { data: existingVote } = await supabase
    .from("spectator_votes")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("round_number", round_number)
    .eq("voter_id", user.id)
    .single();

  if (existingVote) {
    return Response.json({ error: "Already voted this round" }, { status: 409 });
  }

  // Insert vote
  const { error } = await supabase.from("spectator_votes").insert({
    arena_id: arenaId,
    round_number,
    voter_id: user.id,
    voted_for_id,
  });

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "Already voted this round" }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  // Create event
  await supabase.from("events").insert({
    arena_id: arenaId,
    round_number,
    event_type: "vote_cast",
    actor_id: user.id,
    target_id: voted_for_id,
    message: "Spectator cast a Second Life vote",
    data: { voter: user.id, voted_for: voted_for_id },
  });

  return Response.json({ data: { message: "Vote cast" } }, { status: 201 });
}
