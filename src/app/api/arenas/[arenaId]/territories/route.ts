import { NextRequest } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:4000";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "dev-internal-key";

/**
 * GET /api/arenas/[arenaId]/territories — Territory board state.
 * Proxies to engine internal API. No auth required (spectators can view).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
) {
  const { arenaId } = await params;

  const res = await fetch(`${ENGINE_URL}/internal/territory/board/${arenaId}`, {
    headers: { "x-internal-key": INTERNAL_KEY },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    if (res.status === 404) {
      return Response.json({ error: "No territory board found for this arena" }, { status: 404 });
    }
    return Response.json({ error: "Failed to fetch territory board" }, { status: 502 });
  }

  const board = await res.json();
  return Response.json({ data: board });
}
