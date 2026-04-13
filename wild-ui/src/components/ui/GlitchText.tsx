"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface GlitchTextProps {
  children: string;
  className?: string;
  style?: React.CSSProperties;
  triggerOnView?: boolean;
  active?: boolean;
}

const GLITCH_CHARS = "!@#$%^&*<>?/|\\[]{}";

function randomChar() {
  return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
}

export function GlitchText({ children, className = "", style, triggerOnView = false, active = false }: GlitchTextProps) {
  const [display, setDisplay] = useState(children);
  const [isGlitching, setIsGlitching] = useState(false);
  const intervalRef = useRef<number>(0);
  const ref = useRef<HTMLSpanElement>(null);

  const startGlitch = useCallback(() => {
    if (isGlitching) return;
    setIsGlitching(true);
    let iterations = 0;
    const max = children.length * 2;

    intervalRef.current = window.setInterval(() => {
      setDisplay(
        children
          .split("")
          .map((char, i) => {
            if (char === " ") return " ";
            if (i < iterations / 2) return children[i];
            return randomChar();
          })
          .join("")
      );
      iterations++;
      if (iterations >= max) {
        clearInterval(intervalRef.current);
        setDisplay(children);
        setIsGlitching(false);
      }
    }, 30);
  }, [children, isGlitching]);

  useEffect(() => {
    if (active) startGlitch();
    return () => clearInterval(intervalRef.current);
  }, [active, startGlitch]);

  useEffect(() => {
    if (!triggerOnView || active) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { startGlitch(); obs.disconnect(); } },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [triggerOnView, active, startGlitch]);

  return (
    <span
      ref={ref}
      className={`${className} ${isGlitching ? "glitch-text active" : "glitch-text"}`}
      data-text={children}
      style={style}
    >
      {display}
    </span>
  );
}
