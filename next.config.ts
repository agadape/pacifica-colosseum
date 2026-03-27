import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Suppress optional Privy peer dependency warnings
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@farcaster/mini-app-solana": false,
    };
    return config;
  },
};

export default nextConfig;
