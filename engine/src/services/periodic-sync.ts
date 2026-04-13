import type { Database } from "../../../src/lib/supabase/types";
import { PacificaClient } from "../../../src/lib/pacifica/client";
import { getSupabase } from "../db";
import { keypairFromBase58 } from "../../../src/lib/utils/keypair";
import { decryptPrivateKey } from "../../../src/lib/utils/encryption";
import { getArenaState } from "./risk-monitor";
import { getPriceManager } from "../state/price-manager";
import { calcEquity, calcDrawdownPercent } from "../state/types";

type SnapshotInsert = Database["public"]["Tables"]["equity_snapshots"]["Insert"];

const syncIntervals = new Map<string, ReturnType<typeof setInterval>>();

/**
 * Start periodic sync for an arena. Runs every 30 seconds.
 * - Fetches actual balance + positions from Pacifica REST (reconcile)
 * - Writes equity snapshots to DB
 */
export function startPeriodicSync(arenaId: string): void {
  if (syncIntervals.has(arenaId)) return;

  const interval = setInterval(() => {
    syncArena(arenaId).catch((err) =>
      console.error(`[PeriodicSync] Error syncing arena ${arenaId}:`, err)
    );
  }, 30_000);

  syncIntervals.set(arenaId, interval);
  console.log(`[PeriodicSync] Started for arena ${arenaId} (every 30s)`);
}

/**
 * Stop periodic sync for an arena.
 */
export function stopPeriodicSync(arenaId: string): void {
  const interval = syncIntervals.get(arenaId);
  if (interval) {
    clearInterval(interval);
    syncIntervals.delete(arenaId);
    console.log(`[PeriodicSync] Stopped for arena ${arenaId}`);
  }
}

async function syncArena(arenaId: string): Promise<void> {
  const state = getArenaState(arenaId);
  if (!state) return;

  const supabase = getSupabase();
  const encryptionKey = process.env.ENCRYPTION_KEY!;
  const priceManager = getPriceManager();
  const allPrices = priceManager.getAllPrices();
  const snapshots: SnapshotInsert[] = [];

  for (const [, trader] of state.traders) {
    if (trader.status !== "active") continue;

    // Reconcile balance AND positions with Pacifica REST
    try {
      const { data: participants } = await supabase
        .from("arena_participants")
        .select("subaccount_private_key_encrypted")
        .eq("id", trader.participantId)
        .single();

      if (participants?.subaccount_private_key_encrypted) {
        const subKeypair = keypairFromBase58(
          decryptPrivateKey(participants.subaccount_private_key_encrypted, encryptionKey)
        );
        const client = new PacificaClient({
          secretKey: subKeypair.secretKey,
          publicKey: subKeypair.publicKey,
          testnet: true,
        });

        // Sync balance
        const { data: accInfo } = await client.getAccountInfo() as {
          data: { balance?: string } | null;
        };
        if (accInfo?.balance) {
          const parsed = parseFloat(accInfo.balance);
          if (!isNaN(parsed) && parsed >= 0) {
            trader.balance = parsed;
          }
        }

        // Sync positions from Pacifica (replaces potentially stale in-memory state)
        const { data: positions } = await client.getPositions() as {
          data: Array<{ symbol: string; side: string; size: string; entry_price: string; leverage: number }> | null;
        };
        if (positions) {
          trader.positions.clear();
          for (const pos of positions) {
            // Pacifica uses "bid"/"ask" internally but we store "long"/"short"
            const longShort: "long" | "short" = pos.side === "bid" || pos.side === "buy" ? "long" : "short";
            trader.positions.set(pos.symbol, {
              symbol: pos.symbol,
              side: longShort,
              size: parseFloat(pos.size),
              entryPrice: parseFloat(pos.entry_price),
              leverage: pos.leverage,
            });
          }
        }
      }
    } catch {
      // Reconciliation failed — continue with cached state
    }

    // Calculate current equity from synced state
    const equity = calcEquity(trader, allPrices);
    const drawdown = calcDrawdownPercent(equity, trader.equityBaseline);

    trader.currentEquity = equity;
    trader.currentDrawdownPercent = drawdown;

    // Write snapshot
    snapshots.push({
      arena_id: arenaId,
      participant_id: trader.participantId,
      round_number: state.currentRound,
      equity,
      balance: trader.balance,
      unrealized_pnl: equity - trader.balance,
      drawdown_percent: drawdown,
    });
  }

  if (snapshots.length > 0) {
    await supabase.from("equity_snapshots").insert(snapshots);
  }
}
