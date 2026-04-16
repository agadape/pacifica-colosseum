"use client";

import { motion } from "framer-motion";

export default function ArenaBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, var(--color-bg-secondary) 0%, var(--color-bg-primary) 50%, var(--color-bg-primary) 100%)",
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,240,255,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,240,255,1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 40%, black 20%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
        className="absolute -top-20 left-[20%] w-[500px] h-[600px]"
        style={{
          background: "conic-gradient(from 180deg at 50% 0%, transparent 40%, rgba(0,240,255,0.06) 50%, transparent 60%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, delay: 0.8, ease: "easeOut" }}
        className="absolute -top-20 right-[20%] w-[500px] h-[600px]"
        style={{
          background: "conic-gradient(from 180deg at 50% 0%, transparent 40%, rgba(255,0,110,0.04) 50%, transparent 60%)",
        }}
      />

      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          opacity: [0.15, 0.2, 0.15],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[30%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(ellipse, rgba(0,240,255,0.08) 0%, rgba(255,0,110,0.03) 40%, transparent 70%)",
        }}
      />

      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          initial={{ scale: 0.3, opacity: 0.2 }}
          animate={{ scale: [0.3, 1.2], opacity: [0.1, 0] }}
          transition={{
            duration: 4,
            delay: i * 1.3,
            repeat: Infinity,
            ease: "easeOut",
          }}
          className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full border"
          style={{ borderColor: "rgba(0,240,255,0.1)" }}
        />
      ))}

      <div
        className="absolute top-20 left-8 w-16 h-16 border-l-2 border-t-2 rounded-tl-lg"
        style={{ borderColor: "rgba(0,240,255,0.1)" }}
      />
      <div
        className="absolute top-20 right-8 w-16 h-16 border-r-2 border-t-2 rounded-tr-lg"
        style={{ borderColor: "rgba(0,240,255,0.1)" }}
      />
      <div
        className="absolute bottom-32 left-8 w-16 h-16 border-l-2 border-b-2 rounded-bl-lg"
        style={{ borderColor: "rgba(0,240,255,0.1)" }}
      />
      <div
        className="absolute bottom-32 right-8 w-16 h-16 border-r-2 border-b-2 rounded-br-lg"
        style={{ borderColor: "rgba(0,240,255,0.1)" }}
      />

      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px",
        }}
      />
    </div>
  );
}
