"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

interface HazardEvent {
  name: string;
  description: string;
  icon: string;
  category: string;
  severity: string;
}

interface ActiveHazard {
  id: string;
  hazard_id: string;
  round_number: number;
  warned_at: string;
  started_at: string | null;
  expires_at: string | null;
  status: "warning" | "active" | "expired";
  hazard_events: HazardEvent | null;
}

interface HazardBannerProps {
  arenaId: string;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  severe: {
    bg: "bg-red-950/90",
    border: "border-red-500",
    text: "text-red-100",
    badge: "bg-red-500 text-white",
  },
  moderate: {
    bg: "bg-orange-950/90",
    border: "border-orange-400",
    text: "text-orange-100",
    badge: "bg-orange-400 text-white",
  },
  minor: {
    bg: "bg-blue-950/90",
    border: "border-blue-400",
    text: "text-blue-100",
    badge: "bg-blue-400 text-white",
  },
};

const WARNING_STYLES = {
  bg: "bg-amber-950/90",
  border: "border-amber-400",
  text: "text-amber-100",
  badge: "bg-amber-400 text-black",
};

function useCountdown(targetIso: string | null): number {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!targetIso) return;

    const update = () => {
      const diff = Math.max(0, Math.round((new Date(targetIso).getTime() - Date.now()) / 1000));
      setSecondsLeft(diff);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  return secondsLeft;
}

function HazardItem({ hazard }: { hazard: ActiveHazard }) {
  const isWarning = hazard.status === "warning";
  const info = hazard.hazard_events;
  const severity = info?.severity ?? "moderate";

  // Warning countdown: time until started_at
  // Active countdown: time until expires_at
  const warningTarget = isWarning
    ? hazard.started_at ?? new Date(new Date(hazard.warned_at).getTime() + 10_000).toISOString()
    : null;
  const activeTarget = !isWarning ? hazard.expires_at : null;

  const warningSecondsLeft = useCountdown(warningTarget);
  const activeSecondsLeft = useCountdown(activeTarget);

  const styles = isWarning ? WARNING_STYLES : (SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.moderate);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex items-center gap-3 px-4 py-2.5 border-b ${styles.bg} ${styles.border} backdrop-blur-sm`}
    >
      <span className="text-xl flex-shrink-0">{info?.icon ?? "⚠️"}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isWarning ? (
            <span className={`text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${styles.badge}`}>
              ⚠ INCOMING — {warningSecondsLeft}s
            </span>
          ) : (
            <span className={`text-xs font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${styles.badge}`}>
              {severity.toUpperCase()} — ACTIVE
            </span>
          )}
          <span className={`text-sm font-semibold ${styles.text}`}>{info?.name ?? hazard.hazard_id}</span>
          {!isWarning && hazard.expires_at && activeSecondsLeft > 0 && (
            <span className={`text-xs ml-auto ${styles.text} opacity-70`}>{activeSecondsLeft}s remaining</span>
          )}
          {!isWarning && !hazard.expires_at && (
            <span className={`text-xs ml-auto ${styles.text} opacity-70`}>Rest of round</span>
          )}
        </div>
        <p className={`text-xs mt-0.5 ${styles.text} opacity-80 truncate`}>{info?.description}</p>
      </div>
    </motion.div>
  );
}

export function HazardBanner({ arenaId }: HazardBannerProps) {
  const { data } = useQuery({
    queryKey: ["hazards", arenaId],
    queryFn: async () => {
      const res = await fetch(`/api/arenas/${arenaId}/hazards/active`);
      if (!res.ok) return { data: [] as ActiveHazard[] };
      return res.json() as Promise<{ data: ActiveHazard[] }>;
    },
    refetchInterval: 3_000,
  });

  const hazards = (data?.data ?? []).filter(h => h.status !== "expired");

  if (hazards.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <AnimatePresence mode="sync">
        {hazards.map(h => (
          <HazardItem key={h.id} hazard={h} />
        ))}
      </AnimatePresence>
    </div>
  );
}
