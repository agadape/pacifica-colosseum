import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/arenas/[arenaId]/territories/skirmish-log — Recent skirmish history.
 * Returns participant IDs; client resolves usernames from leaderboard data.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
) {
  const { arenaId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("territory_skirmishes")
    .select(
      "id, arena_id, round_number, attacker_id, defender_id, skirmish_won_by, attacker_pnl_percent, defender_pnl_percent, met_threshold, created_at"
    )
    .eq("arena_id", arenaId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}
