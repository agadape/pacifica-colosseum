import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/arenas/[arenaId]/snapshots
 * Returns equity snapshots for all participants in the arena, ordered by time.
 * Used by the Equity Race Chart on the spectate page.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
) {
  const { arenaId } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("equity_snapshots")
    .select("id, participant_id, round_number, equity, drawdown_percent, recorded_at")
    .eq("arena_id", arenaId)
    .order("recorded_at", { ascending: true })
    .limit(600); // 6 bots × ~100 snapshots = plenty for a blitz run

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: data ?? [] });
}
