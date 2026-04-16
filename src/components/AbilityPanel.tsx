"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { motion, AnimatePresence } from "framer-motion";
import { AbilityCard } from "./AbilityCard";

interface AbilityEntry {
  ability_id: string;
  acquired_in_round: number;
  awarded_for: string;
  is_used: boolean;
  used_at: string | null;
  abilities: {
    name: string;
    description: string;
    icon: string;
    category: string;
    rarity: string;
    effect_type: string;
    requires_target: boolean;
  };
}

interface ActiveEffect {
  target_participant_id: string;
  applied_by_participant_id: string;
  effect_type: string;
  effect_value: number;
  applied_at: string;
  expires_at: string;
  abilities: { name: string; icon: string } | null;
}

interface AbilityPanelProps {
  arenaId: string;
  myParticipantId: string;
  /** Other active participants for sabotage targeting */
  targets?: Array<{ participantId: string; username: string }>;
}

const EFFECT_LABEL: Record<string, string> = {
  elimination_immunity: "Shield",
  drawdown_buffer: "+DD Buffer",
  target_leverage_reduction: "Sabotaged",
};

/** Wrapper that fetches the Privy token automatically for AbilityCard */
function AbilityCardWithToken(props: Omit<React.ComponentProps<typeof AbilityCard>, "token">) {
  const { getAccessToken } = usePrivy();
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    getAccessToken().then(t => setToken(t ?? ""));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!token) return null;
  return <AbilityCard {...props} token={token} />;
}

export function AbilityPanel({ arenaId, myParticipantId, targets = [] }: AbilityPanelProps) {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  const { data: abilitiesData, isLoading } = useQuery({
    queryKey: ["abilities", arenaId],
    queryFn: async () => {
      const token = await getAccessToken();
      const res = await fetch(`/api/arenas/${arenaId}/abilities`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { data: [] as AbilityEntry[] };
      return res.json() as Promise<{ data: AbilityEntry[] }>;
    },
    refetchInterval: 10_000,
  });

  const { data: effectsData } = useQuery({
    queryKey: ["ability-effects", arenaId],
    queryFn: async () => {
      const res = await fetch(`/api/arenas/${arenaId}/abilities/active-effects`);
      if (!res.ok) return { data: [] as ActiveEffect[] };
      return res.json() as Promise<{ data: ActiveEffect[] }>;
    },
    refetchInterval: 5_000,
  });

  const abilities = abilitiesData?.data ?? [];
  const effects = effectsData?.data ?? [];

  // Effects targeting me
  const myEffects = effects.filter(e => e.target_participant_id === myParticipantId);

  const unusedAbilities = abilities.filter(a => !a.is_used);
  const usedAbilities = abilities.filter(a => a.is_used);

  const onActivated = () => {
    queryClient.invalidateQueries({ queryKey: ["abilities", arenaId] });
    queryClient.invalidateQueries({ queryKey: ["ability-effects", arenaId] });
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="h-4 w-24 bg-bg-primary rounded animate-pulse mb-3" />
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-bg-primary rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (abilities.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-3">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest mb-1">Abilities</p>
        <p className="text-xs text-text-tertiary">No abilities yet — earn them at round end.</p>
        <p className="text-[11px] text-text-tertiary mt-1">
          Top PnL → Sabotage · Min DD → Fortress · Most Trades → Shield
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">Abilities</p>
        {unusedAbilities.length > 0 && (
          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-neon-gold/10 text-neon-gold border border-neon-gold/30">
            {unusedAbilities.length} ready
          </span>
        )}
      </div>

      {/* Active effects on me */}
      <AnimatePresence>
        {myEffects.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1"
          >
            {myEffects.map((effect, i) => {
              const expiresAt = new Date(effect.expires_at);
              const isExpiringSoon = expiresAt.getTime() - Date.now() < 15_000;
              const label = EFFECT_LABEL[effect.effect_type] ?? effect.effect_type;
              const isSabotage = effect.effect_type === "target_leverage_reduction";

              return (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-lg font-medium ${
                    isSabotage
                      ? "bg-neon-magenta/10 text-neon-magenta border border-neon-magenta/30"
                      : "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30"
                  } ${isExpiringSoon ? "animate-pulse" : ""}`}
                >
                  <span>{effect.abilities?.icon ?? "✨"}</span>
                  <span>{label} active</span>
                  <span className="ml-auto text-xs opacity-70">
                    until {expiresAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unused abilities */}
      {unusedAbilities.length > 0 && (
        <div className="space-y-2">
          {unusedAbilities.map(a => (
            <AbilityCardWithToken
              key={`${a.ability_id}-${a.acquired_in_round}`}
              abilityId={a.ability_id}
              ability={a.abilities}
              isUsed={false}
              acquiredInRound={a.acquired_in_round}
              arenaId={arenaId}
              targets={targets}
              onActivated={onActivated}
            />
          ))}
        </div>
      )}

      {/* Used abilities (greyed out) */}
      {usedAbilities.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-text-tertiary uppercase tracking-wider font-medium">Used</p>
          {usedAbilities.map(a => (
            <AbilityCardWithToken
              key={`${a.ability_id}-${a.acquired_in_round}-used`}
              abilityId={a.ability_id}
              ability={a.abilities}
              isUsed={true}
              acquiredInRound={a.acquired_in_round}
              arenaId={arenaId}
              targets={[]}
              onActivated={() => {}}
            />
          ))}
        </div>
      )}
    </div>
  );
}
