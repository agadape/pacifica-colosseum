import { createServerClient } from "@/lib/supabase/server";

/**
 * POST /api/demo/reset
 * Force-completes any zombie demo arena (round end time passed but still "active").
 * Called by Vercel cron every 5 minutes AND by the "Reset Demo" button in the UI.
 * No auth required — demo-only, no sensitive data modified.
 */
export async function POST() {
  const supabase = createServerClient();

  const { data: zombies } = await supabase
    .from("arenas")
    .select("id, name, status, current_round_ends_at")
    .eq("name", "Demo Arena")
    .in("status", ["registration", "round_1", "round_2", "round_3", "sudden_death"])
    .is("ended_at", null);

  if (!zombies || zombies.length === 0) {
    return Response.json({ data: { reset: 0, message: "No zombie arenas found" } });
  }

  const now = new Date();
  const toReset = zombies.filter((a) => {
    if (!a.current_round_ends_at) return false;
    return new Date(a.current_round_ends_at) < now;
  });

  if (toReset.length === 0) {
    return Response.json({ data: { reset: 0, message: "All arenas are still active" } });
  }

  await supabase
    .from("arenas")
    .update({ status: "completed", ended_at: now.toISOString() })
    .in("id", toReset.map((a) => a.id));

  console.log(`[Demo Reset] Completed ${toReset.length} zombie arena(s): ${toReset.map((a) => a.id).join(", ")}`);

  return Response.json({
    data: {
      reset: toReset.length,
      message: `Reset ${toReset.length} arena(s). Engine will create a fresh one on next start.`,
    },
  });
}

/**
 * GET /api/demo/reset — Check if any zombie arenas exist (used by UI).
 */
export async function GET() {
  const supabase = createServerClient();

  const { data: active } = await supabase
    .from("arenas")
    .select("id, status, current_round_ends_at, updated_at")
    .eq("name", "Demo Arena")
    .in("status", ["registration", "round_1", "round_2", "round_3", "sudden_death"])
    .is("ended_at", null)
    .single();

  if (!active) {
    return Response.json({ data: { isZombie: false, hasActiveArena: false } });
  }

  const roundEndsAt = active.current_round_ends_at
    ? new Date(active.current_round_ends_at)
    : null;
  const isZombie = roundEndsAt !== null && roundEndsAt < new Date();

  return Response.json({
    data: { isZombie, hasActiveArena: true, arenaId: active.id, roundEndsAt },
  });
}
