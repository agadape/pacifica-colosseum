"use client";

export function LiveBadge() {
  return (
    <span className="badge-live">
      <span
        className="pulse-dot"
        style={{ width: 6, height: 6, background: "#fff", display: "inline-block" }}
      />
      LIVE
    </span>
  );
}