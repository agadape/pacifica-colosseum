import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { generateCommentary } from "@/lib/elfa/client";
import { ARENA_PUBLIC_COLUMNS } from "@/lib/utils/columns";
import type { Database } from "@/lib/supabase/types";

type ArenaRow = Database["public"]["Tables"]["arenas"]["Row"];

/**
 * GET /api/markets/commentary/[arenaId] — AI-generated arena commentary.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
) {
  const { arenaId } = await params;
  const supabase = createServerClient();

  const { data: arena } = await supabase
    .from("arenas")
    .select(ARENA_PUBLIC_COLUMNS)
    .eq("id", arenaId)
    .single() as { data: ArenaRow | null };

  if (!arena) {
    return Response.json({ error: "Arena not found" }, { status: 404 });
  }

  const { data: round } = await supabase
    .from("rounds")
    .select("name, allowed_pairs")
    .eq("arena_id", arenaId)
    .eq("round_number", arena.current_round)
    .single();

  const { count } = await supabase
    .from("arena_participants")
    .select("id", { count: "exact", head: true })
    .eq("arena_id", arenaId)
    .eq("status", "active");

  const commentary = await generateCommentary({
    arenaName: arena.name,
    roundNumber: arena.current_round,
    roundName: round?.name ?? "Unknown",
    activeTraders: count ?? 0,
    topSymbols: round?.allowed_pairs ?? ["BTC"],
  });

  return Response.json({ data: commentary });
}
