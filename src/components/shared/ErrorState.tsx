"use client";

import { motion } from "framer-motion";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  title = "Something went wrong",
  message = "Please try again later.",
  onRetry,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20 px-6"
    >
      <div
        className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
        style={{
          background: "rgba(255,51,51,0.1)",
          border: "1px solid rgba(255,51,51,0.2)",
          boxShadow: "0 0 30px rgba(255,51,51,0.1)",
        }}
      >
        <svg className="w-10 h-10" style={{ color: "var(--color-danger)" }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h3 className="font-display text-xl font-bold text-[var(--color-text-primary)] mb-2 tracking-wide">
        {title}
      </h3>
      <p className="text-sm mb-8 max-w-sm mx-auto leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
        {message}
      </p>
      {onRetry && (
        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 0 24px rgba(0,240,255,0.5)" }}
          whileTap={{ scale: 0.97 }}
          onClick={onRetry}
          className="px-6 py-3 rounded-full text-sm font-bold tracking-wide shadow-[0_0_16px_rgba(0,240,255,0.3)] bg-gradient-to-r from-[var(--color-neon-cyan)] to-[var(--color-neon-cyan-dim)] text-black"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Try again
        </motion.button>
      )}
    </motion.div>
  );
}
