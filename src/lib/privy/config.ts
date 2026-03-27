import type { PrivyClientConfig } from "@privy-io/react-auth";

export const privyConfig: PrivyClientConfig = {
  loginMethods: ["email", "google", "twitter", "wallet"],
  appearance: {
    theme: "dark",
    accentColor: "#6366f1",
  },
  embeddedWallets: {
    solana: {
      createOnLogin: "users-without-wallets",
    },
  },
};
