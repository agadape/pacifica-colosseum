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
      className="text-center py-16"
    >
      <h3 className="font-display text-lg font-700 text-text-primary mb-1">
        {title}
      </h3>
      <p className="text-sm text-text-tertiary mb-4">{message}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref}>
          <span className="inline-block px-5 py-2 rounded-full bg-accent-primary text-white text-sm font-semibold hover:bg-accent-hover transition-colors">
            {actionLabel}
          </span>
        </Link>
      )}
    </motion.div>
  );
}
