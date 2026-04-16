"use client";

interface SkeletonProps {
  className?: string;
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 ${className}`}
    >
      <div className="skeleton-shimmer h-5 w-2/3 bg-[var(--color-bg-tertiary)] rounded mb-3" />
      <div className="skeleton-shimmer h-3 w-1/3 bg-[var(--color-bg-tertiary)] rounded mb-4" />
      <div className="flex justify-between">
        <div className="skeleton-shimmer h-3 w-1/4 bg-[var(--color-bg-tertiary)] rounded" />
        <div className="skeleton-shimmer h-3 w-1/4 bg-[var(--color-bg-tertiary)] rounded" />
      </div>
    </div>
  );
}

export function SkeletonLine({ className = "" }: SkeletonProps) {
  return <div className={`skeleton-shimmer h-4 bg-[var(--color-bg-tertiary)] rounded ${className}`} />;
}

export function SkeletonBlock({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 ${className}`}
    >
      <div className="skeleton-shimmer h-4 w-1/2 bg-[var(--color-bg-tertiary)] rounded mb-4" />
      <div className="space-y-3">
        <div className="skeleton-shimmer h-3 bg-[var(--color-bg-tertiary)] rounded" />
        <div className="skeleton-shimmer h-3 bg-[var(--color-bg-tertiary)] rounded w-4/5" />
        <div className="skeleton-shimmer h-3 bg-[var(--color-bg-tertiary)] rounded w-3/5" />
      </div>
    </div>
  );
}
