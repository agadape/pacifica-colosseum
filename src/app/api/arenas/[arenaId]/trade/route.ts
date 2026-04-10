import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyAuth, unauthorized } from "@/lib/auth/middleware";
import { findOrCreateUser } from "@/lib/auth/register";
import { fetchEngine } from "@/lib/utils/fetch-engine";

const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:4000";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "dev-internal-key";

const tradeSchema = z.object({
  type: z.enum(["market", "limit"]),
  symbol: z.string().min(1),
  side: z.enum(["bid", "ask"]),
  size: z.string().min(1),
  price: z.string().optional(),
  leverage: z.number().int().min(1).max(100).optional(),
  reduce_only: z.boolean().optional(),
  slippage_percent: z.string().optional(),
  tif: z.enum(["GTC", "IOC", "FOK", "POST_ONLY"]).optional(),
});

/**
 * POST /api/arenas/[arenaId]/trade — Execute a trade.
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
  const parsed = tradeSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  // Call engine internal endpoint (retries once on 5xx/network error)
  const res = await fetchEngine(`${ENGINE_URL}/internal/trade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": INTERNAL_KEY,
    },
    body: JSON.stringify({
      arenaId,
      userId: user.id,
      order: parsed.data,
    }),
  });

  const result = await res.json();

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ data: result });
}
