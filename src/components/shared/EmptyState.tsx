"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface EmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  title,
  message,
  actionLabel,
  actionHref,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20 px-6"
    >
      <div
        className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, rgba(0,240,255,0.1), rgba(255,0,110,0.1))",
          border: "1px solid rgba(0,240,255,0.2)",
          boxShadow: "0 0 30px rgba(0,240,255,0.1)",
        }}
      >
        <svg className="w-10 h-10 text-[var(--color-neon-cyan)] opacity-70" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h3 className="font-display text-xl font-bold text-[var(--color-text-primary)] mb-2 tracking-wide">
        {title}
      </h3>
      <p className="text-sm mb-8 max-w-sm mx-auto leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        {message}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <motion.span
            whileHover={{ scale: 1.05, boxShadow: "0 0 24px rgba(0,240,255,0.5)" }}
            whileTap={{ scale: 0.97 }}
            className="inline-block px-6 py-3 rounded-full text-sm font-bold tracking-wide shadow-[0_0_16px_rgba(0,240,255,0.3)] bg-gradient-to-r from-[var(--color-neon-cyan)] to-[var(--color-neon-cyan-dim)] text-black"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {actionLabel}
          </motion.span>
        </Link>
      )}
    </motion.div>
  );
}
