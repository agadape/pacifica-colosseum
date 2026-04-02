"use client";

import { use, useState } from "react";
import { motion } from "framer-motion";
import { useArena, useCurrentUser } from "@/hooks/use-arena";
import { usePacificaWS } from "@/hooks/use-websocket";
import { useArenaRealtime } from "@/hooks/use-arena-realtime";
import RoundIndicator from "@/components/arena/RoundIndicator";
import Chart from "@/components/trading/Chart";
import OrderForm from "@/components/trading/OrderForm";
import PositionList from "@/components/trading/PositionList";
import OrderList from "@/components/trading/OrderList";
import AccountPanel from "@/components/trading/AccountPanel";

export default function TradePage({
  params,
}: {
  params: Promise<{ arenaId: string }>;
}) {
  const { arenaId } = use(params);
  const { data } = useArena(arenaId);
  const { data: userData } = useCurrentUser();
  const arena = data?.data;

  const currentUserId = userData?.data?.id;
  const myParticipant = currentUserId
    ? (arena?.participants ?? []).find(
        (p: Record<string, unknown>) => p.user_id === currentUserId
      ) as Record<string, unknown> | undefined
    : undefined;

  const STARTING = 1000;
  const myPnlPct = (myParticipant?.total_pnl_percent as number | undefined) ?? 0;
  const myEquity  = Math.round(STARTING * (1 + myPnlPct / 100) * 100) / 100;
  const myDrawdown = (myParticipant?.max_drawdown_hit as number | undefined) ?? 0;

  // Connect to WS prices + Supabase Realtime
  usePacificaWS();
  useArenaRealtime(arenaId);

  // Symbol selector — defaults to first allowed pair
  const rounds = arena?.rounds ?? [];
  const currentRound = rounds.find(
    (r: Record<string, unknown>) => r.round_number === arena?.current_round
  );
  const allowedPairs: string[] = currentRound?.allowed_pairs ?? ["BTC"];
  const [symbol, setSymbol] = useState(allowedPairs[0] ?? "BTC");

  if (!arena) {
    return (
      <main className="min-h-screen pt-24 px-6 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-20 px-4 md:px-6 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Round info bar */}
        {currentRound && (
          <div className="mb-4">
            <RoundIndicator
              roundName={currentRound.name}
              roundNumber={currentRound.round_number}
              maxLeverage={currentRound.max_leverage}
              maxDrawdown={currentRound.max_drawdown_percent}
              allowedPairs={currentRound.allowed_pairs}
              endsAt={currentRound.ends_at}
            />
          </div>
        )}

        {/* Symbol selector */}
        {allowedPairs.length > 1 && (
          <div className="flex gap-2 mb-4">
            {allowedPairs.map((pair: string) => (
              <button
                key={pair}
                onClick={() => setSymbol(pair)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  symbol === pair
                    ? "bg-accent-primary text-white"
                    : "bg-surface border border-border-light text-text-secondary hover:text-text-primary"
                }`}
              >
                {pair}
              </button>
            ))}
          </div>
        )}

        {/* Main grid: Chart + Order Form */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          <div className="lg:col-span-3">
            <Chart symbol={symbol} />
          </div>
          <div className="space-y-4">
            <OrderForm
              arenaId={arenaId}
              symbol={symbol}
              maxLeverage={currentRound?.max_leverage ?? 20}
            />
            <AccountPanel
              equity={myEquity}
              balance={myEquity}
              unrealizedPnl={myEquity - STARTING}
              drawdown={myDrawdown}
              maxDrawdown={currentRound?.max_drawdown_percent ?? 20}
              hasWideZone={(myParticipant?.has_wide_zone as boolean | undefined) ?? false}
              hasSecondLife={(myParticipant?.has_second_life as boolean | undefined) ?? false}
              secondLifeUsed={(myParticipant?.second_life_used as boolean | undefined) ?? false}
            />
          </div>
        </div>

        {/* Bottom: Positions + Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PositionList arenaId={arenaId} />
          <OrderList arenaId={arenaId} />
        </div>
      </div>
    </main>
  );
}
