import Link from "next/link";

const steps = [
  {
    num: "01", title: "Recherchez",
    desc: "Filtrez par discipline, niveau, budget et disponibilité. Tous nos coachs sont vérifiés et certifiés.",
  },
  {
    num: "02", title: "Connectez",
    desc: "Échangez directement avec votre coach. Définissez ensemble vos objectifs et votre programme.",
  },
  {
    num: "03", title: "Progressez",
    desc: "Suivez vos performances, recevez des retours personnalisés et atteignez vos objectifs.",
  },
];

const pillars = [
  { title: "Vérification stricte", desc: "Tous les diplômes sont contrôlés avant validation du profil." },
  { title: "Coachs certifiés", desc: "Des professionnels qualifiés, pas des influenceurs." },
  { title: "Approche humaine", desc: "L'humain avant les algorithmes." },
  { title: "Flexible", desc: "Séance unique, suivi ponctuel ou long terme, vous choisissez." },
];

export default function Home() {
  return (
<main className="bg-gradient-to-br from-[#1c232d] via-[#162644] to-[#0c336f] text-[#f0eee8] font-sans overflow-x-hidden">
  <section className="relative flex items-center justify-center px-[5vw] py-20 overflow-hidden">
        <div className="relative z-10 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 text-[#c9a84c] text-xs font-semibold tracking-[2.5px] uppercase border border-[rgba(201,168,76,0.18)] px-4 py-1.5 rounded-full bg-[rgba(201,168,76,0.05)] mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] animate-pulse" />
            Coach'In, La révolution du coaching sportif en ligne
          </div>

          <h1
            className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.08] mb-6"
            style={{ fontFamily: "'Montserrat', serif" }}
          >
            Le coaching en ligne,&nbsp;
            <span className="text-[#e8c97a]">centré sur l&apos;humain</span>
          </h1>

          <p className="text-[#d1d5dc] text-base font-light leading-relaxed max-w-lg mx-auto mb-10">
            Connectez-vous avec des coachs diplômés et certifiés. Un accompagnement personnalisé pour atteindre vos objectifs sportifs.
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link
            className="px-8 py-3.5 rounded-lg bg-gradient-to-br from-[#c9a84c] to-[#e8c97a] text-[#0a0f1e] font-bold text-sm shadow-[0_4px_24px_rgba(201,168,76,0.22)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.32)] hover:-translate-y-0.5 transition-all"
            href="/catalog">
              Trouver un coach
            </Link>
            <button className="px-8 py-3.5 rounded-lg border border-[rgba(201,168,76,0.18)] text-[#e8c97a] font-medium text-sm hover:bg-[rgba(201,168,76,0.07)] hover:border-[#c9a84c] transition-all">
              Je suis coach →
            </button>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="flex items-center gap-2.5 text-[#c9a84c] text-[0.7rem] font-semibold tracking-[3px] uppercase mb-3">
              <span className="w-6 h-px bg-[#c9a84c]" />
              Processus
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#f0eee8] mb-2.5" style={{ fontFamily: "'Playfair Display', serif" }}>
              Comment ça marche ?
            </h2>
            <p className="text-[#8a96b0] text-sm leading-relaxed max-w-md">
              Un processus simple et transparent pour vous mettre en relation avec le coach idéal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border border-[rgba(201,168,76,0.18)] rounded-2xl overflow-hidden">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`relative p-10 bg-[#0d1528] hover:bg-[#111d36] transition-colors ${i > 0 ? "border-t md:border-t-0 md:border-l border-[rgba(201,168,76,0.18)]" : ""}`}
              >
                <span
                  className="absolute top-3 right-4 text-5xl font-black text-[rgba(201,168,76,0.08)] select-none leading-none"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {s.num}
                </span>
                <div className="text-base font-bold text-[#f0eee8] mb-2" style={{ fontFamily: "'Montserrat', serif" }}>
                  {s.title}
                </div>
                <p className="text-[0.84rem] text-[#8a96b0] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-[5vw] py-24 bg-[#0d1528]" id="coaches">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="flex items-center gap-2.5 text-[#c9a84c] text-[0.7rem] font-semibold tracking-[3px] uppercase mb-3">
              <span className="w-6 h-px bg-[#c9a84c]" />
              Professionnels
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#f0eee8] mb-2.5" style={{ fontFamily: "'Playfair Display', serif" }}>
              Coachs certifiés
            </h2>
            <p className="text-[#8a96b0] text-sm leading-relaxed max-w-md">
              Des professionnels diplômés et vérifiés, passionnés par votre réussite.
            </p>
          </div>

          <div className="border border-dashed border-[rgba(201,168,76,0.18)] rounded-2xl py-14 px-8 text-center bg-[rgba(201,168,76,0.02)]">
            <div className="w-12 h-12 rounded-full border border-[rgba(201,168,76,0.18)] bg-[rgba(201,168,76,0.08)] flex items-center justify-center mx-auto mb-3 text-[#e8c97a]">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <p className="text-[#8a96b0] text-sm leading-relaxed">
              Les profils coachs s&apos;afficheront ici..
            </p>
          </div>
        </div>
      </section>

      <section className="px-[5vw] py-24" id="why">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="flex items-center gap-2.5 text-[#c9a84c] text-[0.7rem] font-semibold tracking-[3px] uppercase mb-3">
              <span className="w-6 h-px bg-[#c9a84c]" />
              Notre différence
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#f0eee8]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Pourquoi Coach&apos;In ?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {pillars.map((p, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-[rgba(201,168,76,0.18)] bg-[#0d1528] hover:bg-[#111d36] hover:border-[rgba(201,168,76,0.35)] transition-all"
              >
                <div className="text-base font-bold text-[#f0eee8] mb-1.5" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {p.title}
                </div>
                <p className="text-[0.82rem] text-[#8a96b0] leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}