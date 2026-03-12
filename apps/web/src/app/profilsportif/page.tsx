"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

const MOCK_PROGRAMMES = [
  { id: 1, name: "Préparation Championnats", length: "12 semaines", active: true, exercises: 5 },
  { id: 2, name: "Bloc hypertrophie", length: "6 semaines", active: false, exercises: 4 },
];

const MOCK_MESSAGES = [
  { id: 1, from: "Mon coach", content: "Excellent travail sur le squat cette semaine !", time: "Il y a 2h", read: false },
  { id: 2, from: "Mon coach", content: "N'oublie pas de renseigner ton RPE après chaque séance.", time: "Hier", read: true },
];

type Tab = "overview" | "programmes" | "messages";

export default function AthleteProfile() {
  const router = useRouter();
  const [athlete, setAthlete] = useState<AthleteMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [editGoals, setEditGoals] = useState(false);
  const [goals, setGoals] = useState("");

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
  
  const handleDisconnection = () => {
    fetch("/api/auth/set-token", {
      method: "DELETE",
    }).then(() => {
      router.push("/login");
    },);
  };

  const unread = MOCK_MESSAGES.filter((m) => !m.read).length;

  const initials = athlete?.user.username
    .split("_")
    .map((p) => p[0].toUpperCase())
    .join("") ?? "?";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin text-[#c9a84c]" width="28" height="28" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-[#8a96b0] text-sm">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  if (error || !athlete) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
        <div className="text-center border border-red-500/20 bg-red-500/10 rounded-2xl px-8 py-10 max-w-sm">
          <p className="text-red-400 text-sm mb-4">{error || "Profil introuvable."}</p>
          <button onClick={() => router.push("/login")} className="px-4 py-2 rounded-lg bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] text-[#0a0f1e] font-bold text-sm">
            Se reconnecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0f1e] via-[#162644] to-[#0c336f] text-[#f0eee8] px-[5vw] py-25">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">

        <div className="relative rounded-2xl overflow-hidden border border-[rgba(201,168,76,0.8)] bg-[#0d1528]">
          <div className="h-28 w-full bg-gradient-to-br from-[#0d1a3a] via-[#162040] to-[#0a0f1e]"
            style={{ backgroundImage: "linear-gradient(135deg, #0d1a3a, #162040), repeating-linear-gradient(45deg, rgba(201,168,76,0.03) 0px, rgba(201,168,76,0.03) 1px, transparent 1px, transparent 12px)" }}
          />

          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-8 mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] flex items-center justify-center text-[#0a0f1e] font-black text-xl border-4 border-[#0d1528]" style={{ fontFamily: "'Playfair Display', serif" }}>
                {initials}
              </div>
            </div>

            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-[#f0eee8]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  @{athlete.user.username}
                </h1>
                <p className="text-[#8a96b0] text-sm mt-0.5">{athlete.user.email}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[0.7rem] font-semibold text-[#c9a84c] border border-[rgba(201,168,76,0.2)] px-2 py-0.5 rounded-md bg-[rgba(201,168,76,0.06)]">
                    Sportif
                  </span>
                  {athlete.age && (
                    <>
                      <span className="text-[#8a96b0] text-[0.7rem]">·</span>
                      <span className="text-[#8a96b0] text-[0.7rem]">{athlete.age} ans</span>
                    </>
                  )}
                </div>
              </div>

              <button onClick={() => handleDisconnection()}
              className="text-black px-4 py-1.5 hover:text-[#1c232d] rounded-lg bg-gradient-to-br from-red-300 to-red-500 font-bold hover:-translate-y-0.5 transition-all">
                  Se déconnecter
              </button>
              <div className="flex gap-0 border border-[rgba(201,168,76,0.18)] rounded-xl overflow-hidden">
                {[
                  { n: MOCK_PROGRAMMES.length, l: "Programmes" },
                  { n: MOCK_PROGRAMMES.filter((p) => p.active).length, l: "En cours" },
                  { n: athlete.tags.length, l: "Tags" },
                ].map((s, i) => (
                  <div key={i} className={`px-5 py-3 text-center ${i > 0 ? "border-l border-[rgba(201,168,76,0.18)]" : ""}`}>
                    <div className="text-lg font-bold text-[#e8c97a]" style={{ fontFamily: "'Playfair Display', serif" }}>{s.n}</div>
                    <div className="text-[0.65rem] text-[#8a96b0] tracking-wide">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {athlete.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {athlete.tags.map((tag) => (
                  <span key={tag.id} className="flex items-center gap-1.5 text-[0.7rem] font-medium px-2.5 py-1 rounded-lg bg-[rgba(201,168,76,0.07)] border border-[rgba(201,168,76,0.15)] text-[#c9a84c]">
                    {tag.name}
                    <span className="text-[0.6rem] text-[#8a96b0] font-normal">{tag.category.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-0 border border-[rgba(201,168,76,0.8)] rounded-xl overflow-hidden bg-[#0d1528]">
          {([
            { key: "overview",    label: "Vue d'ensemble" },
            { key: "programmes",  label: "Programmes" },
            { key: "messages",    label: "Messages", badge: unread },
          ] as { key: Tab; label: string; badge?: number }[]).map((t, i) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all ${i > 0 ? "border-l border-[rgba(201,168,76,0.18)]" : ""} ${tab === t.key ? "bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] text-[#0a0f1e]" : "text-[#8a96b0] hover:text-[#e8c97a]"}`}
            >
              {t.label}
              {t.badge ? (
                <span className={`text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-[#0a0f1e]/30 text-[#0a0f1e]" : "bg-[#c9a84c]/20 text-[#c9a84c]"}`}>
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            <div className="border border-[rgba(201,168,76,0.8)] rounded-2xl p-5 bg-[#0d1528] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[2px] uppercase text-[#c9a84c]">
                  <span className="w-4 h-px bg-[#c9a84c]" />
                  Objectifs
                </div>
                <button onClick={() => editGoals ? handleSaveGoals() : setEditGoals(true)} className="text-[#8a96b0] hover:text-[#e8c97a] transition-colors">
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
                  className="px-3 py-2.5 rounded-xl bg-[#0a0f1e] border border-[rgba(201,168,76,0.25)] text-[#f0eee8] text-sm focus:outline-none focus:border-[#c9a84c] transition-colors resize-none"
                />
              ) : (
                <p className="text-[#8a96b0] text-sm leading-relaxed">
                  {goals || <span className="italic">Aucun objectif renseigné.</span>}
                </p>
              )}
            </div>

            {/* Infos compte */}
            <div className="border border-[rgba(201,168,76,0.8)] rounded-2xl p-5 bg-[#0d1528] flex flex-col gap-3">
              <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[2px] uppercase text-[#c9a84c]">
                <span className="w-4 h-px bg-[#c9a84c]" />
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
                    <span className="text-[#8a96b0] text-xs">{row.label}</span>
                    <span className="text-[#f0eee8] text-xs font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-[rgba(201,168,76,0.8)] rounded-2xl p-5 bg-[#0d1528] flex flex-col gap-3 md:col-span-2">
              <div className="flex items-center gap-2 text-[0.7rem] font-semibold tracking-[2px] uppercase text-[#c9a84c]">
                <span className="w-4 h-px bg-[#c9a84c]" />
                Programme en cours
              </div>
              {MOCK_PROGRAMMES.filter((p) => p.active).map((prog) => (
                <div key={prog.id} className="flex items-center justify-between gap-4 bg-[#0a0f1e] rounded-xl px-4 py-3 border border-[rgba(201,168,76,0.1)]">
                  <div>
                    <div className="font-bold text-[#f0eee8] text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{prog.name}</div>
                    <div className="text-[#8a96b0] text-xs mt-0.5">{prog.length} · {prog.exercises} exercices</div>
                  </div>
                  <button className="px-3 py-1.5 rounded-lg border border-[rgba(201,168,76,0.18)] text-[#c9a84c] text-xs font-semibold hover:bg-[rgba(201,168,76,0.07)] transition-all shrink-0">
                    Voir →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "programmes" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p className="text-[#8a96b0] text-sm">{MOCK_PROGRAMMES.length} programmes au total</p>
              <button className="px-4 py-2 rounded-lg border border-[rgba(201,168,76,0.18)] text-[#8a96b0] text-xs font-semibold hover:text-[#e8c97a] hover:border-[#c9a84c] transition-all">
                + Nouveau
              </button>
            </div>
            {MOCK_PROGRAMMES.map((prog) => (
              <div key={prog.id} className={`rounded-2xl border p-5 bg-[#0d1528] flex items-center justify-between gap-4 hover:bg-[#111d36] transition-colors ${prog.active ? "border-[rgba(201,168,76,0.4)]" : "border-[rgba(201,168,76,0.18)]"}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${prog.active ? "bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] text-[#0a0f1e]" : "bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.18)] text-[#c9a84c]"}`}>
                    {prog.id}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#f0eee8] text-sm" style={{ fontFamily: "'Playfair Display', serif" }}>{prog.name}</span>
                      {prog.active && <span className="text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(74,222,128,0.12)] text-[#4ade80]">EN COURS</span>}
                    </div>
                    <div className="text-[#8a96b0] text-xs mt-0.5">{prog.length} · {prog.exercises} exercices</div>
                  </div>
                </div>
                <button className="px-3 py-1.5 rounded-lg border border-[rgba(201,168,76,0.18)] text-[#c9a84c] text-xs font-semibold hover:bg-[rgba(201,168,76,0.07)] transition-all shrink-0">
                  Voir →
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === "messages" && (
          <div className="flex flex-col gap-3">
            <p className="text-[#8a96b0] text-sm">{unread} message{unread > 1 ? "s" : ""} non lu{unread > 1 ? "s" : ""}</p>
            {MOCK_MESSAGES.map((msg) => (
              <div key={msg.id} className={`rounded-2xl border p-5 bg-[#0d1528] hover:bg-[#111d36] transition-colors cursor-pointer ${!msg.read ? "border-[rgba(201,168,76,0.35)]" : "border-[rgba(201,168,76,0.18)]"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1d3a6e] to-[#2a5298] flex items-center justify-center text-[#e8c97a] font-bold text-xs shrink-0">
                      {msg.from.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#f0eee8] text-sm">{msg.from}</span>
                        {!msg.read && <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]" />}
                      </div>
                      <p className="text-[#8a96b0] text-xs mt-0.5 leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                  <span className="text-[#8a96b0] text-[0.65rem] shrink-0 mt-0.5">{msg.time}</span>
                </div>
              </div>
            ))}
            <button className="w-full py-3 rounded-xl border border-dashed border-[rgba(201,168,76,0.18)] text-[#8a96b0] text-sm hover:text-[#e8c97a] hover:border-[#c9a84c] transition-all">
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