/**
 * Test 2.5/2.6/2.1: Encryption round-trip, keypair generation, signing.
 */
import { randomBytes } from "crypto";
import { encryptPrivateKey, decryptPrivateKey } from "../src/lib/utils/encryption";
import { generateKeypair, keypairFromBase58, publicKeyToString, secretKeyToString } from "../src/lib/utils/keypair";
import { signMessage, createHeader, sortKeys } from "../src/lib/pacifica/auth";

// --- Test 1: Keypair generation ---
console.log("=== Test: Keypair Generation ===");
const kp = generateKeypair();
const pubStr = publicKeyToString(kp.publicKey);
const secStr = secretKeyToString(kp.secretKey);
console.log(`  Public key:  ${pubStr}`);
console.log(`  Secret key:  ${secStr.slice(0, 20)}...`);

// Reconstruct from base58
const kp2 = keypairFromBase58(secStr);
const pubStr2 = publicKeyToString(kp2.publicKey);
console.log(`  Reconstructed: ${pubStr2}`);
console.log(`  Match: ${pubStr === pubStr2 ? "PASS" : "FAIL"}`);

// --- Test 2: Encryption round-trip ---
console.log("\n=== Test: Encryption Round-Trip ===");
const encKey = randomBytes(32).toString("hex");
const original = secStr;
const encrypted = encryptPrivateKey(original, encKey);
console.log(`  Encrypted: ${encrypted.slice(0, 40)}...`);
const decrypted = decryptPrivateKey(encrypted, encKey);
console.log(`  Decrypted matches original: ${decrypted === original ? "PASS" : "FAIL"}`);

// --- Test 3: Message signing ---
console.log("\n=== Test: Message Signing ===");
const header = createHeader("create_market_order");
const payload = { symbol: "BTC", side: "bid", amount: "0.1" };
const { message, signature } = signMessage(header, payload, kp.secretKey);
console.log(`  Message: ${message.slice(0, 80)}...`);
console.log(`  Signature: ${signature}`);
console.log(`  Sig length: ${signature.length} chars (expected ~88)`);

// --- Test 4: sortKeys ---
console.log("\n=== Test: sortKeys ===");
const unsorted = { z: 1, a: { c: 3, b: 2 }, m: [{ y: 1, x: 2 }] };
const sorted = sortKeys(unsorted);
const json = JSON.stringify(sorted);
console.log(`  Sorted: ${json}`);
const expected = '{"a":{"b":2,"c":3},"m":[{"x":2,"y":1}],"z":1}';
console.log(`  Expected: ${expected}`);
console.log(`  Match: ${json === expected ? "PASS" : "FAIL"}`);

console.log("\nAll crypto tests complete!");
