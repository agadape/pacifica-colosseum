import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

/**
 * Encrypt a private key using AES-256-GCM.
 * Returns a base64 string: iv + ciphertext + authTag.
 */
export function encryptPrivateKey(
  privateKey: string,
  encryptionKey: string
): string {
  const key = Buffer.from(encryptionKey, "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(privateKey, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // iv (12) + encrypted (variable) + tag (16)
  const combined = Buffer.concat([iv, encrypted, tag]);
  return combined.toString("base64");
}

/**
 * Decrypt a private key from the base64 AES-256-GCM format.
 */
export function decryptPrivateKey(
  encryptedBase64: string,
  encryptionKey: string
): string {
  const key = Buffer.from(encryptionKey, "hex");
  const combined = Buffer.from(encryptedBase64, "base64");

  const iv = combined.subarray(0, IV_LENGTH);
  const tag = combined.subarray(combined.length - TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
