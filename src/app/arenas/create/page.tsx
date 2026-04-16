"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useCreateArena } from "@/hooks/use-arena";

const presets = [
  { value: "blitz", label: "Blitz", desc: "5 min", color: "#FF3333", bg: "rgba(255,51,51,0.1)", border: "rgba(255,51,51,0.3)" },
  { value: "sprint", label: "Sprint", desc: "2 hours", color: "#00F0FF", bg: "rgba(0,240,255,0.1)", border: "rgba(0,240,255,0.3)" },
  { value: "daily", label: "Daily", desc: "24 hours", color: "#00FF88", bg: "rgba(0,255,136,0.1)", border: "rgba(0,255,136,0.3)" },
  { value: "weekly", label: "Weekly", desc: "7 days", color: "#FFD700", bg: "rgba(255,215,0,0.1)", border: "rgba(255,215,0,0.3)" },
];

export default function CreateArenaPage() {
  const router = useRouter();
  const createArena = useCreateArena();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [preset, setPreset] = useState("sprint");
  const [startsIn, setStartsIn] = useState(5);

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
    <main className="min-h-screen pt-24 px-4 md:px-6 pb-16">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p
            className="text-xs uppercase tracking-[0.3em] mb-2 font-semibold"
            style={{ color: "var(--color-neon-magenta)", fontFamily: "var(--font-display)" }}
          >
            New
          </p>
          <h1
            className="font-display text-4xl font-black tracking-tight mb-10"
            style={{ color: "var(--color-text-primary)" }}
          >
            Create Arena
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label
                className="block text-xs uppercase tracking-wider mb-2 font-semibold"
                style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}
              >
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
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-sans)",
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label
                className="block text-xs uppercase tracking-wider mb-2 font-semibold"
                style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}
              >
                Description
                <span className="ml-1 normal-case font-normal" style={{ color: "var(--color-text-tertiary)" }}>(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
                maxLength={200}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-sans)",
                }}
              />
            </div>

            {/* Preset */}
            <div>
              <label
                className="block text-xs uppercase tracking-wider mb-3 font-semibold"
                style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}
              >
                Preset
              </label>
              <div className="grid grid-cols-2 gap-3">
                {presets.map((p) => {
                  const isSelected = preset === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPreset(p.value)}
                      className="p-4 rounded-xl border-2 text-left transition-all"
                      style={{
                        background: isSelected ? p.bg : "var(--color-surface)",
                        borderColor: isSelected ? p.border : "var(--color-border)",
                        boxShadow: isSelected ? `0 0 20px ${p.color}30` : "none",
                      }}
                    >
                      <span
                        className="block text-sm font-bold"
                        style={{ color: isSelected ? p.color : "var(--color-text-secondary)", fontFamily: "var(--font-display)" }}
                      >
                        {p.label}
                      </span>
                      <span className="block text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
                        {p.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Start Time */}
            <div>
              <label
                className="block text-xs uppercase tracking-wider mb-2 font-semibold"
                style={{ color: "var(--color-text-tertiary)", fontFamily: "var(--font-display)" }}
              >
                Starts in
              </label>
              <select
                value={startsIn}
                onChange={(e) => setStartsIn(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl text-sm"
                style={{
                  background: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <option value={1}>1 minute</option>
                <option value={2}>2 minutes</option>
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={360}>6 hours</option>
                <option value={1440}>24 hours</option>
              </select>
              <p className="mt-2 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                Arena starts automatically at the scheduled time. Solo play supported —{" "}
                <span className="font-bold" style={{ color: "var(--color-neon-cyan)" }}>
                  no minimum
                </span>{" "}
                required.
              </p>
            </div>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 0 32px rgba(0,240,255,0.5)" }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={createArena.isPending || !name}
              className="w-full py-3.5 rounded-full text-sm font-bold text-black disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              style={{
                background: "linear-gradient(135deg, var(--color-neon-cyan), var(--color-neon-cyan-dim))",
                fontFamily: "var(--font-display)",
                boxShadow: "0 0 24px rgba(0,240,255,0.3)",
              }}
            >
              {createArena.isPending ? "Creating..." : "Create Arena"}
            </motion.button>

            {createArena.isError && (
              <p className="text-sm text-center" style={{ color: "var(--color-danger)" }}>
                Failed to create arena. Please try again.
              </p>
            )}
          </form>
        </motion.div>
      </div>
    </main>
  );
}
