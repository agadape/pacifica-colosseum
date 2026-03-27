"use client";

interface SkeletonProps {
  className?: string;
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div className={`bg-surface rounded-2xl border border-border-light p-6 animate-pulse ${className}`}>
      <div className="h-5 w-2/3 bg-bg-tertiary rounded mb-3" />
      <div className="h-3 w-1/3 bg-bg-tertiary rounded mb-4" />
      <div className="flex justify-between">
        <div className="h-3 w-1/4 bg-bg-tertiary rounded" />
        <div className="h-3 w-1/4 bg-bg-tertiary rounded" />
      </div>
    </div>
  );
}

export function SkeletonLine({ className = "" }: SkeletonProps) {
  return <div className={`h-4 bg-bg-tertiary rounded animate-pulse ${className}`} />;
}

export function SkeletonBlock({ className = "" }: SkeletonProps) {
  return (
    <div className={`bg-surface rounded-2xl border border-border-light p-6 animate-pulse ${className}`}>
      <div className="h-4 w-1/2 bg-bg-tertiary rounded mb-4" />
      <div className="space-y-3">
        <div className="h-3 bg-bg-tertiary rounded" />
        <div className="h-3 bg-bg-tertiary rounded w-4/5" />
        <div className="h-3 bg-bg-tertiary rounded w-3/5" />
      </div>
    </div>
  );
}
