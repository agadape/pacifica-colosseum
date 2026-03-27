import { NextRequest } from "next/server";
import { verifyAuth, unauthorized } from "@/lib/auth/middleware";
import { findOrCreateUser } from "@/lib/auth/register";

const ENGINE_URL = process.env.ENGINE_URL || "http://localhost:4000";
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || "dev-internal-key";

/**
 * DELETE /api/arenas/[arenaId]/trade/[orderId] — Cancel an order.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ arenaId: string; orderId: string }> }
) {
  const authUser = await verifyAuth(request);
  if (!authUser) return unauthorized();

  const user = await findOrCreateUser(authUser);
  if (!user) return Response.json({ error: "Failed to load user" }, { status: 500 });

  const { arenaId, orderId } = await params;
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return Response.json({ error: "symbol query parameter required" }, { status: 400 });
  }

  const res = await fetch(`${ENGINE_URL}/internal/cancel-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": INTERNAL_KEY,
    },
    body: JSON.stringify({
      arenaId,
      userId: user.id,
      symbol,
      orderId: parseInt(orderId, 10),
    }),
  });

  const result = await res.json();

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ data: result });
}
