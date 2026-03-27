"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCreateArena } from "@/hooks/use-arena";

const presets = [
  { value: "blitz", label: "Blitz", desc: "5 min", color: "border-danger text-danger" },
  { value: "sprint", label: "Sprint", desc: "2 hours", color: "border-accent-primary text-accent-primary" },
  { value: "daily", label: "Daily", desc: "24 hours", color: "border-success text-success" },
  { value: "weekly", label: "Weekly", desc: "7 days", color: "border-accent-gold text-accent-gold" },
];

export default function CreateArenaPage() {
  const router = useRouter();
  const createArena = useCreateArena();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [preset, setPreset] = useState("sprint");
  const [startsIn, setStartsIn] = useState(60); // minutes from now

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startsAt = new Date(Date.now() + startsIn * 60 * 1000).toISOString();

    const result = await createArena.mutateAsync({
      name,
      description: description || undefined,
      preset,
      starts_at: startsAt,
    });

    if (result.data?.id) {
      router.push(`/arenas/${result.data.id}`);
    }
  };

  return (
    <main className="min-h-screen pt-24 px-6 md:px-10">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-text-tertiary mb-2">
            New
          </p>
          <h1 className="font-display text-4xl font-800 tracking-tight text-text-primary mb-10">
            Create Arena
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-tertiary mb-2">
                Arena Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Thunder Dome"
                required
                minLength={3}
                maxLength={50}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border-light text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-tertiary mb-2">
                Description
                <span className="text-text-tertiary ml-1">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
                maxLength={200}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border-light text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
              />
            </div>

            {/* Preset */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-tertiary mb-3">
                Preset
              </label>
              <div className="grid grid-cols-2 gap-3">
                {presets.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPreset(p.value)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      preset === p.value
                        ? `${p.color} bg-surface`
                        : "border-border-light text-text-secondary hover:border-border"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{p.label}</span>
                    <span className="block text-xs text-text-tertiary mt-0.5">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-tertiary mb-2">
                Starts in
              </label>
              <select
                value={startsIn}
                onChange={(e) => setStartsIn(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-surface border border-border-light text-text-primary focus:outline-none focus:border-accent-primary transition-colors"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={360}>6 hours</option>
                <option value={1440}>24 hours</option>
              </select>
            </div>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={createArena.isPending || !name}
              className="w-full py-3.5 rounded-full bg-accent-primary text-white font-semibold text-sm hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createArena.isPending ? "Creating..." : "Create Arena"}
            </motion.button>

            {createArena.isError && (
              <p className="text-sm text-danger text-center">
                Failed to create arena. Please try again.
              </p>
            )}
          </form>
        </motion.div>
      </div>
    </main>
  );
}
