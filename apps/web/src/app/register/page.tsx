"use client";

import { useState } from "react";
import Link from "next/link";

type Role = "athlete" | "coach";
type Step = 1 | 2 ;

export default function RegisterPage() {
  const [role, setRole] = useState<Role>("athlete");
  const [step, setStep] = useState<Step>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
    diploma: "",
    specialty: "",
    bio: "",
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "coach") setStep(2);
    else handleSubmit();
  };

  const handleSubmit = () => {
    console.log({ role, ...form });
  };

  return (
    <div className="bg-gradient-to-br from-[#1c232d] via-[#162644] to-[#0c336f] min-h-screen flex items-center justify-center">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
        <div className="gap-2.5 text-[#c9a84c] text-[0.8rem] font-semibold tracking-[3px] uppercase mb-3">
                Inscription
          </div>
          <Link href="/" className="inline-flex items-center gap-2.5 text-[#e8c97a] font-bold text-xl no-underline" style={{ fontFamily: "'Playfair Display', serif" }}>
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] flex items-center justify-center text-[#0a0f1e] font-black text-base">
              Φ
            </span>
            Coach&apos;In
          </Link>
          <p className="text-[#8a96b0] text-sm mt-3">Créez votre compte gratuitement.</p>
        </div>

        <div className="bg-[#0d1528] border border-[rgba(201,168,76,0.18)] rounded-2xl p-8">
          {step === 1 && (
            <div className="flex mb-6 border border-[rgba(201,168,76,0.18)] rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setRole("athlete")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${
                  role === "athlete"
                    ? "bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] text-[#0a0f1e]"
                    : "text-[#8a96b0] hover:text-[#e8c97a]"
                }`}
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                Sportif
              </button>
              <button
                type="button"
                onClick={() => setRole("coach")}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all border-l border-[rgba(201,168,76,0.18)] ${
                  role === "coach"
                    ? "bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] text-[#0a0f1e]"
                    : "text-[#8a96b0] hover:text-[#e8c97a]"
                }`}
              >
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
                Coach
              </button>
            </div>
          )}

          {role === "coach" && (
            <div className="flex items-center gap-2 mb-6">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                    step >= s
                      ? "bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] text-[#0a0f1e]"
                      : "border border-[rgba(201,168,76,0.25)] text-[#8a96b0]"
                  }`}>
                    {step > s ? (
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : s}
                  </div>
                  <span className={`text-xs font-medium ${step >= s ? "text-[#e8c97a]" : "text-[#8a96b0]"}`}>
                    {s === 1 ? "Compte" : "Profil coach"}
                  </span>
                  {s < 2 && <div className={`flex-1 h-px ${step > s ? "bg-[#c9a84c]" : "bg-[rgba(201,168,76,0.18)]"}`} />}
                </div>
              ))}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleNext} className="flex flex-col gap-4">

              <div className="flex items-center gap-2 text-[0.75rem] text-[#8a96b0] bg-[rgba(201,168,76,0.04)] border border-[rgba(201,168,76,0.1)] rounded-lg px-3 py-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] shrink-0" />
                {role === "athlete"
                  ? "Créez votre profil sportif pour accéder aux coachs certifiés."
                  : "Inscrivez-vous en tant que coach, vos diplômes seront vérifiés pour valider votre compte."}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#8a96b0] tracking-wide uppercase">
                  Nom d&apos;utilisateur
                </label>
                <input
                  type="text"
                  placeholder="johndoe"
                  value={form.username}
                  onChange={(e) => update("username", e.target.value)}
                  required
                  className="px-4 py-3 rounded-xl bg-[#0a0f1e] border border-[rgba(201,168,76,0.18)] text-[#f0eee8] text-sm placeholder-[#8a96b0] focus:outline-none focus:border-[#c9a84c] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#8a96b0] tracking-wide uppercase">
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  placeholder="vous@exemple.com"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  required
                  className="px-4 py-3 rounded-xl bg-[#0a0f1e] border border-[rgba(201,168,76,0.18)] text-[#f0eee8] text-sm placeholder-[#8a96b0] focus:outline-none focus:border-[#c9a84c] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#8a96b0] tracking-wide uppercase">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="8 caractères minimum"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    required
                    minLength={8}
                    className="w-full px-4 py-3 pr-11 rounded-xl bg-[#0a0f1e] border border-[rgba(201,168,76,0.18)] text-[#f0eee8] text-sm placeholder-[#8a96b0] focus:outline-none focus:border-[#c9a84c] transition-colors"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center text-[#8a96b0] hover:text-[#e8c97a] transition-colors">
                    {showPassword
                      ? <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    }
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#8a96b0] tracking-wide uppercase">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.confirm}
                    onChange={(e) => update("confirm", e.target.value)}
                    required
                    className={`w-full px-4 py-3 pr-11 rounded-xl bg-[#0a0f1e] border text-[#f0eee8] text-sm placeholder-[#8a96b0] focus:outline-none transition-colors ${
                      form.confirm && form.confirm !== form.password
                        ? "border-red-500/50 focus:border-red-500"
                        : "border-[rgba(201,168,76,0.18)] focus:border-[#c9a84c]"
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-3 flex items-center text-[#8a96b0] hover:text-[#e8c97a] transition-colors">
                    {showConfirm
                      ? <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    }
                  </button>
                </div>
                {form.confirm && form.confirm !== form.password && (
                  <p className="text-red-400 text-xs mt-0.5">Les mots de passe ne correspondent pas.</p>
                )}
              </div>

              <button
                type="submit"
                disabled={form.confirm !== form.password && form.confirm !== ""}
                className="mt-2 w-full py-3.5 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] text-[#0a0f1e] font-bold text-sm shadow-[0_4px_24px_rgba(201,168,76,0.2)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.3)] hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {role === "coach" ? "Suivant →" : "Créer mon compte"}
              </button>

              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-[rgba(201,168,76,0.12)]" />
                <span className="text-[#8a96b0] text-xs">ou</span>
                <div className="flex-1 h-px bg-[rgba(201,168,76,0.12)]" />
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex flex-col gap-4">

              <div className="flex items-center gap-2 text-[0.75rem] text-[#8a96b0] bg-[rgba(201,168,76,0.04)] border border-[rgba(201,168,76,0.1)] rounded-lg px-3 py-2 mb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] shrink-0" />
                Ces informations seront vérifiées avant validation de votre profil.
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#8a96b0] tracking-wide uppercase">
                  Diplôme principal
                </label>
                <input
                  type="text"
                  placeholder="ex : BPJEPS AF, DEJEPS, Master STAPS..."
                  value={form.diploma}
                  onChange={(e) => update("diploma", e.target.value)}
                  required
                  className="px-4 py-3 rounded-xl bg-[#0a0f1e] border border-[rgba(201,168,76,0.18)] text-[#f0eee8] text-sm placeholder-[#8a96b0] focus:outline-none focus:border-[#c9a84c] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#8a96b0] tracking-wide uppercase">
                  Spécialité
                </label>
                <input
                  type="text"
                  placeholder="ex : Powerlifting, Yoga, Course à pied..."
                  value={form.specialty}
                  onChange={(e) => update("specialty", e.target.value)}
                  required
                  className="px-4 py-3 rounded-xl bg-[#0a0f1e] border border-[rgba(201,168,76,0.18)] text-[#f0eee8] text-sm placeholder-[#8a96b0] focus:outline-none focus:border-[#c9a84c] transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#8a96b0] tracking-wide uppercase">
                  Présentation
                </label>
                <textarea
                  placeholder="Décrivez votre approche, votre expérience et vos valeurs en tant que coach..."
                  value={form.bio}
                  onChange={(e) => update("bio", e.target.value)}
                  required
                  rows={4}
                  className="px-4 py-3 rounded-xl bg-[#0a0f1e] border border-[rgba(201,168,76,0.18)] text-[#f0eee8] text-sm placeholder-[#8a96b0] focus:outline-none focus:border-[#c9a84c] transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 rounded-xl border border-[rgba(201,168,76,0.18)] text-[#8a96b0] font-medium text-sm hover:text-[#e8c97a] hover:border-[#c9a84c] transition-all"
                >
                  ← Retour
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] text-[#0a0f1e] font-bold text-sm shadow-[0_4px_24px_rgba(201,168,76,0.2)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.3)] hover:-translate-y-0.5 transition-all"
                >
                  Créer mon compte
                </button>
              </div>
            </form>
          )}

        </div>

        <p className="text-center text-[#8a96b0] text-sm mt-6">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-[#c9a84c] hover:text-[#e8c97a] font-semibold transition-colors">
            Se connecter
          </Link>
        </p>

      </div>
    </div>
  );
}