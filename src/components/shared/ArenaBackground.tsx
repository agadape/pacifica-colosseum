"use client";

import { motion } from "framer-motion";

/**
 * Arena-themed background effects for the hero section.
 * Combines: spotlight beams, ripple rings, grid floor, gradient atmosphere.
 * Inspired by Aceternity UI spotlight + ripple, themed for colosseum/arena.
 */
export default function ArenaBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base atmosphere — warm gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f0eef5] via-bg-primary to-bg-primary" />

      {/* Arena floor grid — perspective grid fading into distance */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 70%)",
        }}
      />

      {/* Spotlight beam — top left */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
        className="absolute -top-20 left-[20%] w-[500px] h-[600px]"
        style={{
          background: "conic-gradient(from 180deg at 50% 0%, transparent 40%, rgba(99,102,241,0.08) 50%, transparent 60%)",
        }}
      />

      {/* Spotlight beam — top right */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, delay: 0.8, ease: "easeOut" }}
        className="absolute -top-20 right-[20%] w-[500px] h-[600px]"
        style={{
          background: "conic-gradient(from 180deg at 50% 0%, transparent 40%, rgba(139,92,246,0.06) 50%, transparent 60%)",
        }}
      />

      {/* Center glow — arena center highlight */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.15, 0.2, 0.15],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(ellipse, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.05) 40%, transparent 70%)",
        }}
      />

      {/* Ripple rings — expanding circles from center (arena shockwave) */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.3, opacity: 0.3 }}
          animate={{ scale: [0.3, 1.2], opacity: [0.15, 0] }}
          transition={{
            duration: 4,
            delay: i * 1.3,
            repeat: Infinity,
            ease: "easeOut",
          }}
          className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border border-accent-primary/20"
        />
      ))}

      {/* Corner accents — arena boundary markers */}
      <div className="absolute top-20 left-8 w-16 h-16 border-l-2 border-t-2 border-accent-primary/[0.06] rounded-tl-lg" />
      <div className="absolute top-20 right-8 w-16 h-16 border-r-2 border-t-2 border-accent-primary/[0.06] rounded-tr-lg" />
      <div className="absolute bottom-32 left-8 w-16 h-16 border-l-2 border-b-2 border-accent-primary/[0.06] rounded-bl-lg" />
      <div className="absolute bottom-32 right-8 w-16 h-16 border-r-2 border-b-2 border-accent-primary/[0.06] rounded-br-lg" />

      {/* Noise texture for depth */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px",
        }}
      />
    </div>
  );
}
