"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

type ElementType = "anemo" | "cryo" | "pyro" | "electro" | "hydro" | "dendro" | "geo";

interface ElementalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  element: ElementType;
  rotation: number;
  rotationSpeed: number;
}

const ELEMENT_COLORS: Record<ElementType, { rgb: string; glow: string }> = {
  anemo:   { rgb: "128, 248, 226", glow: "rgba(128,248,226,0.6)" },
  cryo:    { rgb: "165, 231, 242", glow: "rgba(165,231,242,0.6)" },
  pyro:    { rgb: "255, 81, 54",   glow: "rgba(255,81,54,0.7)" },
  electro: { rgb: "213, 77, 255",  glow: "rgba(213,77,255,0.7)" },
  hydro:   { rgb: "60, 157, 255",  glow: "rgba(60,157,255,0.6)" },
  dendro:  { rgb: "139, 195, 74",  glow: "rgba(139,195,74,0.6)" },
  geo:     { rgb: "244, 195, 68",  glow: "rgba(244,195,68,0.6)" },
};

// ── Cosmic Orbs — midnight sky blue + coral ──────────────────────
function CosmicOrbs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* top-right: Pacifica sky blue */}
      <motion.div
        animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(77,191,255,0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      {/* bottom-left: deep midnight blue */}
      <motion.div
        animate={{ x: [0, -30, 25, 0], y: [0, 35, -15, 0], scale: [1, 0.95, 1.05, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-60 -left-60 w-[800px] h-[800px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(20,60,120,0.12) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
      {/* center-right: coral accent */}
      <motion.div
        animate={{ x: [0, 20, -15, 0], y: [0, -25, 30, 0], scale: [1, 1.05, 0.98, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/3 -right-20 w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,107,74,0.05) 0%, transparent 70%)",
          filter: "blur(35px)",
        }}
      />
      {/* lower-left: sky blue secondary */}
      <motion.div
        animate={{ x: [0, -15, 20, 0], y: [0, 20, -25, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-2/3 left-1/4 w-[400px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(77,191,255,0.04) 0%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />
      {/* top-left: deep cosmic purple-blue (from the sky photo) */}
      <motion.div
        animate={{ x: [0, 10, -8, 0], y: [0, -15, 12, 0], scale: [1, 1.08, 0.96, 1] }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-20 -left-20 w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(30,50,120,0.10) 0%, transparent 70%)",
          filter: "blur(45px)",
        }}
      />
    </div>
  );
}

// ── God Rays — sky blue light streaks ───────────────────────────
function GodRays() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute w-px"
          style={{
            left: `${15 + i * 18}%`,
            top: 0,
            height: "70%",
            background: "linear-gradient(180deg, rgba(77,191,255,0.07) 0%, transparent 100%)",
            animation: `god-ray ${8 + i * 3}s ease-in-out infinite`,
            animationDelay: `${i * 1.5}s`,
            transformOrigin: "top center",
          }}
        />
      ))}
    </div>
  );
}

