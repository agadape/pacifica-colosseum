import { NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { ARENA_PUBLIC_COLUMNS, PARTICIPANT_PUBLIC_COLUMNS } from "@/lib/utils/columns";
import type { Database } from "@/lib/supabase/types";

type ArenaRow = Database["public"]["Tables"]["arenas"]["Row"];

/**
 * GET /api/arenas/[arenaId] — Arena detail with participants and rounds.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
) {
  const { arenaId } = await params;
  const supabase = createServerClient();

  const { data: arena, error } = await supabase
    .from("arenas")
    .select(ARENA_PUBLIC_COLUMNS)
    .eq("id", arenaId)
    .single() as { data: ArenaRow | null; error: unknown };

  if (error || !arena) {
    return Response.json({ error: "Arena not found" }, { status: 404 });
  }

  // Fetch participants and rounds in parallel
  const [participantsRes, roundsRes] = await Promise.all([
    supabase
      .from("arena_participants")
      .select(`${PARTICIPANT_PUBLIC_COLUMNS}, users(username, wallet_address)`)
      .eq("arena_id", arenaId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("rounds")
      .select("id, arena_id, round_number, starts_at, ends_at, name, max_leverage, margin_mode, max_drawdown_percent, elimination_percent, allowed_pairs, traders_at_start, traders_at_end, traders_eliminated, status")
      .eq("arena_id", arenaId)
      .order("round_number", { ascending: true }),
  ]);

  return Response.json({
    data: {
      ...arena,
      participants: participantsRes.data ?? [],
      rounds: roundsRes.data ?? [],
    },
  });
}
