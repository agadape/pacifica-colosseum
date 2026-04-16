"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import ConnectButton from "./ConnectButton";

const navLinks = [
  { href: "/arenas", label: "Arenas" },
  { href: "/leaderboard", label: "Leaderboard" },
];

function CrownArch() {
  return (
    <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none select-none">
      <svg
        width="80"
        height="32"
        viewBox="0 0 80 32"
        fill="none"
        className="opacity-40"
      >
        <path
          d="M40 28 C20 28 10 12 2 6 L6 2 C12 8 18 16 40 16 C62 16 68 8 74 2 L78 6 C70 12 60 28 40 28Z"
          stroke="url(#crownGrad)"
          strokeWidth="1.5"
          fill="none"
        />
        <circle cx="40" cy="8" r="2" fill="#4DBFFF" />
        <circle cx="28" cy="12" r="1.2" fill="#4DBFFF" />
        <circle cx="52" cy="12" r="1.2" fill="#4DBFFF" />
        <circle cx="16" cy="18" r="1" fill="#2A9FE8" />
        <circle cx="64" cy="18" r="1" fill="#2A9FE8" />
        <defs>
          <linearGradient id="crownGrad" x1="2" y1="2" x2="78" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4DBFFF" />
            <stop offset="0.5" stopColor="#2A9FE8" />
            <stop offset="1" stopColor="#4DBFFF" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="relative mx-4 mt-3">
        <div
          className="relative glass-surface rounded-2xl border overflow-hidden"
          style={{
            borderColor: "rgba(77, 191, 255, 0.2)",
            boxShadow: "0 0 0 1px rgba(77,191,255,0.06), 0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(77,191,255,0.08)",
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(77,191,255,0.04) 0%, transparent 50%)",
            }}
          />

          <div className="relative flex items-center justify-between px-6 h-14">
            <Link href="/" className="cursor-target flex items-center gap-3 group flex-shrink-0">
              <div className="relative">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #4DBFFF 0%, #2A9FE8 100%)",
                    boxShadow: "0 0 16px rgba(77,191,255,0.4)",
                  }}
                >
                  <span
                    className="text-black font-bold text-sm tracking-wider"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    C
                  </span>
                </div>
                <div
                  className="absolute inset-0 rounded-lg opacity-30 blur-md"
                  style={{ background: "rgba(77,191,255,0.5)" }}
                />
              </div>
              <div className="flex flex-col leading-none">
                <span
                  className="text-sm font-bold tracking-[0.2em] text-[var(--color-sky-primary)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  PACIFICA
                </span>
                <span
                  className="text-[9px] tracking-[0.3em] text-[var(--color-sky-primary-dim)] mt-0.5"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  COLOSSEUM
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-8">
              <div className="hidden md:flex items-center gap-8">
                {navLinks.map((link) => {
                  const isActive = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`cursor-target relative text-sm font-semibold tracking-wide transition-all duration-200 ${
                        isActive
                          ? "text-[var(--color-sky-primary)]"
                          : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                      style={isActive ? { fontFamily: "var(--font-display)" } : {}}
                    >
                      {link.label}
                      {isActive && (
                        <motion.div
                          layoutId="nav-indicator"
                          className="absolute -bottom-1 left-0 right-0 h-px rounded-full"
                          style={{
                            background: "linear-gradient(90deg, transparent, var(--color-sky-primary), transparent)",
                            boxShadow: "0 0 8px rgba(77,191,255,0.5)",
                          }}
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
              <ConnectButton />
            </div>
          </div>

          <div
            className="absolute bottom-0 left-0 right-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(77,191,255,0.3), transparent)",
            }}
          />
        </div>
      </div>

      <CrownArch />
    </motion.nav>
  );
}
