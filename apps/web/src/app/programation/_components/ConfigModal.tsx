"use client";

import { useState } from "react";
import { Exercise, DEFAULT_SETS, DEFAULT_REPS } from "../lib/types";
import { Icon } from "../lib/styles";
import { ICON } from "../lib/icons";
import { inputClass, labelClass } from "../lib/styles";

export function ConfigModal({
  exercise,
  onCancel,
  onConfirm,
}: {
  exercise: Exercise;
  onCancel: () => void;
  onConfirm: (sets: number, reps: string) => void;
}) {
  const [sets, setSets] = useState(DEFAULT_SETS);
  const [reps, setReps] = useState(DEFAULT_REPS);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(Math.max(1, Math.min(20, sets || DEFAULT_SETS)), reps.trim() || DEFAULT_REPS);
  };

  return (
    <>
      <div className="fixed inset-0 bg-scrim z-40" onClick={onCancel} />
      <form
        onSubmit={submit}
        className="fixed top-1/2 left-1/2 z-50 w-[min(26rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gold-border bg-navy-900 shadow-glow"
      >
        <div className="flex items-start gap-3 border-b border-gold-border px-6 py-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-muted border border-gold-border text-gold">
            <Icon path={ICON.clock} size={17} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-ink">
              Configurer l&apos;exercice
            </h2>
            <p className="truncate text-sm text-ink-muted">{exercise.title}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">
          <p className="text-sm text-ink-muted">
            Nouveau exercise ! Indiquez les séries et répétitions.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="cfg-sets">
                Séries
              </label>
              <input
                id="cfg-sets"
                type="number"
                min={1}
                max={100}
                value={sets}
                onChange={(e) => setSets(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass} htmlFor="cfg-reps">
                Reps
              </label>
              <input
                id="cfg-reps"
                type="text"
                placeholder="8-12"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gold-border px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-gold-border py-2.5 text-sm font-medium text-ink-muted transition-all hover:border-gold hover:text-gold-light"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-gradient-to-br from-gold to-gold-light py-2.5 text-sm font-bold text-on-accent transition-all hover:-translate-y-0.5"
          >
            Ajouter au programme
          </button>
        </div>
      </form>
    </>
  );
}
