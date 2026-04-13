"use client";

import { useEffect, useRef, useState } from "react";

export function useScrollVelocity(threshold = 30) {
  const [velocity, setVelocity] = useState(0);
  const lastY = useRef(0);
  const lastTime = useRef(Date.now());
  const velocities = useRef<number[]>([]);

  useEffect(() => {
    const handleScroll = () => {
      const now = Date.now();
      const dt = now - lastTime.current;
      if (dt < 10) return;
      const dy = Math.abs(window.scrollY - lastY.current);
      const v = dy / dt * 1000; // px/sec
      velocities.current.push(v);
      if (velocities.current.length > 5) velocities.current.shift();
      const avg = velocities.current.reduce((a, b) => a + b, 0) / velocities.current.length;
      setVelocity(avg);
      lastY.current = window.scrollY;
      lastTime.current = now;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return velocity > threshold;
}

interface GlitchBar {
  id: number;
  top: number;
  width: number;
  duration: number;
  delay: number;
  color: string;
}

export function VelocityGlitchBars() {
  const [bars, setBars] = useState<GlitchBar[]>([]);
  const triggered = useRef(false);
  const timeoutRef = useRef<number>(0);

  useEffect(() => {
    const checkVelocity = () => {
      // We'll use a simple scroll position delta approach
      // This is called on scroll
    };
    window.addEventListener("scroll", checkVelocity, { passive: true });
    return () => window.removeEventListener("scroll", checkVelocity);
  }, []);

  const trigger = () => {
    if (triggered.current) return;
    triggered.current = true;
    const newBars: GlitchBar[] = Array.from({ length: 4 }, (_, i) => ({
      id: Date.now() + i,
      top: Math.random() * 100,
      width: Math.random() * 30 + 10,
      duration: Math.random() * 0.4 + 0.3,
      delay: i * 0.05,
      color: ["#E57C03", "#ff0040", "#00ffff", "#D4AF37"][i],
    }));
    setBars(newBars);
    timeoutRef.current = window.setTimeout(() => {
      setBars([]);
      triggered.current = false;
    }, 1000);
  };

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let lastTime = Date.now();

    const handleScroll = () => {
      const now = Date.now();
      const dt = now - lastTime;
      if (dt < 50) return;
      const dy = Math.abs(window.scrollY - lastScrollY);
      const v = dy / dt * 1000;
      if (v > 40) {
        trigger();
      }
      lastScrollY = window.scrollY;
      lastTime = now;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      {bars.map((bar) => (
        <div
          key={bar.id}
          className="glitch-bar"
          style={{
            top: `${bar.top}%`,
            width: `${bar.width}%`,
            background: `linear-gradient(90deg, transparent, ${bar.color}, transparent)`,
            animationDuration: `${bar.duration}s`,
            animationDelay: `${bar.delay}s`,
          }}
        />
      ))}
    </>
  );
}
