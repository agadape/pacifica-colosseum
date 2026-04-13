"use client";

export function HeroArenaIllustration() {
  const targetTicks = [
    { x1: 485, y1: 320, x2: 495, y2: 320 },
    { x1: 460.2, y1: 460.2, x2: 467.1, y2: 467.1 },
    { x1: 400, y1: 405, x2: 400, y2: 415 },
    { x1: 339.8, y1: 460.2, x2: 332.9, y2: 467.1 },
    { x1: 315, y1: 320, x2: 305, y2: 320 },
    { x1: 339.8, y1: 179.8, x2: 332.9, y2: 172.9 },
    { x1: 400, y1: 235, x2: 400, y2: 225 },
    { x1: 460.2, y1: 179.8, x2: 467.1, y2: 172.9 },
  ];

  const angleMarks = [
    { x1: 130, y1: 446.1, x2: 118, y2: 453.9 },
    { x1: 265, y1: 553.9, x2: 268.3, y2: 566.5 },
    { x1: 465, y1: 563.5, x2: 468.3, y2: 576.1 },
    { x1: 600, y1: 446.1, x2: 608, y2: 453.9 },
    { x1: 670, y1: 320, x2: 682, y2: 320 },
    { x1: 600, y1: 193.9, x2: 608, y2: 186.1 },
  ];

  return (
    <svg
      viewBox="0 0 800 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      style={{ opacity: 0.25 }}
      aria-hidden="true"
    >
      <defs>
        <clipPath id="hexClip">
          <polygon points="400,30 740,165 740,475 400,580 60,475 60,165" />
        </clipPath>
      </defs>

      <polygon points="400,30 740,165 740,475 400,580 60,475 60,165" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      <polygon points="400,90 680,200 680,440 400,530 120,440 120,200" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="4 8" fill="none" />
      <polygon points="400,150 620,235 620,405 400,490 180,405 180,235" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
      <rect x="300" y="220" width="200" height="200" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      <rect x="320" y="240" width="160" height="160" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="4 4" fill="none" />
      <rect x="370" y="290" width="60" height="60" fill="#FF0000" />
      <line x1="60" y1="320" x2="740" y2="320" stroke="#FFFFFF" strokeWidth="1" />
      <line x1="400" y1="30" x2="400" y2="580" stroke="#FFFFFF" strokeWidth="1" />
      <line x1="120" y1="120" x2="680" y2="520" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="8 8" />
      <line x1="680" y1="120" x2="120" y2="520" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="8 8" />
      <circle cx="400" cy="320" r="280" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2 6" />
      <circle cx="400" cy="320" r="200" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="4 4" />
      <circle cx="400" cy="320" r="140" stroke="#FFFFFF" strokeWidth="1.5" strokeDasharray="8 4" />
      <circle cx="400" cy="320" r="90" stroke="#FF0000" strokeWidth="2" />

      {targetTicks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#FF0000" strokeWidth="3" />
      ))}

      {angleMarks.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#FFFFFF" strokeWidth="2" />
      ))}

      <line x1="100" y1="165" x2="100" y2="195" stroke="#FFFFFF" strokeWidth="2" />
      <line x1="700" y1="165" x2="700" y2="195" stroke="#FFFFFF" strokeWidth="2" />
      <line x1="100" y1="405" x2="100" y2="435" stroke="#FFFFFF" strokeWidth="2" />
      <line x1="700" y1="405" x2="700" y2="435" stroke="#FFFFFF" strokeWidth="2" />

      <text x="400" y="26" textAnchor="middle" fill="#555555" fontSize="8" fontFamily="JetBrains Mono, monospace" letterSpacing="3">OPEN FIELD</text>
      <text x="400" y="138" textAnchor="middle" fill="#555555" fontSize="8" fontFamily="JetBrains Mono, monospace" letterSpacing="3">THE STORM</text>
      <text x="400" y="198" textAnchor="middle" fill="#888888" fontSize="7" fontFamily="JetBrains Mono, monospace" letterSpacing="3">FINAL CIRCLE</text>
      <text x="400" y="422" textAnchor="middle" fill="#FF0000" fontSize="8" fontFamily="JetBrains Mono, monospace" letterSpacing="3">SUDDEN DEATH</text>

      <polyline points="60,165 60,145 80,145" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      <polyline points="740,165 740,145 720,145" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      <polyline points="60,475 60,495 80,495" stroke="#FFFFFF" strokeWidth="2" fill="none" />
      <polyline points="740,475 740,495 720,495" stroke="#FFFFFF" strokeWidth="2" fill="none" />

      <circle cx="400" cy="320" r="360" stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="1 8" opacity="0.3" />
    </svg>
  );
}