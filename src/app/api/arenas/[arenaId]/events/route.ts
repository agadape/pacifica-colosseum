import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/arenas/[arenaId]/events — Activity feed.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
) {
  const { arenaId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("events")
    .select("id, arena_id, round_number, event_type, actor_id, target_id, data, message, created_at")
    .eq("arena_id", arenaId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data });
}
