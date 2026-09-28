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
<main className="bg-navy-600 text-ink font-sans overflow-x-hidden">
  <section className="relative flex items-center justify-center px-[5vw] py-20 overflow-hidden">
        <div className="relative z-10 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 text-gold text-xs font-semibold tracking-[2.5px] uppercase border border-gold-border px-4 py-1.5 rounded-full bg-gold-faint mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            Coach&apos;In, La révolution du coaching sportif en ligne
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.08] mb-6">
            Le coaching en ligne,&nbsp;
            <span className="text-gold-light">centré sur l&apos;humain</span>
          </h1>

          <p className="text-ink-body text-base font-light leading-relaxed max-w-lg mx-auto mb-10">
            Connectez-vous avec des coachs diplômés et certifiés. Un accompagnement personnalisé pour atteindre vos objectifs sportifs.
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link
            className="px-8 py-3.5 rounded-lg bg-gradient-to-br from-gold to-gold-light text-navy-950 font-bold text-sm shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all"
            href="/catalog">
              Trouver un coach
            </Link>
            <button className="px-8 py-3.5 rounded-lg border border-gold-border text-gold-light font-medium text-sm hover:bg-gold-muted hover:border-gold transition-all">
              Je suis coach →
            </button>
          </div>
        </div>
      </section>

      <section className="px-[5vw] py-24" id="Demo">
          <div className="mb-12">
            <h2 className="font-display text-3xl text-center md:text-4xl font-bold text-ink mb-2.5">
              Votre Programme Personnalisé !
            </h2>
            <p className="text-ink-muted text-center text-sm leading-relaxed">
              Une démonstration rapide pour vous montrer les futurs fonctionnalités de notre plateforme.
            </p>
            <div className="flex justify-center">
            <Link
                className="px-8 py-3.5 my-4 rounded-lg bg-gradient-to-br from-gold to-gold-light text-navy-950 font-bold text-sm shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all"
                href="/programation">
                  Créer mon programme
                </Link>
            </div>
          </div>
      </section>

      <section className="py-12">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="flex items-center gap-2.5 text-gold text-[0.7rem] font-semibold tracking-[3px] uppercase mb-3">
              <span className="w-6 h-px bg-gold" />
              Processus
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-2.5">
              Comment ça marche ?
            </h2>
            <p className="text-ink-muted text-sm leading-relaxed max-w-md">
              Un processus simple et transparent pour vous mettre en relation avec le coach idéal.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 border border-gold-border rounded-2xl overflow-hidden">
            {steps.map((s, i) => (
              <div
                key={i}
                className={`relative p-10 bg-navy-900 hover:bg-navy-800 transition-colors ${i > 0 ? "border-t md:border-t-0 md:border-l border-gold-border" : ""}`}
              ><span className="font-display absolute top-3 right-4 text-5xl font-black text-gold-muted select-none leading-none">
                  {s.num}
                </span>
                <div className="text-base font-bold text-ink mb-2">
                  {s.title}
                </div>
                <p className="text-[0.84rem] text-ink-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-[5vw] py-24 bg-navy-900" id="coaches">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="flex items-center gap-2.5 text-gold text-[0.7rem] font-semibold tracking-[3px] uppercase mb-3">
              <span className="w-6 h-px bg-gold" />
              Professionnels
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink mb-2.5">
              Coachs certifiés
            </h2>
            <p className="text-ink-muted text-sm leading-relaxed max-w-md">
              Des professionnels diplômés et vérifiés, passionnés par votre réussite.
            </p>
          </div>

          <div className="border border-dashed border-gold-border rounded-2xl py-14 px-8 text-center bg-gold-faint">
            <div className="w-12 h-12 rounded-full border border-gold-border bg-gold-muted flex items-center justify-center mx-auto mb-3 text-gold-light">
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
            </div>
            <p className="text-ink-muted text-sm leading-relaxed">
              Les profils coachs s&apos;afficheront ici..
            </p>
          </div>
        </div>
      </section>

      <section className="px-[5vw] py-24" id="why">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12">
            <div className="flex items-center gap-2.5 text-gold text-[0.7rem] font-semibold tracking-[3px] uppercase mb-3">
              <span className="w-6 h-px bg-gold" />
              Notre différence
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-ink">
              Pourquoi Coach&apos;In ?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {pillars.map((p, i) => (
              <div
                key={i}
                className="p-6 rounded-xl border border-gold-border bg-navy-900 hover:bg-navy-800 hover:border-gold-active transition-all"
              >
                <div className="font-display text-base font-bold text-ink mb-1.5">
                  {p.title}
                </div>
                <p className="text-[0.82rem] text-ink-muted leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}