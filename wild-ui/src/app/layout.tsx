import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COLOSSEUM — The Last Trader Standing",
  description: "Battle Royale trading competition on Pacifica. Survive. Adapt. Dominate.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' rx='6' fill='%23000'/><polygon points='16,4 28,10 28,22 16,28 4,22 4,10' fill='none' stroke='%23FF0000' stroke-width='2'/><rect x='13' y='13' width='6' height='6' fill='%23FF0000'/></svg>"
        />
      </head>
      <body>
        <div className="grain-overlay" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}