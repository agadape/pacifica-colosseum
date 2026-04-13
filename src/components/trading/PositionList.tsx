"use client";

import { motion } from "framer-motion";
import { usePositions } from "@/hooks/use-positions";
import { useWSStore } from "@/stores/ws-store";
import { useSubmitOrder } from "@/hooks/use-trading";

interface PositionListProps {
  arenaId: string;
}

export default function PositionList({ arenaId }: PositionListProps) {
  const { data, isLoading } = usePositions(arenaId);
  const { prices } = useWSStore();
  const closeOrder = useSubmitOrder(arenaId);

  const positions = data?.data ?? [];

  const handleClose = (pos: { symbol: string; side: string; size: string }) => {
    closeOrder.mutate({
      type: "market",
      symbol: pos.symbol,
      side: pos.side === "bid" ? "ask" : "bid",
      size: pos.size,
      reduce_only: true,
      slippage_percent: "5",
    });
  };

  const handleCloseAll = () => {
    if (!Array.isArray(positions)) return;
    for (const pos of positions as Record<string, unknown>[]) {
      handleClose({
        symbol: pos.symbol as string,
        side: pos.side as string,
        size: pos.size as string,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-5">
        <h3 className="font-display text-sm font-bold text-text-primary mb-3">Positions</h3>
        <div className="h-16 bg-bg-primary rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-bold text-text-primary">Positions</h3>
        {Array.isArray(positions) && positions.length > 0 && (
          <button
            onClick={handleCloseAll}
            className="text-xs text-text-secondary hover:text-danger transition-colors font-medium focus-visible:outline-none focus-visible:text-danger"
          >
            Close All
          </button>
        )}
      </div>

      {!Array.isArray(positions) || positions.length === 0 ? (
        <p className="text-sm text-text-tertiary py-4">No open positions</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-tertiary border-b border-border">
                <th className="text-left py-2.5 font-medium">Symbol</th>
                <th className="text-left py-2.5 font-medium">Side</th>
                <th className="text-right py-2.5 font-medium">Size</th>
                <th className="text-right py-2.5 font-medium">Entry</th>
                <th className="text-right py-2.5 font-medium">Mark</th>
                <th className="text-right py-2.5 font-medium">uPnL</th>
                <th className="text-right py-2.5 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos: Record<string, unknown>, i: number) => {
                const symbol = pos.symbol as string;
                const sideStr = pos.side as string;
                const entryPrice = parseFloat(pos.entry_price as string || "0");
                const size = parseFloat(pos.size as string || "0");
                const direction = sideStr === "bid" ? 1 : -1;
                const engineMark = parseFloat(pos.mark_price as string || "0");
                const wsMark = prices.get(symbol)?.markPrice;
                const markPrice = engineMark > 0 ? engineMark : wsMark;
                const unrealizedPnl = engineMark > 0
                  ? parseFloat(pos.unrealized_pnl as string || "0")
                  : (markPrice ? (markPrice - entryPrice) * size * direction : 0);

                return (
                  <motion.tr
                    key={`${symbol}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-b border-border last:border-0 hover:bg-bg-primary/50 transition-colors"
                  >
                    <td className="py-2.5 font-mono font-semibold text-text-primary">{symbol}</td>
                    <td className={`py-2.5 font-semibold ${sideStr === "bid" ? "text-success" : "text-danger"}`}>
                      {sideStr === "bid" ? "Long" : "Short"}
                    </td>
                    <td className="py-2.5 text-right font-mono text-text-primary">{size.toFixed(4)}</td>
                    <td className="py-2.5 text-right font-mono text-text-secondary">{entryPrice.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-mono text-text-primary">
                      {markPrice?.toFixed(2) ?? "—"}
                    </td>
                    <td className={`py-2.5 text-right font-mono font-semibold ${unrealizedPnl >= 0 ? "text-success" : "text-danger"}`}>
                      {unrealizedPnl >= 0 ? "+" : ""}{unrealizedPnl.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handleClose({ symbol, side: sideStr, size: pos.size as string })}
                        className="text-xs text-text-secondary hover:text-danger transition-colors font-medium focus-visible:outline-none"
                      >
                        Close
                      </button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}