/**
 * Live trading test on Pacifica testnet.
 * Tests the full flow: account info, subaccount trading, positions.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { PacificaClient } from "../src/lib/pacifica/client";
import {
  keypairFromBase58,
  publicKeyToString,
  generateKeypair,
} from "../src/lib/utils/keypair";

async function main() {
  const sk = process.env.PACIFICA_MAIN_SECRET_KEY;
  if (!sk) {
    console.log("ERROR: PACIFICA_MAIN_SECRET_KEY not set");
    return;
  }

  const main = keypairFromBase58(sk);
  const mainClient = new PacificaClient({
    secretKey: main.secretKey,
    publicKey: main.publicKey,
    testnet: true,
  });

  console.log("=== Main Account ===");
  console.log("Address:", mainClient.accountAddress);

  // 1. Account info (fixed endpoint)
  console.log("\n--- Account Info ---");
  const info = await mainClient.getAccountInfo();
  if (info.data) {
    console.log("  Balance:", (info.data as Record<string, unknown>).balance);
    console.log("  Equity:", (info.data as Record<string, unknown>).account_equity);
    console.log("  Available:", (info.data as Record<string, unknown>).available_to_spend);
    console.log("  Positions:", (info.data as Record<string, unknown>).positions_count);
  } else {
    console.log("  Error:", info.error);
  }

  // 2. List subaccounts
  console.log("\n--- Subaccounts ---");
  const subs = await mainClient.listSubaccounts();
  console.log("  Result:", JSON.stringify(subs.data));

  // 3. Create a fresh subaccount for trading test
  console.log("\n--- Creating trading subaccount ---");
  const sub = generateKeypair();
  console.log("  Sub address:", publicKeyToString(sub.publicKey));
  const createRes = await mainClient.createSubaccount(sub.secretKey, sub.publicKey);
  console.log("  Create:", createRes.error ? `Error: ${createRes.error}` : "Success");

  // 4. Fund the subaccount
  console.log("\n--- Funding subaccount ($50) ---");
  const transferRes = await mainClient.transferFunds({
    to_account: publicKeyToString(sub.publicKey),
    amount: "50",
  });
  console.log("  Transfer:", transferRes.error ? `Error: ${JSON.stringify(transferRes.error)}` : "Success");

  // 5. Create a client for the subaccount
  const subClient = new PacificaClient({
    secretKey: sub.secretKey,
    publicKey: sub.publicKey,
    testnet: true,
  });

  // 6. Check subaccount balance
  console.log("\n--- Subaccount Info ---");
  const subInfo = await subClient.getAccountInfo();
  if (subInfo.data) {
    console.log("  Balance:", (subInfo.data as Record<string, unknown>).balance);
    console.log("  Equity:", (subInfo.data as Record<string, unknown>).account_equity);
    console.log("  Available:", (subInfo.data as Record<string, unknown>).available_to_spend);
  } else {
    console.log("  Error:", subInfo.error);
  }

  // 7. Set leverage on subaccount
  console.log("\n--- Setting leverage (10x BTC) ---");
  const levRes = await subClient.updateLeverage({ symbol: "BTC", leverage: 10 });
  console.log("  Result:", levRes.error ? `Error: ${JSON.stringify(levRes.error)}` : "Success");

  // 8. Place a small market order from subaccount
  console.log("\n--- Market order (BTC long, 0.0005) ---");
  const orderRes = await subClient.createMarketOrder({
    symbol: "BTC",
    side: "bid",
    amount: "0.0005",
    reduce_only: false,
    slippage_percent: "2",
  });
  if (orderRes.error) {
    console.log("  Error:", JSON.stringify(orderRes.error));
  } else {
    console.log("  Success:", JSON.stringify(orderRes.data));
  }

  // 9. Check positions
  console.log("\n--- Positions ---");
  const positions = await subClient.getPositions();
  console.log("  Result:", JSON.stringify(positions.data));

  // 10. If we have a position, close it
  if (positions.data && Array.isArray(positions.data) && positions.data.length > 0) {
    console.log("\n--- Closing position (market sell) ---");
    const closeRes = await subClient.createMarketOrder({
      symbol: "BTC",
      side: "ask",
      amount: "0.0005",
      reduce_only: true,
      slippage_percent: "2",
    });
    console.log("  Result:", closeRes.error ? `Error: ${JSON.stringify(closeRes.error)}` : "Success");
  }

  // 11. Transfer remaining funds back
  console.log("\n--- Return funds to main ---");
  const subInfoAfter = await subClient.getAccountInfo();
  const availableStr = subInfoAfter.data
    ? String((subInfoAfter.data as Record<string, unknown>).available_to_withdraw || "0")
    : "0";
  console.log("  Available to withdraw:", availableStr);

  if (parseFloat(availableStr) > 0) {
    const returnRes = await subClient.transferFunds({
      to_account: mainClient.accountAddress,
      amount: availableStr,
    });
    console.log("  Return:", returnRes.error ? `Error: ${JSON.stringify(returnRes.error)}` : "Success");
  }

  console.log("\n=== All tests complete ===");
}

main().catch(console.error);
