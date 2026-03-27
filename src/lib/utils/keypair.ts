import nacl from "tweetnacl";
import bs58 from "bs58";

export interface KeypairResult {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

/**
 * Generate a new Ed25519 keypair.
 */
export function generateKeypair(): KeypairResult {
  const kp = nacl.sign.keyPair();
  return {
    publicKey: kp.publicKey,
    secretKey: kp.secretKey,
  };
}

/**
 * Reconstruct a keypair from a base58-encoded secret key.
 */
export function keypairFromBase58(secretKeyBase58: string): KeypairResult {
  const secretKey = bs58.decode(secretKeyBase58);
  const kp = nacl.sign.keyPair.fromSecretKey(secretKey);
  return {
    publicKey: kp.publicKey,
    secretKey: kp.secretKey,
  };
}

/**
 * Get the base58 public key string from a keypair.
 */
export function publicKeyToString(publicKey: Uint8Array): string {
  return bs58.encode(publicKey);
}

/**
 * Get the base58 secret key string from a keypair (for storage).
 */
export function secretKeyToString(secretKey: Uint8Array): string {
  return bs58.encode(secretKey);
}
