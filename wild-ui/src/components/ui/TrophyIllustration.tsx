"use client";

export function TrophyIllustration({ size = 120 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Base */}
      <rect x="35" y="80" width="30" height="6" fill="#FFFFFF" />
      <rect x="30" y="72" width="40" height="10" fill="#FFFFFF" />
      <rect x="38" y="68" width="24" height="6" fill="#000" stroke="#FFFFFF" strokeWidth="2" />

      {/* Stem */}
      <rect x="44" y="56" width="12" height="14" fill="#FFFFFF" />

      {/* Cup */}
      <path d="M28 18 L72 18 L66 58 L34 58 Z" fill="#000" stroke="#FFFFFF" strokeWidth="2" />

      {/* Handles */}
      <path d="M28 22 C14 22 10 36 18 44 L30 44" fill="none" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M72 22 C86 22 90 36 82 44 L70 44" fill="none" stroke="#FFFFFF" strokeWidth="2" />

      {/* Star */}
      <polygon
        points="50,28 52.5,36 61,36 54,41.5 56.5,50 50,45 43.5,50 46,41.5 39,36 47.5,36"
        fill="#FF0000"
      />

      {/* Label */}
      <text x="50" y="54" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontFamily="JetBrains Mono, monospace" fontWeight="700">1ST</text>
    </svg>
  );
}
