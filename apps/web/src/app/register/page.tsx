"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Role = "athlete" | "coach";
type Step = 1 | 2 | 3;

interface ApiError { message: string; }

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("athlete");
  const [step, setStep] = useState<Step>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [coachId, setCoachId] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
    age: "",
    goals: "",
    tags: "",
    diploma: "",
    specialty: "",
    bio: "",
  });

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const passwordMismatch = form.confirm !== "" && form.confirm !== form.password;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const body = role === "athlete"
        ? {
            email: form.email, username: form.username,
            password: form.password, role: "athlete",
            athleteProfile: {
              age: form.age ? parseInt(form.age) : undefined,
              goals: form.goals || undefined,
              tagNames: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
            },
          }
        : {
            email: form.email, username: form.username,
            password: form.password, role: "coach",
            coachProfile: { diploma: form.diploma, specialty: form.specialty, bio: form.bio },
          };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) { setError((data as ApiError).message || "Une erreur est survenue."); return; }

      // Pose le JWT
      await fetch("/api/auth/set-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data.token }),
      });

      if (role === "coach") {
        const id = data.coach?.id ?? data.user?.id;
        setCoachId(id);
        setStep(3);
      } else {
        router.push("/profilsportif");
      }
    } catch {
      setError("Impossible de contacter le serveur. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !coachId) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/coach-documents/upload/${coachId}`,
        { method: "POST", body: formData }
      );

      const data = await res.json();
      if (!res.ok) { setError(data.message || "Erreur lors de l'upload."); return; }

      setUploadDone(true);
      setTimeout(() => router.push("/profilcoach"), 2000);
    } catch {
      setError("Impossible d'envoyer le document.");
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const EyeOpen = () => (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
  const EyeOff = () => (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
  const Spinner = () => (
    <svg className="animate-spin" width="15" height="15" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );

  const inputClass = "px-4 py-3 rounded-xl bg-navy-950 border border-gold-border text-ink text-sm placeholder-ink-muted focus:outline-none focus:border-gold transition-colors w-full";
  const labelClass = "text-xs font-semibold text-ink-muted tracking-wide uppercase";

  const coachSteps = ["Compte", "Profil", "Diplôme"];
  const athleteSteps = ["Compte", "Profil"];
  const steps = role === "coach" ? coachSteps : athleteSteps;

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-600 to-navy-500 flex items-center justify-center px-4 py-16">
      <div className="glow-top absolute inset-0 pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="font-display inline-flex items-center gap-2.5 text-gold-light font-bold text-xl no-underline">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-navy-950 font-black text-base">Φ</span>
            Coach&apos;In
          </Link>
          <p className="text-ink-muted text-sm mt-3">Créez votre compte gratuitement.</p>
        </div>

        <div className="bg-navy-900 border border-gold-border rounded-2xl p-8">
          {step === 1 && (
            <div className="flex mb-6 border border-gold-border rounded-xl overflow-hidden">
              {(["athlete", "coach"] as Role[]).map((r, i) => (
                <button key={r} type="button"
                  onClick={() => { setRole(r); setError(""); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${i > 0 ? "border-l border-gold-border" : ""} ${role === r ? "bg-gradient-to-br from-gold to-gold-light text-navy-950" : "text-ink-muted hover:text-gold-light"}`}
                >
                  {r === "athlete" ? "Sportif" : "Coach"}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center mb-6">
            {steps.map((label, i) => {
              const s = i + 1;
              const active = step >= s;
              const done = step > s;
              const isLast = i === steps.length - 1;
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${active ? "bg-gradient-to-br from-gold to-gold-light text-navy-950" : "border border-gold-strong text-ink-muted"}`}>
                      {done ? "✓" : s}
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap ${active ? "text-gold-light" : "text-ink-muted"}`}>{label}</span>
                  </div>
                  {!isLast && <div className={`flex-1 h-px mx-2 ${done ? "bg-gold" : "bg-gold-border"}`} />}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-danger-ink text-xs bg-danger-surface border border-danger-line rounded-lg px-3 py-2.5 mb-4">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleNext} className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[0.75rem] text-ink-muted bg-gold-faint border border-gold-soft rounded-lg px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                {role === "athlete" ? "Créez votre profil pour accéder aux coachs certifiés." : "Vos diplômes seront vérifiés avant activation du profil."}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Nom d&apos;utilisateur</label>
                <input type="text" placeholder="johndoe" value={form.username} onChange={(e) => update("username", e.target.value)} required className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Adresse e-mail</label>
                <input type="email" placeholder="vous@exemple.com" value={form.email} onChange={(e) => update("email", e.target.value)} required className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Mot de passe</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="8 caractères minimum" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={8} className={inputClass + " pr-11"} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3 flex items-center text-ink-muted hover:text-gold-light transition-colors">
                    {showPassword ? <EyeOff /> : <EyeOpen />}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Confirmer le mot de passe</label>
                <div className="relative">
                  <input type={showConfirm ? "text" : "password"} placeholder="••••••••" value={form.confirm} onChange={(e) => update("confirm", e.target.value)} required className={`${inputClass} pr-11 ${passwordMismatch ? "border-danger-line-strong" : ""}`} />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-3 flex items-center text-ink-muted hover:text-gold-light transition-colors">
                    {showConfirm ? <EyeOff /> : <EyeOpen />}
                  </button>
                </div>
                {passwordMismatch && <p className="text-danger-ink text-xs">Les mots de passe ne correspondent pas.</p>}
              </div>

              <button type="submit" disabled={passwordMismatch || loading}
                className="mt-2 w-full py-3.5 rounded-xl bg-gradient-to-br from-gold to-gold-light text-navy-950 font-bold text-sm shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading && <Spinner />}
                Suivant →
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[0.75rem] text-ink-muted bg-gold-faint border border-gold-soft rounded-lg px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                {role === "athlete" ? "Ces informations aident le coach à mieux vous connaître." : "Ces informations seront vérifiées avant validation de votre profil."}
              </div>

              {role === "athlete" && (
                <>
                  <div className="flex gap-3">
                    <div className="flex flex-col gap-1.5 w-24 shrink-0">
                      <label className={labelClass}>Âge</label>
                      <input type="number" placeholder="25" min={10} max={99} value={form.age} onChange={(e) => update("age", e.target.value)} className={inputClass} />
                    </div>
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className={labelClass}>Tags <span className="normal-case font-normal">(virgule)</span></label>
                      <input type="text" placeholder="Football, Running, Casual..." value={form.tags} onChange={(e) => update("tags", e.target.value)} className={inputClass} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>Objectifs <span className="normal-case font-normal">(optionnel)</span></label>
                    <input type="text" placeholder="ex : Améliorer mon endurance..." value={form.goals} onChange={(e) => update("goals", e.target.value)} className={inputClass} />
                  </div>
                </>
              )}

              {role === "coach" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>Diplôme principal</label>
                    <input type="text" placeholder="ex : BPJEPS AF, DEJEPS, Master STAPS..." value={form.diploma} onChange={(e) => update("diploma", e.target.value)} required className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>Spécialité</label>
                    <input type="text" placeholder="ex : Powerlifting, Yoga, Course à pied..." value={form.specialty} onChange={(e) => update("specialty", e.target.value)} required className={inputClass} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>Présentation</label>
                    <textarea placeholder="Décrivez votre approche, votre expérience et vos valeurs..." value={form.bio} onChange={(e) => update("bio", e.target.value)} required rows={4} className={inputClass + " resize-none"} />
                  </div>
                </>
              )}

              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl border border-gold-border text-ink-muted font-medium text-sm hover:text-gold-light hover:border-gold transition-all">
                  ← Retour
                </button>
                <button type="submit" disabled={loading} className="flex-1 py-3.5 rounded-xl bg-gradient-to-br from-gold to-gold-light text-navy-950 font-bold text-sm hover:shadow-glow-lg hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading && <Spinner />}
                  {loading ? "Création..." : role === "coach" ? "Suivant →" : "Créer mon compte"}
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-5">

              {uploadDone ? (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-success-surface-hover border border-success-line flex items-center justify-center text-success-ink">
                    <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-display font-bold text-ink text-base">Document envoyé !</p>
                    <p className="text-warning-ink text-sm mt-1">Votre profil sera activé après vérification par notre équipe.</p>
                  </div>
                  <p className="text-gold text-xs animate-pulse">Redirection en cours...</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-[0.75rem] text-ink-muted bg-gold-faint border border-gold-soft rounded-lg px-3 py-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                    Votre compte est créé. Uploadez maintenant votre justificatif de diplôme.
                  </div>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-all ${
                      dragOver
                        ? "border-gold bg-gold-muted"
                        : file
                        ? "border-success-line-strong bg-success-surface"
                        : "border-gold-strong bg-gold-faint hover:border-gold hover:bg-gold-faint"
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,application/pdf"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
                    />

                    {file ? (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-success-surface-hover border border-success-line flex items-center justify-center text-success-ink">
                          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="text-ink text-sm font-semibold">{file.name}</p>
                          <p className="text-ink-muted text-xs mt-0.5">{(file.size / 1024).toFixed(0)} Ko · Cliquer pour changer</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-gold-muted border border-gold-border flex items-center justify-center text-gold">
                          <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                          </svg>
                        </div>
                        <div className="text-center">
                          <p className="text-ink text-sm font-medium">Glissez votre fichier ici</p>
                          <p className="text-ink-muted text-xs mt-1">PNG, JPG ou PDF · max 10 Mo</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => router.push("/profilcoach")}
                      className="flex-1 py-3.5 rounded-xl border border-gold-border text-ink-muted font-medium text-sm hover:text-gold-light hover:border-gold transition-all"
                    >
                      Passer pour l&apos;instant
                    </button>
                    <button
                      type="button"
                      onClick={handleUpload}
                      disabled={!file || loading}
                      className="flex-1 py-3.5 rounded-xl bg-gradient-to-br from-gold to-gold-light text-navy-950 font-bold text-sm hover:shadow-glow-lg hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading && <Spinner />}
                      {loading ? "Envoi..." : "Envoyer le document"}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

        </div>

        <p className="text-center text-ink-muted text-sm mt-6">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-gold hover:text-gold-light font-semibold transition-colors">
            Se connecter
          </Link>
        </p>

      </div>
    </div>
  );
}