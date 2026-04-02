/**
 * POST /api/demo/reset-open-arena
 * Force-completes a zombie Open Arena stuck in registration and triggers a fresh one.
 * No auth required — demo only.
 */
export async function POST() {
  const engineUrl = process.env.ENGINE_INTERNAL_URL;
  if (!engineUrl) {
    return Response.json({ error: "ENGINE_INTERNAL_URL not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${engineUrl}/debug/demo/restart-trader`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json() as { ok?: boolean; error?: string };
    if (!res.ok || data.error) {
      return Response.json({ error: data.error ?? "Engine error" }, { status: 502 });
    }
    return Response.json({ data: { ok: true } });
  } catch (err) {
    return Response.json({ error: `Failed to reach engine: ${err}` }, { status: 502 });
  }
}
