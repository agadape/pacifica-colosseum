import nacl from "tweetnacl";
import bs58 from "bs58";

export interface SignatureHeader {
  type: string;
  timestamp: number;
  expiry_window: number;
}

export interface SignedMessage {
  message: string;
  signature: string;
}

/**
 * Recursively sort all object keys alphabetically.
 * Matches Python SDK's sort_json_keys behavior exactly.
 */
export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Compact JSON serialization — no spaces, matching Python's separators=(",", ":").
 */
export function compactJson(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Build and sign a message for Pacifica API authentication.
 * Mirrors Python SDK's sign_message(header, payload, keypair).
 *
 * @param header - Signature header with type, timestamp, expiry_window
 * @param payload - The request payload (data fields)
 * @param secretKey - Ed25519 secret key (64 bytes)
 * @returns The signed message string and base58-encoded signature
 */
export function signMessage(
  header: SignatureHeader,
  payload: Record<string, unknown>,
  secretKey: Uint8Array
): SignedMessage {
  const raw = {
    ...header,
    data: payload,
  };

  const sorted = sortKeys(raw);
  const message = compactJson(sorted);
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = nacl.sign.detached(messageBytes, secretKey);
  const signature = bs58.encode(signatureBytes);

  return { message, signature };
}

/**
 * Create a signature header with current timestamp.
 */
export function createHeader(
  type: string,
  expiryWindow: number = 5000
): SignatureHeader {
  return {
    type,
    timestamp: Date.now(),
    expiry_window: expiryWindow,
  };
}

/**
 * Build a full signed request body for Pacifica REST API.
 * Returns the flat object ready to POST as JSON.
 */
export function buildSignedRequest(
  type: string,
  payload: Record<string, unknown>,
  secretKey: Uint8Array,
  publicKey: Uint8Array,
  options?: { expiryWindow?: number; agentWallet?: string }
): Record<string, unknown> {
  const header = createHeader(type, options?.expiryWindow ?? 5000);
  const { signature } = signMessage(header, payload, secretKey);

  const request: Record<string, unknown> = {
    account: bs58.encode(publicKey),
    signature,
    timestamp: header.timestamp,
    expiry_window: header.expiry_window,
    ...payload,
  };

  if (options?.agentWallet) {
    request.agent_wallet = options.agentWallet;
  }

  return request;
}
