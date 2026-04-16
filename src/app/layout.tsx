import type { Metadata } from "next";
import { Cinzel, Manrope, JetBrains_Mono } from "next/font/google";
import Providers from "./providers";
import Navbar from "@/components/shared/Navbar";
import BackgroundEffects from "@/components/shared/BackgroundEffects";
import TargetCursor from "@/components/shared/TargetCursor";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pacifica Colosseum | The Last Trader Standing",
  description: "Battle Royale Trading Competition — 4 rounds. Progressive eliminations. Last trader standing wins the prize pool.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚔</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${cinzel.variable} ${manrope.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>
          <TargetCursor spinDuration={3} hideDefaultCursor parallaxOn hoverDuration={0.15} color="#4DBFFF" />
          <BackgroundEffects />
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
