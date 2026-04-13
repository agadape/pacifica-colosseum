"use client";

import { useState } from "react";
import Link from "next/link";
import { ArenaCard } from "@/components/ui/ArenaCard";
import { motion } from "framer-motion";

type StatusFilter = "all" | "live" | "registration" | "ended";
type PresetFilter = "ALL" | "BLITZ" | "SPRINT" | "DAILY" | "WEEKLY";

const MOCK_ARENAS = [
  { id: "arena-1", name: "DEMO_ARENA", preset: "BLITZ" as const, status: "live" as const, currentRound: 2 as const, participants: 6, maxParticipants: 8, prize: "$500", timeDisplay: "02:41:08" },
  { id: "arena-2", name: "OPEN_ARENA", preset: "DAILY" as const, status: "live" as const, currentRound: 1 as const, participants: 12, maxParticipants: 20, prize: "$1,000", timeDisplay: "01:12:44" },
  { id: "arena-3", name: "WARZONE_ALPHA", preset: "SPRINT" as const, status: "live" as const, currentRound: 3 as const, participants: 4, maxParticipants: 8, prize: "$250", timeDisplay: "00:58:33" },
  { id: "arena-4", name: "NIGHT_OWL", preset: "WEEKLY" as const, status: "registration" as const, currentRound: 1 as const, participants: 3, maxParticipants: 16, prize: "$5,000", timeDisplay: "06:00:00" },
  { id: "arena-5", name: "SPEED_RUN", preset: "BLITZ" as const, status: "ended" as const, currentRound: 4 as const, participants: 8, maxParticipants: 8, prize: "$100", timeDisplay: "FINAL" },
  { id: "arena-6", name: "GRIND_DAILY", preset: "DAILY" as const, status: "live" as const, currentRound: 2 as const, participants: 9, maxParticipants: 16, prize: "$750", timeDisplay: "11:23:05" },
];

const PRESETS: Array<{ label: string; value: PresetFilter }> = [
  { label: "BLITZ", value: "BLITZ" },
  { label: "SPRINT", value: "SPRINT" },
  { label: "DAILY", value: "DAILY" },
  { label: "WEEKLY", value: "WEEKLY" },
];

const STATUS_FILTERS: Array<{ label: string; value: StatusFilter }> = [
  { label: "ALL", value: "all" },
  { label: "LIVE", value: "live" },
  { label: "REGISTRATION", value: "registration" },
  { label: "ENDED", value: "ended" },
];

export default function ArenasPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [presetFilter, setPresetFilter] = useState<PresetFilter>("ALL");
  const [createPreset, setCreatePreset] = useState<"BLITZ" | "SPRINT" | "DAILY" | "WEEKLY">("BLITZ");

  const liveCount = MOCK_ARENAS.filter((a) => a.status === "live").length;

  const filtered = MOCK_ARENAS.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (presetFilter !== "ALL" && a.preset !== presetFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--color-void)", fontFamily: "'Satoshi', system-ui, sans-serif" }}>
      <header
        className="sticky top-0 z-40"
        style={{ background: "#0D0D0D", borderBottom: "2px solid #fff" }}
      >
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-xs font-medium tracking-widest"
                style={{ color: "#555", fontFamily: "'JetBrains Mono', monospace" }}
              >
                ← BACK
              </Link>
              <div className="h-4 w-px" style={{ background: "#fff" }} />
              <h1
                className="text-lg font-bold tracking-tight"
                style={{ fontFamily: "'Clash Display', system-ui, sans-serif" }}
              >
                ARENAS
              </h1>
              {liveCount > 0 && (
                <span className="badge-live">
                  <span className="pulse-dot" style={{ width: 6, height: 6, background: "#fff", display: "inline-block" }} />
                  {liveCount} LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className="px-3 py-1.5 text-xs font-semibold tracking-wider transition-all"
                  style={{
                    background: statusFilter === f.value ? "#fff" : "transparent",
                    color: statusFilter === f.value ? "#000" : "#555",
                    border: "2px solid",
                    borderColor: statusFilter === f.value ? "#fff" : "#333",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <span className="section-label mr-2">PRESET</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPresetFilter("ALL")}
              className="px-4 py-2 text-xs font-semibold tracking-wider transition-all"
              style={{
                background: presetFilter === "ALL" ? "#fff" : "transparent",
                color: presetFilter === "ALL" ? "#000" : "#555",
                border: "2px solid",
                borderColor: presetFilter === "ALL" ? "#fff" : "#333",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              ALL
            </button>
            {PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPresetFilter(p.value)}
                className="px-4 py-2 text-xs font-semibold tracking-wider transition-all"
                style={{
                  background: presetFilter === p.value ? "#fff" : "transparent",
                  color: presetFilter === p.value ? "#000" : "#555",
                  border: "2px solid",
                  borderColor: presetFilter === p.value ? "#fff" : "#333",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="section-label mb-4">NO ARENAS FOUND</div>
            <p className="text-sm" style={{ color: "#555" }}>
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {filtered.map((arena) => (
              <ArenaCard key={arena.id} {...arena} />
            ))}
          </div>
        )}

        <div
          className="brut-card p-8"
          style={{ borderTop: "3px solid #FF0000" }}
        >
          <div className="flex items-start justify-between gap-8">
            <div>
              <div className="section-label mb-2" style={{ color: "#FF0000" }}>CREATE ARENA</div>
              <h2
                className="text-2xl font-bold mb-2"
                style={{ fontFamily: "'Clash Display', system-ui, sans-serif" }}
              >
                Host Your Own Battle
              </h2>
              <p className="text-sm" style={{ color: "#555", maxWidth: "360px" }}>
                Set the rules. Invite traders. The arena takes it from there.
              </p>
            </div>

            <div className="flex flex-col items-end gap-4">
              <div>
                <div className="section-label mb-3 text-right">PRESET</div>
                <div className="flex gap-2">
                  {(["BLITZ", "SPRINT", "DAILY", "WEEKLY"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setCreatePreset(p)}
                      className="px-3 py-2 text-xs font-bold transition-all"
                      style={{
                        background: createPreset === p ? "#FF0000" : "transparent",
                        color: createPreset === p ? "#fff" : "#555",
                        border: "2px solid",
                        borderColor: createPreset === p ? "#FF0000" : "#333",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button className="brut-btn" style={{ background: "#FF0000", borderColor: "#FF0000", color: "#fff" }}>
                CREATE ARENA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}