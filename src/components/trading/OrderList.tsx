"use client";

import { motion } from "framer-motion";
import { useOpenOrders } from "@/hooks/use-positions";
import { useCancelOrder } from "@/hooks/use-trading";

interface OrderListProps {
  arenaId: string;
}

export default function OrderList({ arenaId }: OrderListProps) {
  const { data, isLoading } = useOpenOrders(arenaId);
  const cancelOrder = useCancelOrder(arenaId);

  const orders = data?.data?.positions ?? []; // Account info contains orders

  if (isLoading) {
    return (
      <div className="bg-surface rounded-2xl border border-border-light p-5">
        <h3 className="font-display text-sm font-700 text-text-primary mb-3">Open Orders</h3>
        <div className="h-12 bg-bg-primary rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border-light p-5">
      <h3 className="font-display text-sm font-700 text-text-primary mb-3">Open Orders</h3>

      {!Array.isArray(orders) || orders.length === 0 ? (
        <p className="text-sm text-text-tertiary">No open orders</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-tertiary border-b border-border-light">
                <th className="text-left py-2 font-medium">Symbol</th>
                <th className="text-left py-2 font-medium">Type</th>
                <th className="text-left py-2 font-medium">Side</th>
                <th className="text-right py-2 font-medium">Size</th>
                <th className="text-right py-2 font-medium">Price</th>
                <th className="text-right py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: Record<string, unknown>, i: number) => (
                <motion.tr
                  key={`order-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-border-light last:border-0"
                >
                  <td className="py-2 font-mono font-semibold text-text-primary">
                    {order.symbol as string}
                  </td>
                  <td className="py-2 text-text-secondary">
                    {(order.type as string) ?? "limit"}
                  </td>
                  <td className={`py-2 font-semibold ${order.side === "bid" ? "text-success" : "text-danger"}`}>
                    {order.side === "bid" ? "Long" : "Short"}
                  </td>
                  <td className="py-2 text-right font-mono text-text-primary">
                    {order.amount as string}
                  </td>
                  <td className="py-2 text-right font-mono text-text-secondary">
                    {order.price as string}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() =>
                        cancelOrder.mutate({
                          orderId: String(order.order_id),
                          symbol: order.symbol as string,
                        })
                      }
                      className="text-text-tertiary hover:text-danger text-xs transition-colors"
                    >
                      Cancel
                    </button>
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
