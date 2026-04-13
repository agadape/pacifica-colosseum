"use client";

import { useEffect, useRef, useState } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  color: string;
}

const COLORS = ["#E57C03", "#D4AF37", "#F97316", "#FBBF24"];

function genParticle(): Particle {
  return {
    id: Math.random(),
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 1,
    speedX: (Math.random() - 0.5) * 0.04,
    speedY: -(Math.random() * 0.04 + 0.015),
    opacity: Math.random() * 0.4 + 0.1,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

export function FloatingParticles({ count = 20, className = "" }: { count?: number; className?: string }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    setParticles(Array.from({ length: count }, genParticle));
  }, [count]);

  useEffect(() => {
    if (particles.length === 0) return;

    function animate() {
      setParticles((prev) =>
        prev.map((p) => {
          const newX = p.x + p.speedX;
          const newY = p.y + p.speedY;
          if (newY < -3 || newX < -3 || newX > 103) {
            return genParticle();
          }
          return { ...p, x: newX, y: newY };
        })
      );
      frameRef.current = requestAnimationFrame(animate);
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [particles.length]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}
