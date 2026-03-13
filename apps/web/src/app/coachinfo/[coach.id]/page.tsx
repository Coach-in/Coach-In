"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Tag {
  id: string;
  name: string;
  category?: { id: string; name: string };
}

interface Coach {
  id: string;
  specialty: string;
  bio: string | null;
  isApproved: boolean;
  tags: Tag[];
  user: { id: string; username: string; email: string; role: string };
}

type ConnectionStatus = "idle" | "loading" | "sent" | "error";

export default function CoachDetailPage() {
  const params = useParams();
  const id = params["coach.id"] as string;
  const router = useRouter();

  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionError, setConnectionError] = useState("");

  const [athleteId, setAthleteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const tokenRes = await fetch("/api/auth/set-token");
        const { authenticated, token } = await tokenRes.json();
  
        if (!authenticated || !token) return;
  
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/athletes/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      } catch {
      }
    };
    fetchMe();
  }, []);

  useEffect(() => {
    if (!id) {
        console.log("No coach ID provided in URL : ", id);
        return;}
    const fetchCoach = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/coachs/${id}`);
        if (!res.ok) throw new Error("Coach introuvable");
        const data = await res.json();
        setCoach(data);
      } catch {
        setError("Impossible de charger ce profil.");
      } finally {
        setLoading(false);
      }
    };
    fetchCoach();
  }, [id]);

  const handleConnect = async () => {
    if (!athleteId || !coach) return;
    setConnectionStatus("loading");
    setConnectionError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/relationships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ athleteId, coachId: coach.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setConnectionError(data.message || "Une erreur est survenue.");
        setConnectionStatus("error");
        return;
      }
      setConnectionStatus("sent");
    } catch {
      setConnectionError("Impossible de contacter le serveur.");
      setConnectionStatus("error");
    }
  };

  // ─── Initials helper ───────────────────────────────────────────
  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0]?.toUpperCase())
      .join("")
      .slice(0, 2) || "?";

  // ─── Group tags by category ────────────────────────────────────
  const tagsByCategory = (tags: Tag[]) => {
    const map = new Map<string, { label: string; tags: Tag[] }>();
    tags.forEach((tag) => {
      const catId = tag.category?.id ?? "other";
      const catName = tag.category?.name ?? "Autres";
      if (!map.has(catId)) map.set(catId, { label: catName, tags: [] });
      map.get(catId)!.tags.push(tag);
    });
    return Array.from(map.values());
  };

  // ─── Loading state ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#162644] to-[#0c336f] flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 text-[#c9a84c] mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-[#8a96b0] text-sm">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────
  if (error || !coach) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#162644] to-[#0c336f] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-5 text-red-400">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-[#f0eee8] font-bold text-lg mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            Profil introuvable
          </p>
          <p className="text-[#8a96b0] text-sm mb-6">{error}</p>
          <Link
            href="/coachs"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#c9a84c] hover:text-[#e8c97a] transition-colors"
          >
            ← Retour au catalogue
          </Link>
        </div>
      </div>
    );
  }

  const tagGroups = tagsByCategory(coach.tags);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#162644] to-[#0c336f] text-[#f0eee8]">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_70%_20%,rgba(201,168,76,0.05)_0%,transparent_60%)] pointer-events-none" />

      {/* ── Back nav ─────────────────────────────────────────────── */}
      <div className="relative px-[5vw] pt-8 pb-0 max-w-5xl mx-auto">
        <Link
          href="/coachs"
          className="inline-flex items-center gap-2 text-[#8a96b0] hover:text-[#e8c97a] text-sm font-medium transition-colors group"
        >
          <svg
            width="16"
            height="16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            className="group-hover:-translate-x-0.5 transition-transform"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Retour aux coachs
        </Link>
      </div>

      {/* ── Hero header ──────────────────────────────────────────── */}
      <div className="relative px-[5vw] pt-10 pb-0 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-6 pb-8 border-b border-[rgba(201,168,76,0.12)]">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] flex items-center justify-center text-[#0a0f1e] font-black text-3xl shadow-[0_8px_32px_rgba(201,168,76,0.25)]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {initials(coach.user.username)}
            </div>
            {/* Approved badge */}
            {coach.isApproved && (
              <div
                className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-[#0d1528] border-2 border-[#0a0f1e] flex items-center justify-center"
                title="Coach vérifié"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    stroke="#c9a84c"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Name + specialty */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[#c9a84c] text-[0.68rem] font-semibold tracking-[3px] uppercase mb-1.5">
              <span className="w-4 h-px bg-[#c9a84c]" />
              Profil coach
            </div>
            <h1
              className="text-3xl md:text-4xl font-black text-[#f0eee8] leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {coach.user.username}
            </h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[#c9a84c] text-sm font-medium">{coach.specialty}</span>
              {coach.isApproved && (
                <>
                  <span className="text-[rgba(201,168,76,0.3)]">·</span>
                  <span className="text-[0.7rem] font-semibold text-[#c9a84c] tracking-wide uppercase bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.18)] px-2 py-0.5 rounded-full">
                    Certifié
                  </span>
                </>
              )}
            </div>
          </div>

          {/* CTA — desktop */}
          <div className="hidden sm:block shrink-0">
            <ConnectButton
              status={connectionStatus}
              error={connectionError}
              hasAthleteId={!!athleteId}
              onClick={handleConnect}
            />
          </div>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="relative px-[5vw] py-10 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left — bio + tags */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Bio card */}
            <section className="bg-[#0d1528] border border-[rgba(201,168,76,0.15)] rounded-2xl p-6">
              <h2
                className="text-xs font-semibold text-[#8a96b0] tracking-[2px] uppercase mb-4"
              >
                Présentation
              </h2>
              <p className="text-[#c8c4bb] text-[0.9rem] leading-relaxed whitespace-pre-line">
                {coach.bio || "Ce coach n'a pas encore renseigné de biographie."}
              </p>
            </section>

            {/* Tags card */}
            {coach.tags.length > 0 && (
              <section className="bg-[#0d1528] border border-[rgba(201,168,76,0.15)] rounded-2xl p-6">
                <h2 className="text-xs font-semibold text-[#8a96b0] tracking-[2px] uppercase mb-5">
                  Compétences & spécialités
                </h2>
                <div className="flex flex-col gap-5">
                  {tagGroups.map((group) => (
                    <div key={group.label}>
                      <p className="text-[0.7rem] font-semibold text-[rgba(201,168,76,0.6)] tracking-widest uppercase mb-2">
                        {group.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {group.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="text-[0.75rem] font-medium px-3 py-1 rounded-lg bg-[rgba(201,168,76,0.07)] border border-[rgba(201,168,76,0.15)] text-[#e8c97a]"
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right — sidebar */}
          <div className="flex flex-col gap-5">

            {/* Contact info card */}
            <section className="bg-[#0d1528] border border-[rgba(201,168,76,0.15)] rounded-2xl p-5">
              <h2 className="text-xs font-semibold text-[#8a96b0] tracking-[2px] uppercase mb-4">
                Informations
              </h2>
              <ul className="flex flex-col gap-3">
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[rgba(201,168,76,0.07)] border border-[rgba(201,168,76,0.12)] flex items-center justify-center text-[#c9a84c] shrink-0">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.65rem] text-[#8a96b0] uppercase tracking-wide font-medium mb-0.5">Email</p>
                    <p className="text-[#c8c4bb] text-xs truncate">{coach.user.email}</p>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[rgba(201,168,76,0.07)] border border-[rgba(201,168,76,0.12)] flex items-center justify-center text-[#c9a84c] shrink-0">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[0.65rem] text-[#8a96b0] uppercase tracking-wide font-medium mb-0.5">Spécialité</p>
                    <p className="text-[#c8c4bb] text-xs">{coach.specialty}</p>
                  </div>
                </li>
                <li className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-[rgba(201,168,76,0.07)] border border-[rgba(201,168,76,0.12)] flex items-center justify-center text-[#c9a84c] shrink-0">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-[0.65rem] text-[#8a96b0] uppercase tracking-wide font-medium mb-0.5">Statut</p>
                    <p className={`text-xs font-medium ${coach.isApproved ? "text-green-400" : "text-amber-400"}`}>
                      {coach.isApproved ? "Profil vérifié" : "En attente de vérification"}
                    </p>
                  </div>
                </li>
              </ul>
            </section>

            {/* CTA — mobile */}
            <div className="sm:hidden">
              <ConnectButton
                status={connectionStatus}
                error={connectionError}
                hasAthleteId={!!athleteId}
                onClick={handleConnect}
              />
            </div>

            {/* Info note */}
            {!athleteId && (
              <div className="bg-[rgba(201,168,76,0.04)] border border-[rgba(201,168,76,0.1)] rounded-xl px-4 py-3 text-[0.75rem] text-[#8a96b0] leading-relaxed">
                <span className="text-[#c9a84c] font-semibold">Vous êtes coach ?</span>{" "}
                Seuls les sportifs peuvent envoyer une demande de connexion.{" "}
                <Link href="/login" className="text-[#c9a84c] hover:text-[#e8c97a] underline transition-colors">
                  Connectez-vous
                </Link>{" "}
                avec un compte sportif.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable CTA button ───────────────────────────────────────────────────────

interface ConnectButtonProps {
  status: ConnectionStatus;
  error: string;
  hasAthleteId: boolean;
  onClick: () => void;
}

function ConnectButton({ status, error, hasAthleteId, onClick }: ConnectButtonProps) {
  if (status === "sent") {
    return (
      <div className="flex items-center gap-2.5 px-5 py-3.5 rounded-xl bg-green-500/10 border border-green-500/25 text-green-400 text-sm font-semibold">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Demande envoyée !
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={onClick}
        disabled={status === "loading" || !hasAthleteId}
        className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] text-[#0a0f1e] font-bold text-sm shadow-[0_4px_20px_rgba(201,168,76,0.2)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.35)] hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 w-full sm:w-auto justify-center"
      >
        {status === "loading" ? (
          <svg className="animate-spin" width="15" height="15" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
        )}
        {status === "loading" ? "Envoi..." : "Demander un suivi"}
      </button>
      {error && (
        <p className="text-red-400 text-xs text-right">{error}</p>
      )}
    </div>
  );
}