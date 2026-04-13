"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import ConnectButton from "./ConnectButton";

const navLinks = [
  { href: "/arenas", label: "Arenas" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 50);
  });

  const isTransparent = isHome && !scrolled;
  const showDark = isHome && scrolled;

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-4 transition-all duration-300 ${
        isTransparent
          ? "bg-transparent border-b border-transparent"
          : showDark
            ? "bg-[#0a0a1a]/90 backdrop-blur-md border-b border-white/10"
            : "bg-surface/95 backdrop-blur-md border-b border-border"
      }`}
    >
      <Link href="/" className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          showDark || isHome && !scrolled ? "bg-accent-primary" : "bg-accent-primary"
        }`}>
          <span className="text-white font-display font-bold text-sm">C</span>
        </div>
        <span className={`font-display text-lg font-bold tracking-tight ${
          showDark || (isHome && !scrolled) ? "text-white" : "text-text-primary"
        }`}>
          COLOSSEUM
        </span>
      </Link>

      <div className="flex items-center gap-8">
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? "text-accent-primary"
                    : showDark || (isHome && !scrolled)
                    ? "text-white/70 hover:text-white"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-accent-primary rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </div>
        <ConnectButton />
      </div>
    </motion.nav>
  );
}