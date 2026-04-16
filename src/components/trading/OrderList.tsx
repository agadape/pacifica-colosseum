"use client";

import { motion } from "framer-motion";
import { useOpenOrders } from "@/hooks/use-positions";

interface OrderListProps {
  arenaId: string;
}

export default function OrderList({ arenaId }: OrderListProps) {
  const { data, isLoading } = useOpenOrders(arenaId);
  const trades = (data?.data ?? []) as Record<string, unknown>[];

  if (isLoading) {
    return (
      <div className="bg-surface rounded-2xl border border-border p-5">
        <h3 className="font-display text-sm font-bold text-text-primary mb-3">Trade History</h3>
        <div className="h-12 bg-bg-primary rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border p-5">
      <h3 className="font-display text-sm font-bold text-text-primary mb-4">Trade History</h3>

      {trades.length === 0 ? (
        <p className="text-sm text-text-tertiary py-4">No trades yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-tertiary border-b border-border">
                <th className="text-left py-2.5 font-medium">Symbol</th>
                <th className="text-left py-2.5 font-medium">Side</th>
                <th className="text-right py-2.5 font-medium">Size</th>
                <th className="text-right py-2.5 font-medium">Type</th>
                <th className="text-right py-2.5 font-medium">Time</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <motion.tr
                  key={trade.id as string}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border-b border-border last:border-0 hover:bg-bg-primary/50 transition-colors"
                >
                  <td className="py-2.5 font-mono font-semibold text-text-primary">
                    {trade.symbol as string}-PERP
                  </td>
                  <td className={`py-2.5 font-semibold ${trade.side === "buy" ? "text-neon-cyan drop-shadow-[0_0_4px_rgba(0,240,255,0.4)]" : "text-neon-magenta drop-shadow-[0_0_4px_rgba(255,0,110,0.4)]"}`}>
                    {trade.side === "buy" ? "Long" : "Short"}
                  </td>
                  <td className="py-2.5 text-right font-mono text-text-primary">
                    {(trade.size as number).toFixed(4)}
                  </td>
                  <td className="py-2.5 text-right text-text-secondary capitalize">
                    {trade.order_type as string}
                  </td>
                  <td className="py-2.5 text-right text-text-tertiary">
                    {new Date(trade.created_at as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}