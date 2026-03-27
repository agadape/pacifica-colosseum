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
      className="text-center py-16"
    >
      <div className="text-4xl mb-4">⚠</div>
      <h3 className="font-display text-lg font-700 text-text-primary mb-1">
        {title}
      </h3>
      <p className="text-sm text-text-tertiary mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 rounded-full bg-accent-primary text-white text-sm font-semibold hover:bg-accent-hover transition-colors"
        >
          Try again
        </button>
      )}
    </motion.div>
  );
}
