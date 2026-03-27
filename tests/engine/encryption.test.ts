import { describe, it, expect } from "vitest";
import { randomBytes } from "crypto";
import { encryptPrivateKey, decryptPrivateKey } from "../../src/lib/utils/encryption";
import { generateKeypair, keypairFromBase58, publicKeyToString, secretKeyToString } from "../../src/lib/utils/keypair";
import { signMessage, createHeader, sortKeys } from "../../src/lib/pacifica/auth";

describe("encryption round-trip", () => {
  it("encrypts and decrypts a string", () => {
    const key = randomBytes(32).toString("hex");
    const original = "hello-secret-world";
    const encrypted = encryptPrivateKey(original, key);
    const decrypted = decryptPrivateKey(encrypted, key);
    expect(decrypted).toBe(original);
  });

  it("encrypted value is different from original", () => {
    const key = randomBytes(32).toString("hex");
    const original = "my-private-key";
    const encrypted = encryptPrivateKey(original, key);
    expect(encrypted).not.toBe(original);
  });

  it("different keys produce different ciphertexts", () => {
    const key1 = randomBytes(32).toString("hex");
    const key2 = randomBytes(32).toString("hex");
    const original = "same-input";
    const enc1 = encryptPrivateKey(original, key1);
    const enc2 = encryptPrivateKey(original, key2);
    expect(enc1).not.toBe(enc2);
  });

  it("wrong key fails to decrypt", () => {
    const key1 = randomBytes(32).toString("hex");
    const key2 = randomBytes(32).toString("hex");
    const encrypted = encryptPrivateKey("secret", key1);
    expect(() => decryptPrivateKey(encrypted, key2)).toThrow();
  });
});

describe("keypair operations", () => {
  it("generates valid keypair", () => {
    const kp = generateKeypair();
    expect(kp.publicKey).toBeInstanceOf(Uint8Array);
    expect(kp.secretKey).toBeInstanceOf(Uint8Array);
    expect(kp.publicKey.length).toBe(32);
    expect(kp.secretKey.length).toBe(64);
  });

  it("reconstructs from base58", () => {
    const kp = generateKeypair();
    const secretStr = secretKeyToString(kp.secretKey);
    const restored = keypairFromBase58(secretStr);
    expect(publicKeyToString(restored.publicKey)).toBe(publicKeyToString(kp.publicKey));
  });

  it("keypair survives encrypt/decrypt round-trip", () => {
    const encKey = randomBytes(32).toString("hex");
    const kp = generateKeypair();
    const encrypted = encryptPrivateKey(secretKeyToString(kp.secretKey), encKey);
    const decrypted = decryptPrivateKey(encrypted, encKey);
    const restored = keypairFromBase58(decrypted);
    expect(publicKeyToString(restored.publicKey)).toBe(publicKeyToString(kp.publicKey));
  });
});

describe("signing", () => {
  it("produces 88-char base58 signature", () => {
    const kp = generateKeypair();
    const header = createHeader("test");
    const { signature } = signMessage(header, { foo: "bar" }, kp.secretKey);
    expect(signature.length).toBe(88);
  });

  it("sortKeys sorts alphabetically and recursively", () => {
    const input = { z: 1, a: { c: 3, b: 2 }, m: [{ y: 1, x: 2 }] };
    const sorted = sortKeys(input);
    expect(JSON.stringify(sorted)).toBe('{"a":{"b":2,"c":3},"m":[{"x":2,"y":1}],"z":1}');
  });

  it("different payloads produce different signatures", () => {
    const kp = generateKeypair();
    const header = createHeader("test");
    const sig1 = signMessage(header, { a: 1 }, kp.secretKey).signature;
    const sig2 = signMessage(header, { a: 2 }, kp.secretKey).signature;
    expect(sig1).not.toBe(sig2);
  });
});
