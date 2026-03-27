import { NextRequest } from "next/server";
import { verifyAuth, unauthorized } from "@/lib/auth/middleware";
import { findOrCreateUser } from "@/lib/auth/register";
import { createServerClient } from "@/lib/supabase/server";
import { USER_PUBLIC_COLUMNS } from "@/lib/utils/columns";
import type { Database } from "@/lib/supabase/types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type UserUpdate = Database["public"]["Tables"]["users"]["Update"];

/**
 * GET /api/users/me — Get current user profile + stats.
 */
export async function GET(request: NextRequest) {
  const authUser = await verifyAuth(request);
  if (!authUser) return unauthorized();

  const user = await findOrCreateUser(authUser);
  if (!user) {
    return Response.json({ error: "Failed to load user" }, { status: 500 });
  }

  return Response.json({ data: user });
}

/**
 * PATCH /api/users/me — Update username or avatar.
 */
export async function PATCH(request: NextRequest) {
  const authUser = await verifyAuth(request);
  if (!authUser) return unauthorized();

  const user = await findOrCreateUser(authUser);
  if (!user) {
    return Response.json({ error: "Failed to load user" }, { status: 500 });
  }

  const body = await request.json();
  const updates: UserUpdate = {};

  if (typeof body.username === "string" && body.username.trim()) {
    const username = body.username.trim();
    if (username.length < 3 || username.length > 20) {
      return Response.json(
        { error: "Username must be 3-20 characters" },
        { status: 400 }
      );
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return Response.json(
        { error: "Username can only contain letters, numbers, and underscores" },
        { status: 400 }
      );
    }
    updates.username = username;
  }

  if (typeof body.avatar_url === "string") {
    updates.avatar_url = body.avatar_url || null;
  }

  if (!updates.username && updates.avatar_url === undefined) {
    return Response.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  updates.updated_at = new Date().toISOString();

  const supabase = createServerClient();
  const { data: updated, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id)
    .select(USER_PUBLIC_COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505" && error.message.includes("username")) {
      return Response.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: updated });
}
