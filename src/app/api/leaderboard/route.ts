import { createServerClient } from "@/lib/supabase/server";
import { USER_PUBLIC_COLUMNS } from "@/lib/utils/columns";

/**
 * GET /api/leaderboard — Top 50 traders by wins, then best PnL.
 * Public endpoint — no auth required.
 */
export async function GET() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("users")
    .select(USER_PUBLIC_COLUMNS)
    .gt("total_arenas_entered", 0)
    .order("total_arenas_won", { ascending: false })
    .order("best_pnl_percent", { ascending: false })
    .limit(50);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: data ?? [] });
}
