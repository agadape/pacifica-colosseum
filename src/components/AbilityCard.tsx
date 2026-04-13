"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface Ability {
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  effect_type: string;
  requires_target: boolean;
}

interface AbilityCardProps {
  abilityId: string;
  ability: Ability;
  isUsed: boolean;
  acquiredInRound: number;
  arenaId: string;
  /** List of active participants for sabotage targeting */
  targets?: Array<{ participantId: string; username: string }>;
  /** Privy JWT for auth */
  token: string;
  onActivated?: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "border-gray-200 bg-gray-50",
  rare: "border-blue-200 bg-blue-50",
  epic: "border-purple-200 bg-purple-50",
  legendary: "border-amber-200 bg-amber-50",
};

const RARITY_BADGE: Record<string, string> = {
  common: "bg-gray-100 text-gray-600",
  rare: "bg-blue-100 text-blue-700",
  epic: "bg-purple-100 text-purple-700",
  legendary: "bg-amber-100 text-amber-700",
};

export function AbilityCard({
  abilityId,
  ability,
  isUsed,
  acquiredInRound,
  arenaId,
  targets = [],
  token,
  onActivated,
}: AbilityCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTargetPicker, setShowTargetPicker] = useState(false);

  const colorClass = RARITY_COLORS[ability.rarity] ?? RARITY_COLORS.common;
  const badgeClass = RARITY_BADGE[ability.rarity] ?? RARITY_BADGE.common;

  async function activate(targetParticipantId?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/arenas/${arenaId}/abilities/activate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ abilityId, targetParticipantId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Activation failed");
      } else {
        setShowTargetPicker(false);
        onActivated?.();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`relative rounded-xl border p-3 ${colorClass} ${isUsed ? "opacity-40" : ""}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-2xl leading-none">{ability.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">{ability.name}</span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${badgeClass}`}>
              {ability.rarity}
            </span>
            <span className="text-xs text-text-tertiary ml-auto">Rd {acquiredInRound}</span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5 leading-snug">{ability.description}</p>
        </div>
      </div>

      {!isUsed && (
        <div className="mt-2">
          {ability.requires_target && !showTargetPicker ? (
            <button
              onClick={() => setShowTargetPicker(true)}
              className="w-full text-xs font-medium py-1.5 px-3 rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors"
            >
              Select Target
            </button>
          ) : ability.requires_target && showTargetPicker ? (
            <div className="space-y-1">
              <p className="text-xs text-text-tertiary font-medium">Choose target:</p>
              {targets.length === 0 ? (
                <p className="text-xs text-text-tertiary">No targets available</p>
              ) : (
                targets.map(t => (
                  <button
                    key={t.participantId}
                    disabled={loading}
                    onClick={() => activate(t.participantId)}
                    className="w-full text-left text-xs py-1.5 px-2.5 rounded-lg bg-surface border border-border hover:bg-bg-primary transition-colors truncate"
                  >
                    {t.username}
                  </button>
                ))
              )}
              <button
                onClick={() => setShowTargetPicker(false)}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              disabled={loading}
              onClick={() => activate()}
              className="w-full text-xs font-medium py-1.5 px-3 rounded-lg bg-gray-900 text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Activating…" : "Activate"}
            </button>
          )}
          {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
        </div>
      )}

      {isUsed && (
        <div className="mt-2 text-center">
          <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Used</span>
        </div>
      )}
    </motion.div>
  );
}
