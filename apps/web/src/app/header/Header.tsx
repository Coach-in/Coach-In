"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AuthState = {
  authenticated: boolean;
  role: "athlete" | "coach" | null;
  username: string | null;
};

export default function Header() {
  const [auth, setAuth] = useState<AuthState>({
    authenticated: false,
    role: null,
    username: null,
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const tokenRes = await fetch("/api/auth/set-token");
        const { authenticated, token } = await tokenRes.json();

        if (!authenticated || !token) return;

        const meRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/me`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!meRes.ok) return;

        const me = await meRes.json();

        setAuth({
          authenticated: true,
          role: me.role,
          username: me.username,
        });
      } catch {
      }
    };

    checkAuth();
  }, []);

  const profileHref = auth.role === "coach" ? "/profilecoach" : "/profilesportif";

  const initials = auth.username
    ? auth.username.split("_").map((p: string) => p[0].toUpperCase()).join("").slice(0, 2)
    : null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#ffd398] bg-[rgba(10,15,30)]">
      <div className="max-w-5xl mx-auto px-6 h-18 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 text-[#e8c97a] font-bold text-lg no-underline" style={{ fontFamily: "'Playfair Display', serif" }}>
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] flex items-center justify-center text-[#0a0f1e] font-black text-base">
            Φ
          </span>
          Coach&apos;In
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link href="/catalog" className="text-[#8a96b0] hover:text-[#e8c97a] text-sm font-medium transition-colors">
            Nos Coachs
          </Link>

          {auth.authenticated ? (
            <Link
              href={profileHref}
              className="flex items-center gap-2 text-black px-4 py-1.5 rounded-lg bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] font-bold text-sm shadow-[0_4px_24px_rgba(201,168,76,0.22)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.32)] hover:-translate-y-0.5 transition-all"
            >
              <span className="w-5 h-5 rounded-full bg-[#0a0f1e]/25 flex items-center justify-center text-[0.6rem] font-black">
                {initials}
              </span>
              {auth.role === "coach" ? "Profil coach" : "Mon profil"}
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-black px-4 py-1.5 hover:text-[#1c232d] rounded-lg bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] font-bold text-sm shadow-[0_4px_24px_rgba(201,168,76,0.22)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.32)] hover:-translate-y-0.5 transition-all"
            >
              Connexion
            </Link>
          )}
        </nav>

      </div>
    </header>
  );
}