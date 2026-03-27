import { NextRequest } from "next/server";
import { getSentiment } from "@/lib/elfa/client";

/**
 * GET /api/markets/sentiment/[symbol] — Fetch social sentiment via Elfa AI.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const sentiment = await getSentiment(symbol.toUpperCase());
  return Response.json({ data: sentiment });
}
