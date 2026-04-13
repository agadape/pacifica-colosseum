"use client";

import { useEffect, useRef } from "react";

interface Ember {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

const COLORS = ["#FF6B35", "#E57C03", "#F97316", "#EF4444", "#FBBF24"];

export function FireEmbers({ count = 25 }: { count?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const embersRef = useRef<Ember[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function create(): Ember {
      return {
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + 10,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(Math.random() * 1.8 + 0.8),
        size: Math.random() * 2.5 + 1,
        life: 0,
        maxLife: Math.random() * 100 + 60,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    }

    embersRef.current = Array.from({ length: count }, create);

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      embersRef.current.forEach((e) => {
        e.x += e.vx + Math.sin(e.life * 0.04) * 0.2;
        e.y += e.vy;
        e.vy *= 0.997;
        e.vx += (Math.random() - 0.5) * 0.03;
        e.life++;

        const progress = e.life / e.maxLife;
        const alpha = progress < 0.2 ? progress / 0.2 : progress > 0.8 ? (1 - (progress - 0.8) / 0.2) : 1;

        // Simple filled circle — fast
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.globalAlpha = alpha;
        ctx.fill();

        // Glow — single shadowBlur, not radial gradient
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.globalAlpha = alpha * 0.3;
        ctx.shadowColor = e.color;
        ctx.shadowBlur = e.size * 3;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        if (e.life >= e.maxLife || e.y < -20) {
          Object.assign(e, create());
        }
      });

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [count]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[5]" style={{ opacity: 0.65 }} />;
}
