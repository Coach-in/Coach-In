"use client";

import { useRef, useState } from "react";
import { Exercise } from "../lib/types";
import { compressImageFile } from "../lib/image";
import { Icon } from "../lib/styles";
import { ICON } from "../lib/icons";
import { inputClass, labelClass } from "../lib/styles";

interface LibrarySidebarProps {
  exercises: Exercise[];
  usedCount: (id: string) => number;
  onCreateExercise: (exercise: Omit<Exercise, "id">) => void;
  onAddToProgram: (exercise: Exercise) => void;
  onRemoveExercise: (id: string) => void;
  onSetExerciseImage: (id: string, imageUrl: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  draggingId: string | null;
}

export function LibrarySidebar({
  exercises,
  usedCount,
  onCreateExercise,
  onAddToProgram,
  onRemoveExercise,
  onSetExerciseImage,
  onDragStart,
  onDragEnd,
  draggingId,
}: LibrarySidebarProps) {
  const [draft, setDraft] = useState({ title: "", description: "", videoUrl: "", imageUrl: "" });
  const [compressing, setCompressing] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const draftFileInput = useRef<HTMLInputElement>(null);

  // Every upload is downscaled before being kept, so the program and the PDF stay light
  const readImage = async (file: File | undefined, onReady: (dataUrl: string) => void) => {
    if (!file) return;
    setCompressing(true);
    setImageError(null);
    try {
      onReady(await compressImageFile(file));
    } catch {
      setImageError("Impossible de lire cette image.");
    } finally {
      setCompressing(false);
    }
  };

  const clearDraftImage = () => {
    setDraft((d) => ({ ...d, imageUrl: "" }));
    if (draftFileInput.current) draftFileInput.current.value = "";
  };

  const createExercise = (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.title.trim();
    if (!title) return;
    onCreateExercise({
      title,
      description: draft.description.trim(),
      videoUrl: draft.videoUrl.trim(),
      imageUrl: draft.imageUrl.trim() || undefined,
    });
    setDraft({ title: "", description: "", videoUrl: "", imageUrl: "" });
    if (draftFileInput.current) draftFileInput.current.value = "";
  };

  return (
    <aside className="flex shrink-0 flex-col border-b border-gold-border lg:w-[350px] lg:min-h-0 lg:overflow-y-auto lg:border-b-0 lg:border-r print:hidden">
      <div className="border-b border-gold-border p-5">
        <h1 className="font-display text-2xl font-bold text-ink">Bibliothèque</h1>
        <p className="mt-1 text-sm font-semibold text-ink-muted">
          Glissez un exercice vers la droite pour l&apos;ajouter au programme.
        </p>
      </div>

      <form onSubmit={createExercise} className="flex flex-col gap-3 border-b border-gold-border p-5">
        <p className="text-[0.7rem] font-semibold tracking-[2px] text-gold uppercase">
          Créer un exercice
        </p>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="ex-title">
            Nom <span className="text-danger-ink">*</span>
          </label>
          <input
            id="ex-title"
            type="text"
            placeholder="ex : Squat bulgare"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            required
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="ex-desc">
            Description
          </label>
          <textarea
            id="ex-desc"
            rows={2}
            placeholder="Points techniques, erreurs fréquentes..."
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="ex-video">
            Lien vidéo
          </label>
          <input
            id="ex-video"
            type="url"
            placeholder="https://…"
            value={draft.videoUrl}
            onChange={(e) => setDraft({ ...draft, videoUrl: e.target.value })}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="ex-image">
            Image
          </label>
          <div className="flex items-center gap-3">
            {draft.imageUrl ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gold-border">
                <img src={draft.imageUrl} alt="Aperçu" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-gold-border bg-navy-800 text-ink-muted">
                <Icon path={ICON.image} size={18} />
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <label
                htmlFor="ex-image"
                className="cursor-pointer rounded-lg border border-gold-border px-3 py-2 text-center text-xs font-semibold text-gold transition-colors hover:bg-gold-muted"
              >
                {compressing ? "Compression…" : draft.imageUrl ? "Changer l'image" : "Choisir une image"}
              </label>
              {draft.imageUrl && (
                <button
                  type="button"
                  onClick={clearDraftImage}
                  className="text-left text-[0.7rem] text-ink-muted transition-colors hover:text-danger-ink"
                >
                  Retirer l&apos;image
                </button>
              )}
            </div>
            <input
              ref={draftFileInput}
              id="ex-image"
              type="file"
              accept="image/*"
              onChange={(e) => readImage(e.target.files?.[0], (imageUrl) => setDraft((d) => ({ ...d, imageUrl })))}
              className="sr-only"
            />
          </div>
          {imageError && <p className="text-[0.7rem] text-danger-ink">{imageError}</p>}
        </div>

        <button
          type="submit"
          disabled={compressing}
          className="mt-1 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-gold to-gold-light py-2.5 text-sm font-bold text-on-accent transition-all hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
        >
          <Icon path={ICON.plus} size={15} />
          Créer l&apos;exercice
        </button>
      </form>

      <ul className="flex flex-col gap-2 p-5">
        {exercises.length === 0 && (
          <li className="py-8 text-center text-sm text-ink-muted">Aucun exercice. Créez-en un ci-dessus.</li>
        )}

        {exercises.map((exercise) => {
          const uses = usedCount(exercise.id);
          return (
            <li
              key={exercise.id}
              draggable
              onDragStart={(e) => onDragStart(e, exercise.id)}
              onDragEnd={onDragEnd}
              className={`group flex cursor-grab items-center gap-3 rounded-xl border bg-navy-900 p-2.5 transition-all duration-200 ease-out-soft hover:-translate-y-0.5 hover:border-gold-active hover:bg-navy-800 hover:shadow-glow active:cursor-grabbing ${
                draggingId === exercise.id ? "scale-95 border-gold opacity-50" : "border-gold-border"
              }`}
            >
              <label
                title={exercise.imageUrl ? "Changer l'image" : "Ajouter une image"}
                className="h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-gold-border transition-colors hover:border-gold"
              >
                {exercise.imageUrl ? (
                  <img src={exercise.imageUrl} alt={exercise.title} draggable={false} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-navy-800 text-ink-muted">
                    <Icon path={ICON.image} size={18} />
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    readImage(e.target.files?.[0], (imageUrl) => onSetExerciseImage(exercise.id, imageUrl));
                    e.target.value = "";
                  }}
                  className="sr-only"
                />
              </label>

              <span className="text-ink-muted transition-colors group-hover:text-gold">
                <Icon path={ICON.grip} size={16} />
              </span>

              {/* Not a <button>: Firefox won't start a drag from inside one. The "+" button covers keyboard use */}
              <div onClick={() => onAddToProgram(exercise)} title="Ajouter au programme" className="min-w-0 flex-1 cursor-pointer">
                <span className="block truncate text-sm font-semibold text-ink">{exercise.title}</span>
                <span className="block text-[0.68rem] text-ink-muted">
                  {uses > 0 ? `${uses}× dans le programme` : "Non utilisé"}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onAddToProgram(exercise)}
                  title="Ajouter au programme"
                  className="rounded-lg border border-gold-border p-1.5 text-gold transition-colors hover:bg-gold-muted"
                >
                  <Icon path={ICON.plus} size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveExercise(exercise.id)}
                  title="Retirer de la bibliothèque"
                  className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-danger-surface hover:text-danger-ink"
                >
                  <Icon path={ICON.trash} size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
