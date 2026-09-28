"use client";

import { useState, useEffect } from "react";

interface Tag {
  id: string;
  name: string;
  category?: {
    id: string;
    name: string;
  };
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface Coach {
  id: string;
  specialty: string;
  bio: string | null;
  isApproved: boolean;
  tags: Tag[];
  user: User;
}

export default function CoachesCatalog() {
  const [search, setSearch] = useState("");
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/coachs`);

        if (!res.ok) {
          throw new Error("Failed to fetch coaches");
        }

        const data = await res.json();
        setCoaches(data);
      } catch (err) {
        setError("Impossible de charger les coachs. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    fetchCoaches();
  }, []);

  const filtered = coaches.filter((c) =>
    c.user?.username?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-600 to-navy-500 text-ink flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-10 w-10 text-gold mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <p className="text-ink-muted">Chargement des coachs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-800 text-ink px-[5vw] py-16">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <div className="flex items-center gap-2.5 text-gold text-[0.7rem] font-semibold tracking-[3px] uppercase mb-3">
            <span className="w-6 h-px bg-gold" />
            Professionnels certifiés
          </div><h1 className="font-display text-4xl md:text-5xl font-black text-ink mb-3">
            Nos coachs
          </h1>
          <p className="text-ink-muted text-sm leading-relaxed max-w-md">
            Tous nos coachs sont diplômés et vérifiés. Trouvez le professionnel
            qui correspond à vos objectifs.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-danger-surface border border-danger-line text-danger-ink">
            {error}
          </div>
        )}

        <div className="relative mb-10 max-w-md">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-ink-muted">
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Rechercher un coach par nom..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-navy-900 border border-gold-border text-ink text-sm placeholder-ink-muted focus:outline-none focus:border-gold transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-3 flex items-center text-ink-muted hover:text-gold-light transition-colors"
            >
              <svg
                width="14"
                height="14"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        <p className="text-ink-muted text-xs mb-6 tracking-wide">
          {filtered.length} coach{filtered.length > 1 ? "s" : ""} trouvé
          {filtered.length > 1 ? "s" : ""}
          {search && (
            <span className="text-gold"> pour &quot;{search}&quot;</span>
          )}
        </p>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((coach) => (
              <div
                key={coach.id}
                className="group border border-gold-border rounded-2xl overflow-hidden bg-navy-900 hover:bg-navy-800 hover:border-gold-active hover:-translate-y-1 transition-all duration-200 cursor-pointer"
              >
                <div className="relative h-28 bg-gradient-to-br from-navy-800 to-navy-900 flex items-end px-5 pb-0"><div className="font-display w-14 h-14 rounded-full bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-navy-950 font-black text-lg translate-y-7 border-4 border-navy-900">
                    {coach.user?.username
                      ?.split(" ")
                      .map((n) => n[0]?.toUpperCase())
                      .join("") || "?"}
                  </div>
                </div>

                <div className="pt-9 px-5 pb-5"><div className="font-display font-bold text-ink text-base mb-0.5">
                    {coach.user?.username || "Coach"}
                  </div>
                  <div className="text-gold text-xs font-medium mb-3">
                    {coach.specialty}
                  </div>
                  <p className="text-ink-muted text-[0.82rem] leading-relaxed mb-4">
                    {coach.bio || "Aucune biographie disponible."}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {coach.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="text-[0.68rem] font-medium px-2 py-0.5 rounded-md bg-gold-muted border border-gold-soft text-gold"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>

                  <button className="text-[0.75rem] font-semibold text-gold hover:text-gold-light transition-colors">
                    Voir le profil →
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-gold-border rounded-2xl bg-gold-faint">
            <div className="w-12 h-12 rounded-full border border-gold-border bg-gold-muted flex items-center justify-center mx-auto mb-4 text-gold-light">
              <svg
                width="22"
                height="22"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              </svg>
            </div>
            <p className="text-ink-muted text-sm">
              Aucun coach trouvé pour &quot;{search}&quot;
            </p>
            <button
              onClick={() => setSearch("")}
              className="mt-3 text-gold text-xs hover:text-gold-light transition-colors"
            >
              Réinitialiser la recherche
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
