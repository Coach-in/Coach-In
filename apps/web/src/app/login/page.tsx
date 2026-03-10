"use client";

import { useState } from "react";
import Link from "next/link";

type Role = "athlete" | "coach";

export default function LoginPage() {
  const [role, setRole] = useState<Role>("athlete");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ role, email, password });
  };

  return (
    <div className="bg-gradient-to-br from-[#1c232d] via-[#162644] to-[#0c336f] min-h-screen flex items-center justify-center">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="gap-2.5 text-[#c9a84c] text-[0.8rem] font-semibold tracking-[3px] uppercase mb-3">
                Connexion
          </div>
          <Link href="/" className="inline-flex items-center gap-2.5 text-[#e8c97a] font-bold text-xl no-underline" style={{ fontFamily: "'Playfair Display', serif" }}>
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] flex items-center justify-center text-[#0a0f1e] font-black text-base">
              Φ
            </span>
            Coach&apos;In
          </Link>
          <p className="text-[#8a96b0] text-sm mt-3">Bon retour parmi nous.</p>
        </div>
        <div className="bg-[#0d1528] border border-[rgba(201,168,76,0.18)] rounded-2xl p-8">
          <div className="flex mb-8 border border-[rgba(201,168,76,0.18)] rounded-xl overflow-hidden">
            <button
              onClick={() => setRole("athlete")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
                role === "athlete"
                  ? "bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] text-[#0a0f1e]"
                  : "text-[#8a96b0] hover:text-[#e8c97a] bg-transparent"
              }`}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Sportif
            </button>
            <button
              onClick={() => setRole("coach")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all border-l border-[rgba(201,168,76,0.18)] ${
                role === "coach"
                  ? "bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] text-[#0a0f1e]"
                  : "text-[#8a96b0] hover:text-[#e8c97a] bg-transparent"
              }`}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
              </svg>
              Coach
            </button>
          </div>

          <div className="flex items-center gap-2 text-[0.75rem] text-[#8a96b0] bg-[rgba(201,168,76,0.04)] border border-[rgba(201,168,76,0.1)] rounded-lg px-3 py-2 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] shrink-0" />
            {role === "athlete"
              ? "Connectez-vous pour accéder à vos programmes, suivre vos progrès avec un coach qualifié."
              : "Connectez-vous pour gérer vos athlètes et vos programmations."}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[#8a96b0] tracking-wide uppercase">
                Adresse e-mail
              </label>
              <input
                type="email"
                placeholder="vous@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="px-4 py-3 rounded-xl bg-[#0a0f1e] border border-[rgba(201,168,76,0.18)] text-[#f0eee8] text-sm placeholder-[#8a96b0] focus:outline-none focus:border-[#c9a84c] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#8a96b0] tracking-wide uppercase">
                  Mot de passe
                </label>
                <Link href="/forgot-password" className="text-xs text-[#c9a84c] hover:text-[#e8c97a] transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-[#0a0f1e] border border-[rgba(201,168,76,0.18)] text-[#f0eee8] text-sm placeholder-[#8a96b0] focus:outline-none focus:border-[#c9a84c] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center text-[#8a96b0] hover:text-[#e8c97a] transition-colors"
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

            {/* Submit */}
            <button
              type="submit"
              className="mt-2 w-full py-3.5 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] text-[#0a0f1e] font-bold text-sm shadow-[0_4px_24px_rgba(201,168,76,0.2)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.3)] hover:-translate-y-0.5 transition-all"
            >
              Connexion {role === "athlete" ? "sportif" : "coach"}
            </button>
          </form>
        </div>

        {/* Register link */}
        <p className="text-center text-[#8a96b0] text-sm mt-6">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-[#c9a84c] hover:text-[#e8c97a] font-semibold transition-colors">
            S&apos;inscrire
          </Link>
        </p>

      </div>
    </div>
  );
}