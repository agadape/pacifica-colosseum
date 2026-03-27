"use client";

import { usePrivy } from "@privy-io/react-auth";

function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export default function ConnectButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded-lg bg-bg-tertiary text-text-secondary"
      >
        Loading...
      </button>
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
        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={login}
      className="px-6 py-2.5 rounded-lg bg-accent-primary text-white font-semibold hover:brightness-110 transition-all"
    >
      Enter the Arena
    </button>
  );
}
