"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

/**
 * Floating gradient orbs — large blurred circles that slowly drift.
 */
function GradientOrbs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Indigo orb — top right */}
      <motion.div
        animate={{
          x: [0, 30, -20, 0],
          y: [0, -40, 20, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.07]"
        style={{
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
        }}
      />
      {/* Purple orb — bottom left */}
      <motion.div
        animate={{
          x: [0, -25, 15, 0],
          y: [0, 30, -25, 0],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.05]"
        style={{
          background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
        }}
      />
      {/* Gold orb — center right */}
      <motion.div
        animate={{
          x: [0, 20, -30, 0],
          y: [0, -20, 30, 0],
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute top-1/2 -right-20 w-[400px] h-[400px] rounded-full opacity-[0.04]"
        style={{
          background: "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

/**
 * Canvas particle system — subtle floating dots.
 */
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function init() {
      resize();
      particles = [];
      const count = Math.floor((canvas!.width * canvas!.height) / 25000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas!.width,
          y: Math.random() * canvas!.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.15 + 0.03,
        });
      }
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`;
        ctx.fill();
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
    />
  );
}

/**
 * Noise grain overlay — subtle texture.
 */
function GrainOverlay() {
  return (
    <div
      className="fixed inset-0 -z-5 pointer-events-none opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "128px 128px",
      }}
    />
  );
}

export default function BackgroundEffects() {
  return (
    <>
      <GradientOrbs />
      <Particles />
      <GrainOverlay />
    </>
  );
}
