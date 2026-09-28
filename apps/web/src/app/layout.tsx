import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
import Header from "@/app/header/Header";

/**
 * Brand fonts, self-hosted at build time by next/font.
 * Exposed as CSS variables on <html>, then mapped to `--font-sans` /
 * `--font-display` in tokens.css so `font-sans` / `font-display`
 * work as plain utilities everywhere.
 */
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Coach'In — Le coaching sportif en ligne",
  description:
    "Connectez-vous avec des coachs diplômés et certifiés. Un accompagnement personnalisé pour atteindre vos objectifs sportifs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${montserrat.variable} ${playfair.variable}`}
    >
      <body>
        <Header />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
