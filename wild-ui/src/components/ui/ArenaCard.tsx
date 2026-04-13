"use client";

import Link from "next/link";

interface ArenaCardProps {
  id: string;
  name: string;
  preset: "BLITZ" | "SPRINT" | "DAILY" | "WEEKLY";
  status: "registration" | "live" | "ended";
  currentRound?: 1 | 2 | 3 | 4;
  participants: number;
  maxParticipants: number;
  prize: string;
  timeDisplay: string;
}

const PRESET_COLORS: Record<string, string> = {
  BLITZ: "#FF0000",
  SPRINT: "#E57C03",
  DAILY: "#FFFFFF",
  WEEKLY: "#22C55E",
};

export function ArenaCard({
  id,
  name,
  preset,
  status,
  currentRound = 1,
  participants,
  maxParticipants,
  prize,
  timeDisplay,
}: ArenaCardProps) {
  const isLive = status === "live";
  const isEnded = status === "ended";
  const fillPct = (participants / maxParticipants) * 100;
  const accentColor = PRESET_COLORS[preset] || "#fff";

  return (
    <Link href={isLive ? `/arena/${id}` : isEnded ? "#" : `/arenas`}>
      <div
        style={{
          background: "#0D0D0D",
          opacity: isEnded ? 0.4 : 1,
          cursor: isEnded ? "default" : "pointer",
        }}
      >
        {/* Top accent bar */}
        {isLive && (
          <div style={{ height: "3px", background: accentColor }} />
        )}

        <div style={{ padding: "20px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
            <div>
              {/* Status badge */}
              <div style={{ marginBottom: "6px" }}>
                {isLive && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", fontWeight: 700, color: "#FF0000", letterSpacing: "0.2em", border: "1px solid #FF0000", padding: "2px 8px" }}>
                    <span style={{ width: "5px", height: "5px", background: "#FF0000", display: "inline-block" }} />
                    LIVE
                  </span>
                )}
                {isEnded && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", fontWeight: 600, color: "#555", letterSpacing: "0.15em", border: "1px solid rgba(255,255,255,0.1)", padding: "2px 8px" }}>
                    ENDED
                  </span>
                )}
                {status === "registration" && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", fontWeight: 700, color: "#22C55E", letterSpacing: "0.15em", border: "1px solid rgba(34,197,94,0.4)", padding: "2px 8px" }}>
                    REGISTERING
                  </span>
                )}
              </div>

              {/* Name */}
              <div style={{ fontFamily: "'Clash Display', system-ui", fontSize: "16px", fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                {name}
              </div>
            </div>

            {/* Right: Round + preset */}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#555", letterSpacing: "0.1em", marginBottom: "4px" }}>
                ROUND {currentRound}/4
              </div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "9px", fontWeight: 700, color: accentColor, letterSpacing: "0.15em" }}>
                {preset}
              </div>
            </div>
          </div>

          {/* Prize */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontFamily: "'Clash Display', system-ui", fontSize: "28px", fontWeight: 800, color: accentColor, lineHeight: 1 }}>
              {prize}
            </div>
          </div>

          {/* Participants */}
          <div style={{ marginBottom: "0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span className="section-label" style={{ fontSize: "9px" }}>PARTICIPANTS</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "#888" }}>
                {participants}/{maxParticipants}
              </span>
            </div>
            {/* Progress track */}
            <div style={{ height: "3px", background: "rgba(255,255,255,0.08)" }}>
              <div style={{ height: "100%", width: `${fillPct}%`, background: accentColor, transition: "width 0.3s" }} />
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "14px", paddingTop: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "10px", color: "#555", letterSpacing: "0.1em" }}>
              {isLive ? "ENDS IN" : isEnded ? "FINAL" : "STARTS IN"}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", fontWeight: 600, color: isLive ? accentColor : "#555" }}>
              {timeDisplay}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