// ── Depth Floor — dark navy fade ────────────────────────────────
function DepthFloor() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div
        className="absolute bottom-0 left-0 right-0 h-[20vh]"
        style={{
          background: "linear-gradient(0deg, rgba(3,8,16,0.95) 0%, rgba(3,8,16,0.4) 40%, transparent 100%)",
          maskImage: "linear-gradient(0deg, black 0%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(0deg, black 0%, transparent 100%)",
        }}
      />
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute bottom-0 rounded-full"
          style={{
            left: `${5 + i * 16}%`,
            width: `${120 + i * 20}px`,
            height: `${60 + i * 10}px`,
            background: "radial-gradient(ellipse, rgba(6,13,30,0.4) 0%, transparent 70%)",
            animation: `smoke-drift ${12 + i * 4}s ease-in-out infinite`,
            animationDelay: `${i * 2}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Star Dust — twinkling particles from the night sky ──────────
function StarDust() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; twinkle: number; twinkleSpeed: number;
      color: string;
    }> = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function init() {
      resize();
      particles.length = 0;
      const count = Math.floor((canvas!.width * canvas!.height) / 28000);
      // Star colors: pure white, cool blue-white, Pacifica sky blue, faint gold
      const starColors = [
        "228, 240, 255",  // star white (blue tint)
        "200, 225, 255",  // ice blue
        "77, 191, 255",   // Pacifica sky blue
        "150, 210, 255",  // light sky
        "232, 200, 122",  // star gold (rare)
      ];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          vx: (Math.random() - 0.5) * 0.06,
          vy: -(Math.random() * 0.08 + 0.01),
          size: Math.random() * 1.2 + 0.2,
          opacity: Math.random() * 0.18 + 0.02,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.025 + 0.005,
          color: starColors[Math.floor(Math.random() * starColors.length)],
        });
      }
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.twinkle += p.twinkleSpeed;
        const twinkleOpacity = p.opacity * (0.4 + 0.6 * Math.sin(p.twinkle));

        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${twinkleOpacity})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = `rgba(${p.color}, ${twinkleOpacity * 0.4})`;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{ mixBlendMode: "screen" }}
    />
  );
}

// ── Elemental Particles — game mechanic atmosphere ────────────────
function ElementalParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<ElementalParticle[]>([]);
  const animIdRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const elements: ElementType[] = ["anemo", "cryo", "pyro", "electro", "hydro", "dendro", "geo"];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function spawnParticle(): ElementalParticle {
      const element = elements[Math.floor(Math.random() * elements.length)];
      return {
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: element === "pyro" ? -(Math.random() * 0.4 + 0.1) : (Math.random() - 0.5) * 0.2,
        size: Math.random() * 2.5 + 0.5,
        opacity: Math.random() * 0.10 + 0.02,
        life: 0,
        maxLife: Math.random() * 400 + 200,
        element,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
      };
    }

    function init() {
      resize();
      particlesRef.current = [];
      const count = Math.floor((canvas!.width * canvas!.height) / 40000);
      for (let i = 0; i < count; i++) particlesRef.current.push(spawnParticle());
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const toRemove: number[] = [];

      particlesRef.current.forEach((p, idx) => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.opacity = Math.max(0, p.opacity - 0.00005);

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        if (p.life > p.maxLife || p.opacity <= 0) { toRemove.push(idx); return; }

        const { rgb, glow } = ELEMENT_COLORS[p.element];
        const fadeRatio = 1 - Math.abs(p.life / p.maxLife - 0.5) * 2;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.element === "cryo") {
          ctx.beginPath();
          ctx.moveTo(-p.size * 1.5, 0); ctx.lineTo(p.size * 1.5, 0);
          ctx.moveTo(0, -p.size * 1.5); ctx.lineTo(0, p.size * 1.5);
          ctx.strokeStyle = `rgba(${rgb}, ${p.opacity * fadeRatio})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        } else if (p.element === "pyro") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb}, ${p.opacity * fadeRatio * 1.5})`;
          ctx.shadowBlur = 8; ctx.shadowColor = glow;
          ctx.fill();
        } else if (p.element === "electro") {
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 2); ctx.lineTo(-p.size * 0.5, -p.size * 0.5);
          ctx.lineTo(p.size * 0.5, 0); ctx.lineTo(-p.size * 0.5, p.size * 0.5);
          ctx.lineTo(0, p.size * 2);
          ctx.strokeStyle = `rgba(${rgb}, ${p.opacity * fadeRatio})`;
          ctx.lineWidth = 0.7; ctx.stroke();
        } else if (p.element === "anemo") {
          ctx.ellipse(0, 0, p.size * 1.8, p.size * 0.7, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb}, ${p.opacity * fadeRatio * 0.8})`;
          ctx.fill();
        } else if (p.element === "dendro") {
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 1.5); ctx.lineTo(p.size, p.size); ctx.lineTo(-p.size, p.size);
          ctx.closePath();
          ctx.fillStyle = `rgba(${rgb}, ${p.opacity * fadeRatio})`;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb}, ${p.opacity * fadeRatio})`;
          ctx.shadowBlur = 6; ctx.shadowColor = glow;
          ctx.fill();
        }

        ctx.restore();
      });

      for (let i = toRemove.length - 1; i >= 0; i--) {
        particlesRef.current.splice(toRemove[i], 1);
        if (particlesRef.current.length < Math.floor((canvas.width * canvas.height) / 40000)) {
          particlesRef.current.push(spawnParticle());
        }
      }

      animIdRef.current = requestAnimationFrame(draw);
    }

    init(); draw();
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none opacity-35"
      style={{ mixBlendMode: "screen" }}
    />
  );
}

// ── Grid Overlay — sky blue grid ──────────────────────────────────
function GridOverlay() {
  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none opacity-[0.015]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(77, 191, 255, 1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(77, 191, 255, 1) 1px, transparent 1px)
        `,
        backgroundSize: "64px 64px",
      }}
    />
  );
}

// ── Scan Line — sky blue horizontal sweep ─────────────────────────
function ScanLine() {
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      <div
        className="absolute w-full h-px opacity-[0.025]"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(77,191,255,1), transparent)",
          top: "30%",
          animation: "scan-line 10s linear infinite",
        }}
      />
    </div>
  );
}

export default function BackgroundEffects() {
  return (
    <>
      <GridOverlay />
      <CosmicOrbs />
      <GodRays />
      <StarDust />
      <ElementalParticles />
      <DepthFloor />
      <ScanLine />
    </>
  );
}
