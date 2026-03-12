import type { Metadata } from "next";
import "./globals.css";
import Header from "@/app/header/Header";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}