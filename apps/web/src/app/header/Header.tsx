"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import NotificationsModal from "@/app/components/NotificationsModal";

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
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const tokenRes = await fetch("/api/auth/set-token");
        const { authenticated, token } = await tokenRes.json();

        if (!authenticated || !token) return;

        const meRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/me`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (!meRes.ok) return;

        const me = await meRes.json();

        setAuth({
          authenticated: true,
          role: me.role,
          username: me.username,
        });

        const notifRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/notifications`,
          { headers: { Authorization: `Bearer ${token}` } },
        );

        if (notifRes.ok) {
          const notifications = await notifRes.json();
          const unseenCount = notifications.filter(
            (n: { status: string }) => n.status === "unseen",
          ).length;
          setUnreadCount(unseenCount);
        }
      } catch {}
    };

    checkAuth();
  }, []);

  const profileHref = auth.role === "coach" ? "/profilcoach" : "/profilsportif";

  const initials = auth.username
    ? auth.username
        .split("_")
        .map((p: string) => p[0].toUpperCase())
        .join("")
        .slice(0, 2)
    : null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-gold-warm bg-navy-950">
      <div className="max-w-5xl mx-auto px-6 h-18 flex items-center justify-between">
        <Link
          href="/"
          className="font-display flex items-center gap-2.5 text-gold-light font-bold text-lg no-underline"
        >
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-navy-950 font-black text-base">
            Φ
          </span>
          Coach&apos;In
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link
            href="/catalog"
            className="text-ink-muted hover:text-gold-light text-sm font-medium transition-colors"
          >
            Nos Coachs
          </Link>

          {auth.authenticated && (
            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="relative text-ink-muted hover:text-gold-warm transition-colors"
            >
              <svg
                width="22"
                height="22"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold-warm text-graphite-800 text-[0.6rem] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          )}

          {auth.authenticated ? (
            <Link
              href={profileHref}
              className="flex items-center gap-2 text-on-accent px-4 py-1.5 rounded-lg bg-gradient-to-br from-gold to-gold-light font-bold text-sm shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all"
            >
              <span className="w-5 h-5 rounded-full bg-on-accent-soft flex items-center justify-center text-[0.6rem] font-black">
                {initials}
              </span>
              {auth.role === "coach" ? "Profil coach" : "Mon profil"}
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-on-accent px-4 py-1.5 hover:text-graphite-800 rounded-lg bg-gradient-to-br from-gold to-gold-light font-bold text-sm shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all"
            >
              Connexion
            </Link>
          )}
        </nav>

        <NotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => {
            setIsNotificationsOpen(false);
            if (auth.authenticated) {
              fetch("/api/auth/set-token")
                .then((res) => res.json())
                .then(({ token }) => {
                  if (token) {
                    fetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications`, {
                      headers: { Authorization: `Bearer ${token}` },
                    })
                      .then((res) => res.json())
                      .then((notifications) => {
                        const unseenCount = notifications.filter(
                          (n: { status: string }) => n.status === "unseen",
                        ).length;
                        setUnreadCount(unseenCount);
                      });
                  }
                });
            }
          }}
        />
      </div>
    </header>
  );
}
