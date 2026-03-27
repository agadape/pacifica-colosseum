import { PrivyClient } from "@privy-io/server-auth";

const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

export interface AuthUser {
  privyUserId: string;
  walletAddress: string | null;
}

/**
 * Verify the Privy JWT from the Authorization header.
 * Returns user info or null if invalid.
 */
export async function verifyAuth(request: Request): Promise<AuthUser | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const claims = await privy.verifyAuthToken(token);

    // Fetch full user to get wallet address
    const privyUser = await privy.getUser(claims.userId);
    const wallet = privyUser.linkedAccounts.find(
      (a) => a.type === "wallet"
    );

    return {
      privyUserId: claims.userId,
      walletAddress: wallet && "address" in wallet ? wallet.address : null,
    };
  } catch {
    return null;
  }
}

/**
 * Helper to return a 401 response.
 */
export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
