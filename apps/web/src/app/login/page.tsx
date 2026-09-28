"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Role = "athlete" | "coach";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("athlete");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Identifiants invalides.");
        return;
      }

      await fetch("/api/auth/set-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data.token }),
      });
      console.log("Token stocké en cookie", data.token);

      router.push(role === "athlete" ? "/profilsportif" : "/profilecoach");

    } catch {
      setError("Impossible de contacter le serveur. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-graphite-800 via-navy-600 to-navy-500 min-h-screen flex items-center justify-center">
      <div className="relative w-full max-w-md">

        <div className="text-center mb-8">
          <div className="gap-2.5 text-gold text-[0.8rem] font-semibold tracking-[3px] uppercase mb-3">
            Connexion
          </div>
          <Link href="/" className="font-display inline-flex items-center gap-2.5 text-gold-light font-bold text-xl no-underline">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-navy-950 font-black text-base">Φ</span>
            Coach&apos;In
          </Link>
          <p className="text-ink-muted text-sm mt-3">Bon retour parmi nous.</p>
        </div>

        <div className="bg-navy-900 border border-gold-border rounded-2xl p-8">

          {/* Toggle */}
          <div className="flex mb-8 border border-gold-border rounded-xl overflow-hidden">
            <button
              onClick={() => { setRole("athlete"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${role === "athlete" ? "bg-gradient-to-br from-gold to-gold-light text-navy-950" : "text-ink-muted hover:text-gold-light bg-transparent"}`}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Sportif
            </button>
            <button
              onClick={() => { setRole("coach"); setError(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all border-l border-gold-border ${role === "coach" ? "bg-gradient-to-br from-gold to-gold-light text-navy-950" : "text-ink-muted hover:text-gold-light bg-transparent"}`}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              Coach
            </button>
          </div>

          {/* Hint */}
          <div className="flex items-center gap-2 text-[0.75rem] text-ink-muted bg-gold-faint border border-gold-soft rounded-lg px-3 py-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
            {role === "athlete"
              ? "Connectez-vous pour accéder à vos programmes, suivre vos progrès avec un coach qualifié."
              : "Connectez-vous pour gérer vos athlètes et vos programmations."}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-danger-ink text-xs bg-danger-surface border border-danger-line rounded-lg px-3 py-2.5 mb-4">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink-muted tracking-wide uppercase">Adresse e-mail</label>
              <input
                type="email" placeholder="vous@exemple.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required
                className="px-4 py-3 rounded-xl bg-navy-950 border border-gold-border text-ink text-sm placeholder-ink-muted focus:outline-none focus:border-gold transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-ink-muted tracking-wide uppercase">Mot de passe</label>
                <Link href="/forgot-password" className="text-xs text-gold hover:text-gold-light transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-navy-950 border border-gold-border text-ink text-sm placeholder-ink-muted focus:outline-none focus:border-gold transition-colors"
                />
                <button
                  type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-ink-muted hover:text-gold-light transition-colors"
                >
                  {showPassword ? (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3.5 rounded-xl bg-gradient-to-br from-gold to-gold-light text-navy-950 font-bold text-sm shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin" width="15" height="15" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? "Connexion..." : `Connexion ${role === "athlete" ? "sportif" : "coach"}`}
            </button>

          </form>
        </div>

        <p className="text-center text-ink-muted text-sm mt-6">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-gold hover:text-gold-light font-semibold transition-colors">
            S&apos;inscrire
          </Link>
        </p>

      </div>
    </div>
  );
}