"use client";

import { useRef, useState } from "react";
import { DragSource, ProgramItem, dropEffectFor } from "../lib/types";
import { exportProgramPdf } from "../lib/exportPdf";
import { useFlip } from "../lib/useFlip";
import { Icon } from "../lib/styles";
import { ICON } from "../lib/icons";

interface ProgramBuilderProps {
  programName: string;
  setProgramName: (name: string) => void;
  program: ProgramItem[];
  totalSets: number;
  drag: DragSource | null;
  dropIndex: number | null;
  setDropIndex: (slot: number | null) => void;
  onDropAt: (e: React.DragEvent, slot: number) => void;
  onItemDragStart: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  updateItem: (instanceId: string, patch: Partial<ProgramItem>) => void;
  moveItem: (index: number, delta: number) => void;
  removeItem: (instanceId: string) => void;
  clearProgram: () => void;
}

const iconButtonClass =
  "rounded-md p-1.5 text-ink-muted transition-colors duration-150 hover:bg-gold-muted hover:text-gold disabled:pointer-events-none disabled:opacity-25";
const inlineInputClass =
  "rounded-md border border-gold-border bg-navy-950 px-1.5 py-0.5 text-center text-xs font-semibold text-ink transition-colors focus:border-gold focus:outline-none";

export function ProgramBuilder({
  programName,
  setProgramName,
  program,
  totalSets,
  drag,
  dropIndex,
  setDropIndex,
  onDropAt,
  onItemDragStart,
  onDragEnd,
  updateItem,
  moveItem,
  removeItem,
  clearProgram,
}: ProgramBuilderProps) {
  const [previewItem, setPreviewItem] = useState<ProgramItem | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const flipRef = useFlip<HTMLDivElement>(program);

  const downloadPdf = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await exportProgramPdf(programName, program);
    } catch {
      setExportError("L'export du PDF a échoué, réessayez.");
    } finally {
      setExporting(false);
    }
  };

  // Insertion slot under the cursor: before the first card whose middle is below it.
  // Uses layout offsets, not visual rects, so the cards parting around the slot can't make it flicker.
  const slotAt = (clientY: number) => {
    const list = listRef.current;
    if (!list) return program.length;
    const y = clientY - list.getBoundingClientRect().top;
    const cards = Array.from(list.querySelectorAll<HTMLElement>("[data-card]"));
    const index = cards.findIndex((card) => y < card.offsetTop + card.offsetHeight / 2);
    return index === -1 ? cards.length : index;
  };

  // Dropping an item right above or below itself would not move it
  const isNoopSlot = (slot: number) => drag?.kind === "item" && (slot === drag.from || slot === drag.from + 1);

  const onListDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = dropEffectFor(e);
    const slot = slotAt(e.clientY);
    const next = isNoopSlot(slot) ? null : slot;
    if (next !== dropIndex) setDropIndex(next);
  };

  const onListDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropIndex(null);
  };

  const onListDrop = (e: React.DragEvent) => onDropAt(e, slotAt(e.clientY));

  const startRemove = (instanceId: string) => setRemovingId(instanceId);

  const finishRemove = (instanceId: string) => {
    if (removingId !== instanceId) return;
    setRemovingId(null);
    removeItem(instanceId);
  };

  const isDragging = drag !== null;

  const dropLine = (slot: number) => (
    <div className="relative h-3 shrink-0" aria-hidden>
      <div
        className={`absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-gold to-gold-light shadow-glow transition-all duration-200 ease-out-soft ${
          dropIndex === slot ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
        }`}
      >
        <span className="absolute -left-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-gold" />
        <span className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-gold-light" />
      </div>
    </div>
  );

  return (
    <>
      <section className="flex flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
        <div className="flex flex-wrap items-end gap-3 p-6">
          <div className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
            <label className="text-[0.7rem] font-semibold text-ink-muted tracking-wide uppercase" htmlFor="program-name">
              Nom du programme
            </label>
            <input
              id="program-name"
              type="text"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              placeholder="Nom du programme"
              className="w-full border-b border-gold-border bg-transparent font-display text-2xl font-bold text-ink transition-colors focus:border-gold focus:outline-none"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {program.length > 0 && (
              <>
                <span className="mr-1 rounded-md border border-gold-border bg-gold-muted px-2.5 py-1.5 text-[0.7rem] font-semibold text-gold">
                  {program.length} exercice{program.length > 1 ? "s" : ""} · {totalSets} séries
                </span>
                <button
                  type="button"
                  onClick={clearProgram}
                  className="rounded-lg border border-gold-border p-2 text-ink-muted transition-all hover:border-danger-line hover:bg-danger-surface hover:text-danger-ink"
                  title="Vider le programme"
                >
                  <Icon path={ICON.trash} size={16} />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={downloadPdf}
              disabled={exporting || program.length === 0}
              title={program.length === 0 ? "Ajoutez des exercices pour exporter" : "Télécharger le programme en PDF"}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-gold to-gold-light px-4 py-2 text-sm font-bold text-on-accent transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:pointer-events-none disabled:opacity-50"
            >
              <Icon path={ICON.download} size={15} />
              {exporting ? "Génération…" : "Télécharger le PDF"}
            </button>
          </div>
        </div>

        {exportError && <p className="px-6 text-sm text-danger-ink">{exportError}</p>}

        <p className="px-5 pt-2 text-sm text-ink-muted">
          {program.length === 0
            ? "Programme vide (nullos bosse un peu, c'est quoi ça espèce de flemmard, no bread no gain)"
            : "Glissez les exercices pour les réorganiser, ou déposez-en un nouveau où vous voulez."}
        </p>

        <div
          ref={listRef}
          onDragOver={onListDragOver}
          onDragLeave={onListDragLeave}
          onDrop={onListDrop}
          className={`relative m-3 flex flex-1 flex-col rounded-2xl p-2 transition-colors duration-200 ${
            isDragging && program.length > 0 ? "bg-gold-faint ring-1 ring-gold-border" : "ring-1 ring-transparent"
          }`}
        >
          {program.length === 0 ? (
            <div
              className={`flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 py-20 text-center transition-all duration-200 ease-out-soft ${
                dropIndex === 0
                  ? "scale-[1.01] border-gold bg-gold-muted"
                  : isDragging
                    ? "border-gold-active bg-navy-800"
                    : "border-gold-border bg-navy-800"
              }`}
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full border border-gold-border bg-gold-muted text-gold-light transition-transform duration-200 ease-out-soft ${
                  dropIndex === 0 ? "scale-110" : ""
                }`}
              >
                <Icon path={dropIndex === 0 ? ICON.plus : ICON.book} size={22} />
              </div>
              <p className="text-sm text-ink-muted">
                {dropIndex === 0 ? "Relâchez pour ajouter l'exercice" : "Déposez des exercices ici pour construire votre séance."}
              </p>
            </div>
          ) : (
            <>
              {program.map((item, index) => {
                const isSource = drag?.kind === "item" && drag.from === index;
                const isRemoving = removingId === item.instanceId;
                // Cards part slightly around the active drop line
                const shift = dropIndex === null ? "" : index < dropIndex ? "-translate-y-0.5" : "translate-y-0.5";

                return (
                  <div key={item.instanceId}>
                    {dropLine(index)}
                    <div
                      ref={flipRef(item.instanceId)}
                      data-card
                      draggable={!isRemoving}
                      onDragStart={(e) => onItemDragStart(e, index)}
                      onDragEnd={onDragEnd}
                      onAnimationEnd={() => finishRemove(item.instanceId)}
                      className={`group flex cursor-grab items-center gap-3 rounded-xl border bg-navy-900 p-2.5 transition-[translate,scale,opacity,border-color,background-color,box-shadow] duration-200 ease-out-soft hover:bg-navy-800 hover:shadow-glow active:cursor-grabbing ${shift} ${
                        isRemoving ? "pointer-events-none animate-item-out" : "animate-item-in"
                      } ${
                        isSource
                          ? "scale-[0.98] border-dashed border-gold opacity-40"
                          : "border-gold-border hover:border-gold-active"
                      }`}
                    >
                      <div className="flex w-5 shrink-0 flex-col items-center gap-0.5 text-ink-muted transition-colors group-hover:text-gold">
                        <Icon path={ICON.grip} size={14} />
                        <span className="font-display text-xs font-bold text-gold">{index + 1}</span>
                      </div>

                      {item.imageUrl ? (
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gold-border">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            draggable={false}
                            className="h-full w-full object-cover transition-transform duration-300 ease-out-soft group-hover:scale-105"
                          />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-gold-border bg-navy-800 text-ink-muted">
                          <Icon path={ICON.image} size={18} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate text-sm font-bold text-ink">{item.title}</h3>
                          {item.videoUrl && (
                            <a
                              href={item.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              draggable={false}
                              title="Voir la démonstration"
                              className="shrink-0 text-gold transition-colors hover:text-gold-light"
                            >
                              <Icon path={ICON.link} size={12} />
                            </a>
                          )}
                        </div>
                        {item.description && (
                          <p className="truncate text-[0.72rem] text-ink-muted">{item.description}</p>
                        )}
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={item.sets}
                            onChange={(e) => updateItem(item.instanceId, { sets: Math.max(1, Number(e.target.value) || 1) })}
                            title="Séries"
                            className={`${inlineInputClass} w-10`}
                          />
                          <span className="text-ink-muted">×</span>
                          <input
                            type="text"
                            value={item.reps}
                            onChange={(e) => updateItem(item.instanceId, { reps: e.target.value })}
                            title="Répétitions"
                            className={`${inlineInputClass} w-14`}
                          />
                          <span className="text-[0.68rem] text-ink-muted">séries × reps</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity duration-200 group-hover:opacity-100">
                        <button type="button" onClick={() => setPreviewItem(item)} title="Aperçu complet" className={iconButtonClass}>
                          <Icon path={ICON.eye} size={14} />
                        </button>
                        <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0} title="Monter" className={iconButtonClass}>
                          <Icon path={ICON.up} size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, 1)}
                          disabled={index === program.length - 1}
                          title="Descendre"
                          className={iconButtonClass}
                        >
                          <Icon path={ICON.down} size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => startRemove(item.instanceId)}
                          title="Retirer du programme"
                          className="rounded-md p-1.5 text-ink-muted transition-colors duration-150 hover:bg-danger-surface hover:text-danger-ink"
                        >
                          <Icon path={ICON.trash} size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {dropLine(program.length)}
              {/* Fills the rest of the panel so a drop anywhere below the cards still lands at the end */}
              <div className="min-h-16 flex-1" />
            </>
          )}
        </div>
      </section>

      {previewItem && (
        <>
          <div className="fixed inset-0 z-40 bg-scrim animate-item-in" onClick={() => setPreviewItem(null)} />
          <div className="fixed top-1/2 left-1/2 z-50 max-h-[90vh] w-[min(32rem,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-gold-border bg-navy-900 shadow-glow">
            <div className="flex items-start justify-between gap-3 border-b border-gold-border px-6 py-5">
              <div className="min-w-0">
                <h2 className="font-display text-xl font-bold text-ink">{previewItem.title}</h2>
                <p className="text-sm text-ink-muted">Aperçu de l&apos;exercice</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewItem(null)}
                title="Fermer"
                className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-gold-muted hover:text-gold"
              >
                <Icon path={ICON.close} size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-4 px-6 py-5">
              {previewItem.imageUrl ? (
                <div className="overflow-hidden rounded-xl border border-gold-border">
                  <img src={previewItem.imageUrl} alt={previewItem.title} className="h-64 w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-48 items-center justify-center rounded-xl border border-gold-border bg-navy-800 text-ink-muted">
                  <Icon path={ICON.image} size={32} />
                </div>
              )}
              <div>
                <p className="text-[0.7rem] font-semibold text-ink-muted tracking-wide uppercase">Description</p>
                <p className="mt-1 text-sm leading-relaxed text-ink">{previewItem.description || "Aucune description"}</p>
              </div>
              {previewItem.videoUrl && (
                <a
                  href={previewItem.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-gold-border px-3 py-2 text-sm text-gold transition-colors hover:bg-gold-muted"
                >
                  <Icon path={ICON.link} size={14} />
                  Voir la démonstration vidéo
                </a>
              )}
              <div className="rounded-lg border border-gold-border bg-navy-950 px-3 py-2 text-sm text-ink">
                <span className="font-semibold">{previewItem.sets}</span> série{previewItem.sets > 1 ? "s" : ""} ×{" "}
                <span className="font-semibold">{previewItem.reps}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
