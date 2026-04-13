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
      className="text-center py-16 px-6"
    >
      <div className="text-5xl mb-5">⚠️</div>
      <h3 className="font-display text-xl font-bold text-text-primary mb-2">
        {title}
      </h3>
      <p className="text-sm text-text-tertiary mb-6 max-w-sm mx-auto leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2.5 rounded-full bg-accent-primary text-white text-sm font-semibold hover:bg-accent-hover transition-all hover:scale-105 focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2"
        >
          Try again
        </button>
      )}
    </motion.div>
  );
}