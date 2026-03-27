import { NextRequest } from "next/server";
import { verifyAuth, unauthorized } from "@/lib/auth/middleware";
import { findOrCreateUser } from "@/lib/auth/register";
import { createServerClient } from "@/lib/supabase/server";
import { ARENA_PUBLIC_COLUMNS } from "@/lib/utils/columns";
import { generateKeypair, publicKeyToString, secretKeyToString } from "@/lib/utils/keypair";
import { encryptPrivateKey } from "@/lib/utils/encryption";
import type { Database } from "@/lib/supabase/types";

type ArenaRow = Database["public"]["Tables"]["arenas"]["Row"];
type ParticipantInsert = Database["public"]["Tables"]["arena_participants"]["Insert"];

/**
 * POST /api/arenas/[arenaId]/join — Join an arena.
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
  const supabase = createServerClient();

  // Fetch arena
  const { data: arena } = await supabase
    .from("arenas")
    .select(ARENA_PUBLIC_COLUMNS)
    .eq("id", arenaId)
    .single() as { data: ArenaRow | null };

  if (!arena) {
    return Response.json({ error: "Arena not found" }, { status: 404 });
  }

  // Validate arena is in registration
  if (arena.status !== "registration") {
    return Response.json({ error: "Arena is not accepting participants" }, { status: 400 });
  }

  // Check registration deadline
  if (new Date() > new Date(arena.registration_deadline)) {
    return Response.json({ error: "Registration deadline has passed" }, { status: 400 });
  }

  // Check not already joined
  const { data: existing } = await supabase
    .from("arena_participants")
    .select("id")
    .eq("arena_id", arenaId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return Response.json({ error: "Already joined this arena" }, { status: 409 });
  }

  // Check not full
  const { count } = await supabase
    .from("arena_participants")
    .select("id", { count: "exact", head: true })
    .eq("arena_id", arenaId);

  if (count !== null && count >= arena.max_participants) {
    return Response.json({ error: "Arena is full" }, { status: 400 });
  }

  // Generate subaccount keypair
  const subKeypair = generateKeypair();
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    return Response.json({ error: "Server encryption key not configured" }, { status: 500 });
  }

  // Insert participant
  const participantData: ParticipantInsert = {
    arena_id: arenaId,
    user_id: user.id,
    subaccount_address: publicKeyToString(subKeypair.publicKey),
    subaccount_private_key_encrypted: encryptPrivateKey(
      secretKeyToString(subKeypair.secretKey),
      encryptionKey
    ),
    status: "registered",
  };

  const { data: participant, error } = await supabase
    .from("arena_participants")
    .insert(participantData)
    .select("id, arena_id, user_id, subaccount_address, status, joined_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return Response.json({ error: "Already joined this arena" }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: participant }, { status: 201 });
}
