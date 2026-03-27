import { createServerClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { USER_PUBLIC_COLUMNS } from "@/lib/utils/columns";
import type { AuthUser } from "./middleware";
import type { Database } from "@/lib/supabase/types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

function generateReferralCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function findOrCreateUser(authUser: AuthUser): Promise<UserRow | null> {
  const supabase = createServerClient();

  const { data: existing } = await supabase
    .from("users")
    .select(USER_PUBLIC_COLUMNS)
    .eq("privy_user_id", authUser.privyUserId)
    .single() as { data: UserRow | null };

  if (existing) {
    if (authUser.walletAddress && existing.wallet_address !== authUser.walletAddress) {
      await supabase
        .from("users")
        .update({
          wallet_address: authUser.walletAddress,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
    return existing;
  }

  const walletAddress = authUser.walletAddress ?? `privy:${authUser.privyUserId}`;
  const insertData: UserInsert = {
    wallet_address: walletAddress,
    privy_user_id: authUser.privyUserId,
    referral_code: generateReferralCode(),
  };

  const { data: newUser, error } = await supabase
    .from("users")
    .insert(insertData)
    .select(USER_PUBLIC_COLUMNS)
    .single() as { data: UserRow | null; error: { code: string; message: string } | null };

  if (error) {
    if (error.code === "23505" && error.message.includes("referral_code")) {
      const retryData: UserInsert = { ...insertData, referral_code: generateReferralCode() };
      const { data: retryUser } = await supabase
        .from("users")
        .insert(retryData)
        .select(USER_PUBLIC_COLUMNS)
        .single() as { data: UserRow | null };
      return retryUser;
    }
    throw error;
  }

  return newUser;
}
