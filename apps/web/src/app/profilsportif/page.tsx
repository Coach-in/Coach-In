"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiProgramme } from "../programation/lib/api";
import { downloadProgramme, exerciseCount } from "../programation/lib/programmes";

interface Tag {
  id: string;
  name: string;
  category: {
    id: string;
    name: string;
  };
}

interface AthleteMe {
  id: string;
  age: number;
  goals: string;
  tags: Tag[];
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

const MOCK_MESSAGES = [
  { id: 1, from: "Mon coach", content: "Excellent travail sur le squat cette semaine !", time: "Il y a 2h", read: false },
  { id: 2, from: "Mon coach", content: "N'oublie pas de renseigner ton RPE après chaque séance.", time: "Hier", read: true },
];

type Tab = "overview" | "programmes" | "messages";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function AthleteProfile() {
  const router = useRouter();
  const [athlete, setAthlete] = useState<AthleteMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [editGoals, setEditGoals] = useState(false);
  const [goals, setGoals] = useState("");

  const [token, setToken] = useState<string | null>(null);
  const [programmes, setProgrammes] = useState<ApiProgramme[]>([]);
  const [programmesError, setProgrammesError] = useState("");
  // Id of the programme whose PDF is being generated, or waiting for a delete confirmation
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const tokenRes = await fetch("/api/auth/set-token");
        const { authenticated, token } = await tokenRes.json();
  
        if (!authenticated || !token) {
          router.push("/login");
          return;
        }
  
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/athletes/me`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
  
        if (res.status === 401) {
          router.push("/login");
          return;
        }
  
        if (!res.ok) throw new Error();
  
        const data: AthleteMe = await res.json();
        setAthlete(data);
        setGoals(data.goals ?? "");
        setToken(token);

        try {
          setProgrammes(await api.listProgrammes(token));
        } catch {
          setProgrammesError("Impossible de charger vos programmes.");
        }
      } catch {
        setError("Impossible de charger le profil.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchMe();
  }, [router]);

  const handleSaveGoals = async () => {
    setEditGoals(false);
  };

  // The list only carries the exercise entries: fetch the full programme (with image URLs) for the PDF
  const handleDownload = async (id: string) => {
    if (!token) return;
    setDownloadingId(id);
    setProgrammesError("");
    try {
      await downloadProgramme(await api.getProgramme(token, id));
    } catch {
      setProgrammesError("Le téléchargement du PDF a échoué.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    try {
      await api.deleteProgramme(token, id);
      setProgrammes((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setProgrammesError("La suppression a échoué.");
    }
  };
  
  const handleDisconnection = () => {
    fetch("/api/auth/set-token", {
      method: "DELETE",
    }).then(() => {
      router.push("/login");
    },);
  };

  const unread = MOCK_MESSAGES.filter((m) => !m.read).length;
  const ownProgrammes = programmes.filter((p) => p.coach === null);
  const latest = programmes[0];

  const initials = athlete?.user.username
    .split("_")
    .map((p) => p[0].toUpperCase())
    .join("") ?? "?";

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin text-gold" width="28" height="28" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-ink-muted text-sm">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (error || !athlete) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
        <div className="text-center border border-danger-line bg-danger-surface rounded-2xl px-8 py-10 max-w-sm">
          <p className="text-danger-ink text-sm mb-4">{error || "Profil introuvable."}</p>
          <button onClick={() => router.push("/login")} className="px-4 py-2 rounded-lg bg-gradient-to-br from-gold to-gold-light text-navy-950 font-bold text-sm">
            Se reconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-600 to-navy-500 text-ink px-[5vw] py-25">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        <div className="relative rounded-2xl overflow-hidden border border-gold-heavy bg-navy-900">
          <div className="cover-gradient h-28 w-full" />

          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-8 mb-4">
              <div className="font-display w-16 h-16 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-navy-950 font-black text-xl border-4 border-navy-900">
                {initials}
              </div>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-display text-xl font-bold text-ink">
                  @{athlete.user.username}
                </h1>
                <p className="text-ink-muted text-sm mt-0.5">{athlete.user.email}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[0.7rem] font-semibold text-gold border border-gold-soft px-2 py-0.5 rounded-md bg-gold-muted">
                    Sportif
                  </span>
                  {athlete.age && (
                    <>
                      <span className="text-ink-muted text-[0.7rem]">·</span>
                      <span className="text-ink-muted text-[0.7rem]">{athlete.age} ans</span>
                    </>
                  )}
                </div>
              </div>

              <button onClick={() => handleDisconnection()}
              className="text-on-accent px-4 py-1.5 hover:text-graphite-800 rounded-lg bg-gradient-to-br from-danger-ink-soft to-danger font-bold hover:-translate-y-0.5 transition-all">
                  Se déconnecter
              </button>
              <div className="flex gap-0 border border-gold-border rounded-xl overflow-hidden">
                {[
                  { n: programmes.length, l: "Programmes" },
                  { n: ownProgrammes.length, l: "Créés par moi" },
                  { n: athlete.tags.length, l: "Tags" },
                ].map((s, i) => (
                  <div key={i} className={`px-5 py-3 text-center ${i > 0 ? "border-l border-gold-border" : ""}`}>
                    <div className="font-display text-lg font-bold text-gold-light">{s.n}</div>
                    <div className="text-[0.65rem] text-ink-muted tracking-wide">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {athlete.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {athlete.tags.map((tag) => (
                  <span key={tag.id} className="flex items-center gap-1.5 text-[0.7rem] font-medium px-2.5 py-1 rounded-lg bg-gold-muted border border-gold-soft text-gold">
                    {tag.name}
                    <span className="text-[0.6rem] text-ink-muted font-normal">{tag.category.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-0 border border-gold-heavy rounded-xl overflow-hidden bg-navy-900">
          {([
            { key: "overview",    label: "Vue d'ensemble" },
            { key: "programmes",  label: "Programmes" },
            { key: "messages",    label: "Messages", badge: unread },
          ] as { key: Tab; label: string; badge?: number }[]).map((t, i) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${i > 0 ? "border-l border-gold-border" : ""} ${tab === t.key ? "bg-gradient-to-br from-gold to-gold-light text-navy-950" : "text-ink-muted hover:text-gold-light"}`}
            >
              {t.label}
              {t.badge ? (
                <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-on-accent-soft text-navy-950" : "bg-gold-soft text-gold"}`}>
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div className="border border-gold-heavy rounded-2xl p-5 bg-navy-900 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[2px] uppercase text-gold">
                  <span className="w-4 h-px bg-gold" />
                  Objectifs
                </div>
                <button onClick={() => editGoals ? handleSaveGoals() : setEditGoals(true)} className="text-ink-muted hover:text-gold-light transition-colors">
                  {editGoals
                    ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                  }
                </button>
              </div>
              {editGoals ? (
                <textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={4}
                  className="px-3 py-2.5 rounded-xl bg-navy-950 border border-gold-strong text-ink text-sm focus:outline-none focus:border-gold transition-colors resize-none"
                />
              ) : (
                <p className="text-ink-muted text-sm leading-relaxed">
                  {goals || <span className="italic">Aucun objectif renseigné.</span>}
                </p>
              )}
            </div>

            {/* Infos compte */}
            <div className="border border-gold-heavy rounded-2xl p-5 bg-navy-900 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[2px] uppercase text-gold">
                <span className="w-4 h-px bg-gold" />
                Informations
              </div>
              <div className="flex flex-col gap-2.5">
                {[
                  { label: "Identifiant", value: athlete.user.username },
                  { label: "Email", value: athlete.user.email },
                  { label: "Rôle", value: "Sportif" },
                  { label: "Âge", value: athlete.age ? `${athlete.age} ans` : "Non renseigné" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between text-sm">
                    <span className="text-ink-muted text-xs">{row.label}</span>
                    <span className="text-ink text-xs font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gold-heavy rounded-2xl p-5 bg-navy-900 flex flex-col gap-3 md:col-span-2">
              <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[2px] uppercase text-gold">
                <span className="w-4 h-px bg-gold" />
                Dernier programme
              </div>
              {latest ? (
                <div className="flex items-center justify-between gap-4 bg-navy-950 rounded-xl px-4 py-3 border border-gold-soft">
                  <div>
                    <div className="font-display font-bold text-ink text-sm">{latest.name}</div>
                    <div className="text-ink-muted text-xs mt-0.5">
                      {exerciseCount(latest)} exercices · modifié le {formatDate(latest.updatedAt)}
                    </div>
                  </div>
                  <Link
                    href={`/programation?id=${latest.id}`}
                    className="px-3 py-1.5 rounded-lg border border-gold-border text-gold text-xs font-semibold hover:bg-gold-muted transition-all shrink-0"
                  >
                    Ouvrir →
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-gold-border px-4 py-3">
                  <p className="text-ink-muted text-sm">Aucun programme pour l&apos;instant.</p>
                  <Link
                    href="/programation"
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-br from-gold to-gold-light text-on-accent text-xs font-bold shrink-0 hover:-translate-y-0.5 transition-all"
                  >
                    Créer un programme
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "programmes" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-ink-muted text-sm">
                {programmes.length} programme{programmes.length > 1 ? "s" : ""} au total
              </p>
              <Link
                href="/programation"
                className="px-4 py-2 rounded-lg border border-gold-border text-ink-muted text-xs font-semibold hover:text-gold-light hover:border-gold transition-all"
              >
                + Nouveau
              </Link>
            </div>

            {programmesError && (
              <p className="rounded-xl border border-danger-line bg-danger-surface px-4 py-2.5 text-sm text-danger-ink">
                {programmesError}
              </p>
            )}

            {programmes.length === 0 && !programmesError && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gold-border bg-navy-900 px-6 py-12 text-center">
                <p className="text-ink-muted text-sm">
                  Vous n&apos;avez pas encore de programme. Créez-en un et retrouvez-le ici.
                </p>
                <Link
                  href="/programation"
                  className="px-4 py-2 rounded-lg bg-gradient-to-br from-gold to-gold-light text-on-accent text-sm font-bold hover:-translate-y-0.5 transition-all"
                >
                  Créer mon premier programme
                </Link>
              </div>
            )}

            {programmes.map((prog, index) => {
              const fromCoach = prog.coach !== null;
              return (
                <div
                  key={prog.id}
                  className={`rounded-2xl border p-5 bg-navy-900 flex flex-wrap items-center justify-between gap-4 hover:bg-navy-800 transition-colors ${index === 0 ? "border-gold-active" : "border-gold-border"}`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${index === 0 ? "bg-gradient-to-br from-gold to-gold-light text-navy-950" : "bg-gold-muted border border-gold-border text-gold"}`}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-ink text-sm truncate">{prog.name}</span>
                        {fromCoach && (
                          <span className="text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full bg-gold-soft text-gold shrink-0">
                            COACH @{prog.coach?.user.username}
                          </span>
                        )}
                      </div>
                      <div className="text-ink-muted text-xs mt-0.5">
                        {exerciseCount(prog)} exercices · modifié le {formatDate(prog.updatedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/programation?id=${prog.id}`}
                      className="px-3 py-1.5 rounded-lg border border-gold-border text-gold text-xs font-semibold hover:bg-gold-muted transition-all"
                    >
                      {fromCoach ? "Voir →" : "Modifier →"}
                    </Link>
                    <button
                      onClick={() => handleDownload(prog.id)}
                      disabled={downloadingId === prog.id}
                      className="px-3 py-1.5 rounded-lg border border-gold-border text-ink-muted text-xs font-semibold hover:text-gold-light hover:border-gold transition-all disabled:opacity-50"
                    >
                      {downloadingId === prog.id ? "PDF…" : "PDF"}
                    </button>
                    {!fromCoach && (
                      <button
                        onClick={() => handleDelete(prog.id)}
                        onBlur={() => setConfirmDeleteId(null)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          confirmDeleteId === prog.id
                            ? "border-danger-line-strong bg-danger-surface text-danger-ink"
                            : "border-gold-border text-ink-muted hover:border-danger-line hover:text-danger-ink"
                        }`}
                      >
                        {confirmDeleteId === prog.id ? "Confirmer ?" : "Supprimer"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "messages" && (
          <div className="flex flex-col gap-3">
            <p className="text-ink-muted text-sm">{unread} message{unread > 1 ? "s" : ""} non lu{unread > 1 ? "s" : ""}</p>
            {MOCK_MESSAGES.map((msg) => (
              <div key={msg.id} className={`rounded-2xl border p-5 bg-navy-900 hover:bg-navy-800 transition-colors cursor-pointer ${!msg.read ? "border-gold-active" : "border-gold-border"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-azure-600 to-azure-500 flex items-center justify-center text-gold-light font-bold text-xs shrink-0">
                      {msg.from.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink text-sm">{msg.from}</span>
                        {!msg.read && <span className="w-1.5 h-1.5 rounded-full bg-gold" />}
                      </div>
                      <p className="text-ink-muted text-xs mt-0.5 leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                  <span className="text-ink-muted text-[0.65rem] shrink-0 mt-0.5">{msg.time}</span>
                </div>
              </div>
            ))}
            <button className="w-full py-3 rounded-xl border border-dashed border-gold-border text-ink-muted text-sm hover:text-gold-light hover:border-gold transition-all">
              Ouvrir le chat complet →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? match[2] : "";
}