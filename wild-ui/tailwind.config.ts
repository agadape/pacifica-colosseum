import type { NextConfig } from "next";
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        clash: ["Clash Display", "system-ui", "sans-serif"],
        satoshi: ["Satoshi", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        fire: "0 8px 24px rgba(229, 124, 3, 0.35)",
        "fire-lg": "0 16px 48px rgba(229, 124, 3, 0.4)",
        danger: "0 8px 24px rgba(239, 68, 68, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
