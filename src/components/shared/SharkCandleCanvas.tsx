"use client";

import { useEffect, useRef, useState } from "react";

export interface SharkCandleCanvasProps {
  className?: string;
  /** Show the top-left stats panel (price + % change) */
  showStats?: boolean;
  /**
   * overlay mode: faster speed, thinner candles, no stats — designed for
   * low-opacity placement behind existing chart UI
   */
  overlayMode?: boolean;
  /** Simulated base price (default 45 000) */
  basePrice?: number;
  /** Overall opacity of the whole canvas container (CSS) */
  opacity?: number;
}

interface Candle {
  o: number; h: number; l: number; c: number; x: number;
}

export default function SharkCandleCanvas({
  className = "",
  showStats = false,
  overlayMode = false,
  basePrice = 45000,
  opacity = 1,
}: SharkCandleCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const sharkRef    = useRef<HTMLDivElement>(null);
  const animRef     = useRef<number>(0);

  // mutable sim state – never triggers re-renders
  const sim = useRef({
    sx: -320, sy: 0, ty: 0, time: 0, lastCx: -320,
    candles: [] as Candle[],
    cur: { o: basePrice, h: basePrice, l: basePrice, c: basePrice, x: -320 } as Candle,
  });

  const [priceDisplay, setPriceDisplay]   = useState(basePrice);
  const [changeDisplay, setChangeDisplay] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    const shark     = sharkRef.current;
    if (!container || !canvas || !shark) return;

    const ctx  = canvas.getContext("2d")!;
    const s    = sim.current;
    const CWIDTH    = overlayMode ? 9  : 13;
    const CINTERVAL = overlayMode ? 16 : 20;
    const SPEED     = overlayMode ? 2.8 : 2.0;
    const HALF_RANGE = 2400;

    // ── helpers ─────────────────────────────────────────────────────────────
    function posToPrice(y: number) {
      const { height: h } = canvas!;
      const pad   = h * 0.18;
      const range = h - pad * 2;
      return basePrice + (1 - (y - pad) / range) * HALF_RANGE * 2 - HALF_RANGE;
    }
    function priceToY(p: number) {
      const { height: h } = canvas!;
      const pad   = h * 0.18;
      const range = h - pad * 2;
      return h - (pad + ((p - basePrice + HALF_RANGE) / (HALF_RANGE * 2)) * range);
    }

    function resize() {
      canvas!.width  = container!.offsetWidth;
      canvas!.height = container!.offsetHeight;
      s.sy = canvas!.height / 2;
      s.ty = canvas!.height / 2;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // ── main loop ────────────────────────────────────────────────────────────
    function loop() {
      const { width: w, height: h } = canvas!;

      // advance shark position
      s.sx += SPEED;
      s.time += 0.025;

      if (s.sx > w + 340) {
        s.sx = -320; s.lastCx = -320; s.candles = [];
        const p = posToPrice(s.sy);
        s.cur = { o: p, h: p, l: p, c: p, x: -320 };
      }

      const wave = Math.sin(s.time) * h * 0.055;
      if (Math.random() > 0.987) s.ty = Math.random() * h * 0.6 + h * 0.2;
      s.sy += (s.ty + wave - s.sy) * 0.022;
      const angle = (s.ty + wave - s.sy) * 0.018;
      if (shark) shark.style.transform = `translate(${s.sx}px,${s.sy - 72}px) rotate(${angle * 2.2}deg)`;

      // update current candle
      const pNow = posToPrice(s.sy + 72);
      s.cur.c = pNow;
      if (pNow > s.cur.h) s.cur.h = pNow;
      if (pNow < s.cur.l) s.cur.l = pNow;

      if (s.sx - s.lastCx >= CINTERVAL) {
        s.candles.push({ ...s.cur });
        if (s.candles.length > 90) s.candles.shift();
        s.lastCx = s.sx;
        s.cur = { o: pNow, h: pNow, l: pNow, c: pNow, x: s.sx };
      }

      if (showStats) {
        setPriceDisplay(Math.round(pNow * 100) / 100);
        setChangeDisplay(Math.round((pNow - basePrice) / basePrice * 10000) / 100);
      }

      // ── draw ───────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, w, h);

      // subtle horizontal grid
      ctx.strokeStyle = "rgba(77,191,255,0.035)";
      ctx.lineWidth = 1;
      for (let i = 1; i < 8; i++) {
        ctx.beginPath(); ctx.moveTo(0, h / 8 * i); ctx.lineTo(w, h / 8 * i); ctx.stroke();
      }

      // candles
      [...s.candles, s.cur].forEach(c => {
        const bull = c.c >= c.o;
        const col  = bull ? "#4DBFFF" : "#FF6B4A";
        const oY   = priceToY(c.o), cY = priceToY(c.c);
        const hY   = priceToY(c.h), lY = priceToY(c.l);

        // wick
        ctx.strokeStyle = col; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(c.x, hY); ctx.lineTo(c.x, lY); ctx.stroke();

        // body
        if (bull) { ctx.shadowBlur = 8; ctx.shadowColor = col; }
        ctx.fillStyle = col;
        ctx.fillRect(c.x - CWIDTH / 2, Math.min(oY, cY), CWIDTH, Math.max(Math.abs(cY - oY), 2));
        ctx.shadowBlur = 0;
      });

      // dashed price line
      const curY = priceToY(s.cur.c);
      ctx.setLineDash([4, 5]);
      ctx.strokeStyle = "rgba(255,255,255,0.13)";
      ctx.beginPath(); ctx.moveTo(0, curY); ctx.lineTo(s.sx + 260, curY); ctx.stroke();
      ctx.setLineDash([]);

      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animRef.current); ro.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlayMode, showStats, basePrice]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ opacity }}
    >
      {/* candlestick canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* animated shark actor */}
      <div
        ref={sharkRef}
        className="absolute pointer-events-none"
        style={{
          width: "260px", height: "130px",
          left: 0, top: 0,
          filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.65))",
          willChange: "transform",
          zIndex: 10,
        }}
      >
        <svg
          viewBox="0 0 300 150"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full shark-swim-anim"
        >
          <defs>
            <linearGradient id="shcGrad" x1="0%" y1="0%" x2="15%" y2="100%">
              <stop offset="0%"  stopColor="#0f172a"/>
              <stop offset="22%" stopColor="#1e40af"/>
              <stop offset="52%" stopColor="#0ea5e9"/>
              <stop offset="74%" stopColor="#bae6fd"/>
              <stop offset="90%" stopColor="#ffffff"/>
            </linearGradient>
            <path id="shcStar"
              d="M0,-5 L1.5,-1.5 L5,-1.5 L2.5,1 L3.5,5 L0,3 L-3.5,5 L-2.5,1 L-5,-1.5 L-1.5,-1.5Z"
              fill="white" opacity="0.88"/>
          </defs>

          {/* ── white sticker outline ── */}
          <g stroke="white" strokeWidth="13" strokeLinejoin="round" fill="white">
            <path d="M210 80 L235 105 C225 95,215 85,200 80 Z"/>
            <g className="shark-tail-anim">
              <path d="M77 60 C50 40,25 20,5 5 C25 35,40 50,50 65 C40 75,30 90,20 110 C40 100,60 92,77 88 Z"/>
            </g>
            <path d="M265 52 C240 38,210 35,180 42 C175 43,170 44,165 45 C160 25,155 10,150 10 C145 25,140 40,135 48 C110 52,90 58,75 62 L75 88 C85 86,90 86,95 86 L100 100 L108 88 C125 90,135 90,145 88 C140 105,130 125,130 125 C145 115,160 100,170 90 C200 100,230 90,260 62 Q270 55,265 52Z"/>
          </g>

          {/* ── body colors ── */}
          <g stroke="#38bdf8" strokeWidth="1.5">
            <path d="M210 80 L235 105 C225 95,215 85,200 80 Z" fill="#1e3a8a"/>
            <g className="shark-tail-anim">
              <path d="M77 60 C50 40,25 20,5 5 C25 35,40 50,50 65 C40 75,30 90,20 110 C40 100,60 92,77 88 Z" fill="url(#shcGrad)"/>
              <use href="#shcStar" x="25" y="25" transform="scale(0.9)"/>
              <use href="#shcStar" x="52" y="60" transform="scale(0.6)"/>
              <use href="#shcStar" x="28" y="90" transform="scale(0.5)"/>
            </g>
            <path d="M265 52 C240 38,210 35,180 42 C175 43,170 44,165 45 C160 25,155 10,150 10 C145 25,140 40,135 48 C110 52,90 58,75 62 L75 88 C85 86,90 86,95 86 L100 100 L108 88 C125 90,135 90,145 88 C140 105,130 125,130 125 C145 115,160 100,170 90 C200 100,230 90,260 62 Q270 55,265 52Z" fill="url(#shcGrad)"/>
          </g>

          {/* ── details ── */}
          <path d="M145 88 C155 88,165 89,170 90" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
          <path d="M185 60 Q180 65,185 70" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M178 59 Q173 64,178 69" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M171 58 Q166 63,171 68" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>

          {/* eye */}
          <circle cx="215" cy="53" r="3.5" fill="#0b132b"/>
          <circle cx="214" cy="51.5" r="1.2" fill="#fff"/>
          {/* smile */}
          <path d="M225 72 Q240 65,258 70" fill="none" stroke="#0b132b" strokeWidth="2" strokeLinecap="round"/>
          {/* blush */}
          <ellipse cx="205" cy="60" rx="4" ry="2.5" fill="rgba(77,191,255,0.38)"/>

          {/* body stars */}
          <use href="#shcStar" x="180" y="48" transform="scale(1.1)"/>
          <use href="#shcStar" x="150" y="62" transform="scale(1.3)"/>
          <use href="#shcStar" x="115" y="55" transform="scale(0.9)"/>
          <use href="#shcStar" x="95"  y="68" transform="scale(1.0)"/>
          <use href="#shcStar" x="165" y="82" transform="scale(0.5)"/>
          <use href="#shcStar" x="195" y="62" transform="scale(0.7)"/>
          <use href="#shcStar" x="135" y="75" transform="scale(0.4)"/>

          {/* ambient floating stars */}
          <use href="#shcStar" x="250" y="20"  transform="scale(0.8)" fill="#0ea5e9" opacity="0.65"/>
          <use href="#shcStar" x="90"  y="25"  transform="scale(0.6)" fill="#38bdf8" opacity="0.65"/>
          <use href="#shcStar" x="40"  y="120" transform="scale(0.7)" fill="#bae6fd" opacity="0.65"/>
          <use href="#shcStar" x="220" y="130" transform="scale(0.5)" fill="#0ea5e9" opacity="0.6"/>
        </svg>
      </div>

      {/* ── stats panel ── */}
      {showStats && (
        <div
          className="absolute top-6 left-6 z-20 rounded-2xl border px-5 py-4"
          style={{
            minWidth: "200px",
            background: "rgba(3,8,16,0.84)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            borderColor: "rgba(77,191,255,0.18)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.55)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#4DBFFF] animate-pulse"/>
            <span
              className="text-[9px] font-bold tracking-[0.22em] uppercase"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-text-secondary)", opacity: 0.65 }}
            >
              Live Market
            </span>
          </div>
          <div
            className="text-[10px] font-medium mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-text-secondary)", opacity: 0.72 }}
          >
            SHARK INDEX
          </div>
          <div
            className="font-mono text-2xl font-bold tracking-tighter"
            style={{ color: "var(--color-text-primary)" }}
          >
            ${priceDisplay.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div
            className="text-sm font-bold font-mono mt-0.5"
            style={{
              color: changeDisplay >= 0 ? "#4DBFFF" : "#FF6B4A",
              textShadow: changeDisplay >= 0
                ? "0 0 10px rgba(77,191,255,0.45)"
                : "0 0 10px rgba(255,107,74,0.45)",
            }}
          >
            {changeDisplay >= 0 ? "+" : ""}{changeDisplay.toFixed(2)}%
          </div>
        </div>
      )}
    </div>
  );
}
