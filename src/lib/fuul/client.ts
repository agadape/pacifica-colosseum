/**
 * Fuul client — referrals + sybil checking.
 * Stubbed until API key is obtained. All functions return safe defaults.
 */

const FUUL_API_KEY = process.env.FUUL_API_KEY;
const FUUL_ENABLED = !!FUUL_API_KEY;

/**
 * Check if a wallet is flagged as sybil.
 * Returns true if allowed (not flagged).
 */
export async function checkSybil(walletAddress: string): Promise<{ allowed: boolean; reason?: string }> {
  if (!FUUL_ENABLED) {
    return { allowed: true }; // Stub: allow all when no API key
  }

  try {
    // TODO: Replace with actual Fuul API call when key is available
    // const res = await fetch(`https://api.fuul.xyz/v1/sybil/check`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", "x-api-key": FUUL_API_KEY! },
    //   body: JSON.stringify({ wallet_address: walletAddress }),
    // });
    // const data = await res.json();
    // return { allowed: !data.flagged, reason: data.reason };
    return { allowed: true };
  } catch {
    return { allowed: true }; // Fail open — don't block users if Fuul is down
  }
}

/**
 * Track an event in Fuul for referral/reward attribution.
 */
export async function trackEvent(
  eventName: string,
  data: Record<string, unknown>
): Promise<void> {
  if (!FUUL_ENABLED) return; // Stub: no-op

  try {
    // TODO: Replace with actual Fuul API call
    // await fetch(`https://api.fuul.xyz/v1/events/track`, {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json", "x-api-key": FUUL_API_KEY! },
    //   body: JSON.stringify({ event: eventName, ...data }),
    // });
  } catch {
    // Silent fail — tracking is non-critical
  }
}

/**
 * Generate a referral link for a user.
 */
export function getReferralLink(referralCode: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://colosseum.pacifica.fi";
  return `${baseUrl}?ref=${referralCode}`;
}
