import { NextRequest } from "next/server";

const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:4000";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "dev-internal-key";

/**
 * GET /api/arenas/[arenaId]/abilities/active-effects — Active ability effects.
 * No auth required — spectators can see ongoing effects.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ arenaId: string }> }
) {
  const { arenaId } = await params;

  const res = await fetch(`${ENGINE_URL}/internal/abilities/effects/${arenaId}`, {
    headers: { "x-internal-key": INTERNAL_KEY },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    return Response.json({ error: "Failed to fetch active effects" }, { status: 502 });
  }

  const json = await res.json();
  return Response.json(json);
}
