"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useArenas } from "@/hooks/use-arena";
import { useArenaStore } from "@/stores/arena-store";
import ArenaCard from "@/components/arena/ArenaCard";

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
  const { data, isLoading } = useArenas({
    status: filters.status ?? undefined,
    page: filters.page,
  });

  const arenas = data?.data ?? [];

  return (
    <main className="min-h-screen pt-24 px-6 md:px-10">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary mb-2">
              Compete
            </p>
            <h1 className="font-display text-4xl font-800 tracking-tight text-text-primary">
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
          className="flex items-center gap-2 mb-8"
        >
          {statusFilters.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatus(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                filters.status === f.value
                  ? "bg-accent-primary text-white"
                  : "bg-surface border border-border-light text-text-secondary hover:text-text-primary"
              }`}
            >
              {f.label}
            </button>
          ))}
        </motion.div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-36 rounded-2xl bg-surface border border-border-light animate-pulse"
              />
            ))}
          </div>
        ) : arenas.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-text-tertiary text-lg">No arenas found</p>
            <p className="text-text-tertiary text-sm mt-2">
              Create one to get started
            </p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
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
