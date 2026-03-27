"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useArenas } from "@/hooks/use-arena";
import { useArenaStore } from "@/stores/arena-store";
import ArenaCard from "@/components/arena/ArenaCard";
import { SkeletonCard } from "@/components/shared/Skeleton";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";

const statusFilters = [
  { value: null, label: "All" },
  { value: "registration", label: "Open" },
  { value: "round_1", label: "Active" },
  { value: "completed", label: "Completed" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ArenasPage() {
  const { filters, setStatus } = useArenaStore();
  const { data, isLoading, isError, refetch } = useArenas({
    status: filters.status ?? undefined,
    page: filters.page,
  });

  const arenas = data?.data ?? [];

  return (
    <main className="min-h-screen pt-24 px-4 sm:px-6 md:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary mb-2">
              Compete
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-800 tracking-tight text-text-primary">
              Arenas
            </h1>
          </div>

          <Link href="/arenas/create">
            <motion.span
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="inline-block px-6 py-2.5 rounded-full bg-accent-primary text-white text-sm font-semibold hover:bg-accent-hover transition-colors"
            >
              Create Arena
            </motion.span>
          </Link>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 mb-8 overflow-x-auto pb-1"
        >
          {statusFilters.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatus(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                filters.status === f.value
                  ? "bg-accent-primary text-white"
                  : "bg-surface border border-border-light text-text-secondary hover:text-text-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        {/* Content */}
        {isError ? (
          <ErrorState
            title="Failed to load arenas"
            message="Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : arenas.length === 0 ? (
          <EmptyState
            title="No arenas found"
            message="Create one to get started"
            actionLabel="Create Arena"
            actionHref="/arenas/create"
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {arenas.map((arena: Record<string, unknown>) => (
              <motion.div key={arena.id as string} variants={fadeUp}>
                <ArenaCard arena={arena as ArenaCardArena} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </main>
  );
}

type ArenaCardArena = React.ComponentProps<typeof ArenaCard>["arena"];
