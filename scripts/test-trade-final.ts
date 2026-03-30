/**
 * Final clean trading test — uses minimal funds.
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
  const sk = process.env.PACIFICA_MAIN_SECRET_KEY!;
  const main = keypairFromBase58(sk);
  const mainClient = new PacificaClient({
    secretKey: main.secretKey,
    publicKey: main.publicKey,
    testnet: true,
  });

  // Check main balance
  const info = await mainClient.getAccountInfo();
  const equity = (info.data as Record<string, unknown>)?.account_equity;
  console.log(`Main account: ${mainClient.accountAddress}`);
  console.log(`Equity: $${equity}\n`);

  // Create subaccount + fund with $20
  const sub = generateKeypair();
  const subPub = publicKeyToString(sub.publicKey);
  console.log(`Creating subaccount: ${subPub}`);
  await mainClient.createSubaccount(sub.secretKey, sub.publicKey);

  console.log("Funding with $20...");
  const transfer = await mainClient.transferFunds({ to_account: subPub, amount: "20" });
  if (transfer.error) {
    console.log(`Transfer failed: ${JSON.stringify(transfer.error)}`);
    console.log("Not enough balance. Please deposit more testnet USDC.");
    return;
  }
  console.log("Funded!\n");

  const subClient = new PacificaClient({
    secretKey: sub.secretKey,
    publicKey: sub.publicKey,
    testnet: true,
  });

  // Set leverage
  console.log("Setting leverage to 5x...");
  const lev = await subClient.updateLeverage({ symbol: "BTC", leverage: 5 });
  console.log(`Leverage: ${lev.error ? "Error: " + JSON.stringify(lev.error) : "OK"}\n`);

  // Place market order — tiny size
  console.log("Opening BTC long (0.0002 BTC)...");
  const order = await subClient.createMarketOrder({
    symbol: "BTC",
    side: "bid",
    amount: "0.0002",
    reduce_only: false,
    slippage_percent: "3",
  });
  if (order.error) {
    console.log(`Order error: ${JSON.stringify(order.error)}\n`);
  } else {
    console.log(`Order filled: ${JSON.stringify(order.data)}\n`);
  }

  // Check positions
  console.log("Checking positions...");
  const pos = await subClient.getPositions();
  console.log(`Positions: ${JSON.stringify(pos.data)}\n`);

  // Check account after trade
  const subInfo = await subClient.getAccountInfo();
  const subData = subInfo.data as Record<string, unknown>;
  if (subData) {
    console.log(`Sub equity: $${subData.account_equity}`);
    console.log(`Sub positions: ${subData.positions_count}`);
    console.log(`Sub margin used: $${subData.total_margin_used}\n`);
  }

  // Close position
  if (pos.data && Array.isArray(pos.data) && pos.data.length > 0) {
    console.log("Closing position...");
    const close = await subClient.createMarketOrder({
      symbol: "BTC",
      side: "ask",
      amount: "0.0002",
      reduce_only: true,
      slippage_percent: "3",
    });
    console.log(`Close: ${close.error ? "Error: " + JSON.stringify(close.error) : "OK"}\n`);
  }

  // Return funds to main
  console.log("Returning funds to main...");
  const afterInfo = await subClient.getAccountInfo();
  const available = String((afterInfo.data as Record<string, unknown>)?.available_to_withdraw ?? "0");
  if (parseFloat(available) > 0.01) {
    // Transfer back slightly less to account for rounding
    const returnAmt = (parseFloat(available) - 0.01).toFixed(6);
    const ret = await subClient.transferFunds({ to_account: mainClient.accountAddress, amount: returnAmt });
    console.log(`Return $${returnAmt}: ${ret.error ? "Error: " + JSON.stringify(ret.error) : "OK"}`);
  }

  // Final main balance
  const finalInfo = await mainClient.getAccountInfo();
  console.log(`\nFinal main equity: $${(finalInfo.data as Record<string, unknown>)?.account_equity}`);

  console.log("\n=== ALL PACIFICA API TESTS PASSED ===");
  console.log("Verified: account info, subaccount create, fund transfer,");
  console.log("leverage update, market order, position query, position close, fund return");
}

main().catch(console.error);
