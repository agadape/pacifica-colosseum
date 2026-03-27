"use client";

import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";

function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function ConnectButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return (
      <div className="px-5 py-2 rounded-full bg-border-light text-text-tertiary text-sm">
        Loading...
      </div>
    );
  }

  if (authenticated && user) {
    const displayName =
      user.wallet?.address
        ? truncateAddress(user.wallet.address)
        : user.email?.address ?? "Connected";

    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-secondary font-mono">
          {displayName}
        </span>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={logout}
          className="px-4 py-2 rounded-full text-sm text-text-secondary border border-border hover:border-text-secondary hover:text-text-primary transition-colors"
        >
          Disconnect
        </motion.button>
      </div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={login}
      className="px-5 py-2.5 rounded-full bg-accent-primary text-white text-sm font-semibold hover:bg-accent-hover transition-colors shadow-sm"
    >
      Connect
    </motion.button>
  );
}
