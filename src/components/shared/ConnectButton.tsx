"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/hooks/use-arena";

function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function ConnectButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { data: userData } = useCurrentUser();

  if (!ready) {
    return (
      <div className="px-5 py-2 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-tertiary)] text-sm font-semibold">
        <span className="opacity-50">Loading...</span>
      </div>
    );
  }

  if (authenticated && user) {
    const walletAddress = user.wallet?.address ?? "";
    const dbUsername = userData?.data?.username;
    const displayName = dbUsername ?? (walletAddress ? truncateAddress(walletAddress) : (user.email?.address ?? "Connected"));

    return (
      <div className="flex items-center gap-3">
        <Link
          href={walletAddress ? `/profile/${walletAddress}` : "#"}
          className="cursor-target text-sm font-mono text-[var(--color-text-secondary)] hover:text-[var(--color-sky-primary)] transition-colors"
        >
          {displayName}
        </Link>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={logout}
          className="cursor-target px-4 py-2 rounded-full text-sm font-semibold border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-sky-primary)] hover:text-[var(--color-sky-primary)] transition-all"
        >
          Disconnect
        </motion.button>
      </div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(77,191,255,0.5)" }}
      whileTap={{ scale: 0.97 }}
      onClick={login}
      className="cursor-target px-5 py-2.5 rounded-full text-sm font-bold tracking-wide shadow-[0_0_16px_rgba(77,191,255,0.3)] bg-gradient-to-r from-[var(--color-sky-primary)] to-[var(--color-sky-secondary)] text-black hover:shadow-[0_0_32px_rgba(77,191,255,0.6)] transition-all"
      style={{ fontFamily: "var(--font-display)" }}
    >
      ENTER THE ARENA
    </motion.button>
  );
}
