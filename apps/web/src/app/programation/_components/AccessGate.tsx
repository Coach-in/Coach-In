import Link from "next/link";
import { Icon } from "../lib/styles";
import { ICON } from "../lib/icons";

type GateKind = "loading" | "guest" | "coach";

const CONTENT: Record<Exclude<GateKind, "loading">, { title: string; text: string; cta: string; href: string }> = {
  guest: {
    title: "Connectez-vous pour programmer",
    text: "La création de programmes est réservée aux sportifs. Connectez-vous pour construire vos séances et les retrouver dans votre profil.",
    cta: "Se connecter",
    href: "/login",
  },
  coach: {
    title: "Espace réservé aux sportifs",
    text: "La programmation libre est disponible pour les comptes sportifs. Les coachs gèrent les programmes de leurs athlètes depuis leur espace.",
    cta: "Retour à l'accueil",
    href: "/",
  },
};

export function AccessGate({ kind }: { kind: GateKind }) {
  if (kind === "loading") {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-navy-950">
        <div className="flex flex-col items-center gap-3 animate-item-in">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-gold-soft border-t-gold" />
          <p className="text-sm text-ink-muted">Chargement…</p>
        </div>
      </div>
    );
  }

  const content = CONTENT[kind];
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-navy-950 px-4">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-2xl border border-gold-border bg-navy-900 px-8 py-10 text-center shadow-glow animate-item-in">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold-border bg-gold-muted text-gold-light">
          <Icon path={ICON.book} size={22} />
        </div>
        <h1 className="font-display text-xl font-bold text-ink">{content.title}</h1>
        <p className="text-sm leading-relaxed text-ink-muted">{content.text}</p>
        <Link
          href={content.href}
          className="rounded-lg bg-gradient-to-br from-gold to-gold-light px-5 py-2.5 text-sm font-bold text-on-accent transition-all hover:-translate-y-0.5 hover:shadow-glow"
        >
          {content.cta}
        </Link>
      </div>
    </div>
  );
}
