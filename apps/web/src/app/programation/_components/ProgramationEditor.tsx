"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DragSource, Exercise, ProgramItem, EXERCISE_MIME, INSTANCE_MIME } from "../lib/types";
import { api, ApiError, ApiExercise, Session } from "../lib/api";
import { apiToExercise, itemsToDays, programmeToItems, todayIso } from "../lib/programmes";
import { compressImage, dataUrlToBlob } from "../lib/image";
import { LibrarySidebar } from "./LibrarySidebar";
import { ProgramBuilder } from "./ProgramBuilder";
import { ConfigModal } from "./ConfigModal";
import exercisesData from "../exercises.json";

const DEFAULT_NAME = "Mon programme";

// Default exercises: shown to everyone, copied to the athlete's account when first saved
const TEMPLATES: Exercise[] = (exercisesData as Exercise[]).map((ex) => ({ ...ex, isTemplate: true }));

type Notice = { kind: "success" | "error"; text: string };

const sameTitle = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// A template is hidden once the athlete owns an exercise with the same name (usually its copy)
const mergeLibrary = (own: Exercise[]) => [
  ...TEMPLATES.filter((t) => !own.some((e) => sameTitle(e.title, t.title))),
  ...own,
];

// What gets saved: used to know whether there are unsaved changes
const snapshotOf = (name: string, items: ProgramItem[]) =>
  JSON.stringify([name.trim(), items.map((i) => [i.exerciseId, i.sets, i.reps])]);

const errorMessage = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

const toCreateBody = (exercise: Omit<Exercise, "id">) => ({
  name: exercise.title,
  description: exercise.description || undefined,
});

export function ProgramationEditor({ session }: { session: Session }) {
  const { token } = session;
  const router = useRouter();
  const programmeId = useSearchParams().get("id");

  const [exercises, setExercises] = useState<Exercise[]>(TEMPLATES);
  const [program, setProgram] = useState<ProgramItem[]>([]);
  const [programName, setProgramName] = useState(DEFAULT_NAME);

  // Id of the programme currently shown; differs from the URL while it loads
  const [loadedId, setLoadedId] = useState<string | null>(null);
  // Programmes written by a coach can be viewed and downloaded, not saved
  const [readOnly, setReadOnly] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  // Exercise waiting for its sets/reps, and where it will be inserted
  const [pending, setPending] = useState<{ exercise: Exercise; index?: number } | null>(null);
  // What is being dragged (drives the visuals) and the insertion slot under the cursor (0..program.length)
  const [drag, setDrag] = useState<DragSource | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const loadingProgramme = programmeId !== null && programmeId !== loadedId;
  const dirty = savedSnapshot === null ? program.length > 0 : snapshotOf(programName, program) !== savedSnapshot;

  useEffect(() => {
    api
      .listExercises(token)
      .then((own) => setExercises(mergeLibrary(own.map(apiToExercise))))
      .catch(() => setNotice({ kind: "error", text: "Impossible de charger vos exercices." }));
  }, [token]);

  useEffect(() => {
    if (!programmeId || programmeId === loadedId) return;
    let cancelled = false;

    api
      .getProgramme(token, programmeId)
      .then((programme) => {
        // Also ignore it if the URL moved on meanwhile (e.g. "Nouveau" clicked while it loaded)
        if (cancelled || new URLSearchParams(window.location.search).get("id") !== programme.id) return;
        const items = programmeToItems(programme);
        setProgram(items);
        setProgramName(programme.name);
        setReadOnly(programme.coach !== null);
        setSavedSnapshot(snapshotOf(programme.name, items));
        setLoadedId(programme.id);
      })
      .catch((err) => {
        if (cancelled) return;
        const missing = err instanceof ApiError && (err.status === 404 || err.status === 403 || err.status === 400);
        setNotice({ kind: "error", text: missing ? "Programme introuvable." : errorMessage(err, "Chargement impossible.") });
        router.replace("/programation");
      });

    return () => {
      cancelled = true;
    };
  }, [programmeId, loadedId, token, router]);

  // Warn before leaving the page with unsaved work
  useEffect(() => {
    if (!dirty || readOnly) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, readOnly]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4500);
    return () => clearTimeout(timer);
  }, [notice]);

  // ---------- Exercises (library) ----------

  const replaceExercise = (oldId: string, exercise: Exercise) => {
    setExercises((prev) => prev.map((x) => (x.id === oldId ? exercise : x)));
    setProgram((prev) =>
      prev.map((i) => (i.exerciseId === oldId ? { ...i, exerciseId: exercise.id, imageUrl: exercise.imageUrl } : i)),
    );
  };

  const uploadImage = async (exerciseId: string, image: string) => {
    // Uploads are already downscaled data URLs; template images are files in /public, compressed here
    const dataUrl = image.startsWith("data:") ? image : await compressImage(image);
    return api.uploadExerciseImage(token, exerciseId, await dataUrlToBlob(dataUrl));
  };

  // Copies a default exercise (and its image) into the athlete's account
  const materialize = async (template: Exercise, imageOverride?: string): Promise<Exercise> => {
    let remote: ApiExercise;
    try {
      remote = await api.createExercise(token, toCreateBody(template));
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 409)) throw err;
      // Already copied (e.g. from another tab): reuse that one
      const existing = (await api.listExercises(token)).find((x) => sameTitle(x.name, template.title));
      if (!existing) throw err;
      remote = existing;
    }

    const image = imageOverride ?? template.imageUrl;
    if (image && (imageOverride || !remote.imageUrl)) remote = await uploadImage(remote.id, image);

    const exercise = { ...apiToExercise(remote), imageUrl: image ?? remote.imageUrl ?? undefined };
    replaceExercise(template.id, exercise);
    return exercise;
  };

  const createExercise = async (data: Omit<Exercise, "id">) => {
    const remote = await api.createExercise(token, toCreateBody(data));
    let created = apiToExercise(remote);

    if (data.imageUrl) {
      try {
        created = apiToExercise(await uploadImage(remote.id, data.imageUrl));
      } catch {
        setNotice({ kind: "error", text: "Exercice créé, mais l'image n'a pas pu être envoyée." });
      }
    }

    const exercise = { ...created, imageUrl: data.imageUrl ?? created.imageUrl };
    setExercises((prev) => [...prev.filter((x) => !(x.isTemplate && sameTitle(x.title, exercise.title))), exercise]);
  };

  const removeExercise = async (id: string) => {
    if (program.some((i) => i.exerciseId === id)) {
      setNotice({ kind: "error", text: "Retirez d'abord cet exercice du programme." });
      return;
    }
    try {
      await api.deleteExercise(token, id);
      setExercises((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      const used = err instanceof ApiError && err.status === 409;
      setNotice({
        kind: "error",
        text: used ? "Cet exercice est utilisé dans un programme enregistré." : errorMessage(err, "Suppression impossible."),
      });
    }
  };

  const setExerciseImage = async (id: string, imageUrl: string) => {
    const exercise = exercises.find((x) => x.id === id);
    if (!exercise) return;
    try {
      if (exercise.isTemplate) {
        await materialize(exercise, imageUrl);
      } else {
        await uploadImage(id, imageUrl);
        replaceExercise(id, { ...exercise, imageUrl });
      }
    } catch (err) {
      setNotice({ kind: "error", text: errorMessage(err, "L'image n'a pas pu être enregistrée.") });
    }
  };

  // ---------- Saving ----------

  const save = async () => {
    if (readOnly || saving || program.length === 0) return;
    setSaving(true);
    try {
      // Default exercises must exist in the account before a programme can reference them
      const ids = new Map<string, string>();
      for (const template of exercises.filter((x) => x.isTemplate && program.some((i) => i.exerciseId === x.id))) {
        ids.set(template.id, (await materialize(template)).id);
      }
      const items = program.map((i) => ({ ...i, exerciseId: ids.get(i.exerciseId) ?? i.exerciseId }));
      const name = programName.trim() || DEFAULT_NAME;
      const days = itemsToDays(items);

      if (programmeId) {
        await api.renameProgramme(token, programmeId, name);
        await api.replaceProgrammeDays(token, programmeId, days);
      } else {
        const created = await api.createProgramme(token, { name, startDate: todayIso(), days });
        // Mark it as loaded first so the URL change below doesn't refetch it
        setLoadedId(created.id);
        router.replace(`/programation?id=${created.id}`, { scroll: false });
      }

      setSavedSnapshot(snapshotOf(name, items));
      setNotice({ kind: "success", text: "Programme enregistré dans votre profil." });
    } catch (err) {
      setNotice({ kind: "error", text: errorMessage(err, "L'enregistrement a échoué.") });
    } finally {
      setSaving(false);
    }
  };

  const startNew = () => {
    if (dirty && !readOnly && !window.confirm("Les modifications non enregistrées seront perdues. Continuer ?")) return;
    setProgram([]);
    setProgramName(DEFAULT_NAME);
    setSavedSnapshot(null);
    setReadOnly(false);
    setLoadedId(null);
    router.push("/programation");
  };

  // ---------- Program editing ----------

  // Shared by the "+" button and drag & drop; index defaults to the end of the program
  const requestAdd = (exercise: Exercise, index?: number) => {
    const existing = program.find((i) => i.exerciseId === exercise.id);
    if (existing) {
      insertItem(exercise, existing.sets, existing.reps, index);
      return;
    }
    setPending({ exercise, index });
  };

  const insertItem = (exercise: Exercise, sets: number, reps: number, index?: number) => {
    const item: ProgramItem = {
      instanceId: `pi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      exerciseId: exercise.id,
      title: exercise.title,
      description: exercise.description,
      videoUrl: exercise.videoUrl,
      imageUrl: exercise.imageUrl,
      sets,
      reps,
    };
    setProgram((prev) => {
      const next = [...prev];
      next.splice(index ?? prev.length, 0, item);
      return next;
    });
  };

  const confirmPending = (sets: number, reps: number) => {
    if (pending) insertItem(pending.exercise, sets, reps, pending.index);
    setPending(null);
  };

  const updateItem = (instanceId: string, patch: Partial<ProgramItem>) =>
    setProgram((prev) => prev.map((i) => (i.instanceId === instanceId ? { ...i, ...patch } : i)));

  const removeItem = (instanceId: string) => setProgram((prev) => prev.filter((i) => i.instanceId !== instanceId));

  const moveItem = (index: number, delta: number) =>
    setProgram((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  // `slot` is an insertion position between cards: removing the item first shifts later slots up by one
  const reorderTo = (from: number, slot: number) =>
    setProgram((prev) => {
      const target = slot > from ? slot - 1 : slot;
      if (from === target || from < 0 || from >= prev.length || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(target, 0, moved);
      return next;
    });

  const clearProgram = () => setProgram([]);

  const onLibraryDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData(EXERCISE_MIME, id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "copy";
    setDrag({ kind: "library", exerciseId: id });
  };

  const onItemDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData(INSTANCE_MIME, String(index));
    e.dataTransfer.effectAllowed = "move";
    setDrag({ kind: "item", from: index });
  };

  // Fires on the source whether the drop succeeded or was cancelled (Esc, dropped outside)
  const onDragEnd = () => {
    setDrag(null);
    setDropIndex(null);
  };

  const onDropAt = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    // A drop on a card must not bubble to the list and be handled twice
    e.stopPropagation();
    onDragEnd();

    const exerciseId = e.dataTransfer.getData(EXERCISE_MIME);
    if (exerciseId) {
      const exercise = exercises.find((x) => x.id === exerciseId);
      if (exercise) requestAdd(exercise, index);
      return;
    }

    const raw = e.dataTransfer.getData(INSTANCE_MIME);
    if (raw !== "") reorderTo(Number(raw), index);
  };

  const totalSets = program.reduce((sum, i) => sum + i.sets, 0);
  const usedCount = (id: string) => program.filter((i) => i.exerciseId === id).length;

  return (
    <div className="bg-navy-950 text-ink">
      <div className="mx-auto flex max-w-7xl flex-col lg:h-[calc(100vh-4rem)] lg:flex-row">
        <LibrarySidebar
          exercises={exercises}
          usedCount={usedCount}
          onCreateExercise={createExercise}
          onAddToProgram={(exercise) => requestAdd(exercise)}
          onSetExerciseImage={setExerciseImage}
          onRemoveExercise={removeExercise}
          onDragStart={onLibraryDragStart}
          onDragEnd={onDragEnd}
          draggingId={drag?.kind === "library" ? drag.exerciseId : null}
        />

        <ProgramBuilder
          programName={programName}
          setProgramName={setProgramName}
          program={program}
          totalSets={totalSets}
          loading={loadingProgramme}
          saveState={{ saving, dirty, readOnly, isSaved: savedSnapshot !== null }}
          onSave={save}
          onNew={startNew}
          drag={drag}
          dropIndex={dropIndex}
          setDropIndex={setDropIndex}
          onDropAt={onDropAt}
          onItemDragStart={onItemDragStart}
          onDragEnd={onDragEnd}
          updateItem={updateItem}
          moveItem={moveItem}
          removeItem={removeItem}
          clearProgram={clearProgram}
        />
      </div>

      {pending && <ConfigModal exercise={pending.exercise} onCancel={() => setPending(null)} onConfirm={confirmPending} />}

      {notice && (
        <div
          key={notice.text}
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-item-in rounded-xl border px-4 py-3 text-sm font-semibold shadow-glow ${
            notice.kind === "success"
              ? "border-success-line-strong bg-navy-900 text-success-ink"
              : "border-danger-line-strong bg-navy-900 text-danger-ink"
          }`}
        >
          {notice.text}
        </div>
      )}
    </div>
  );
}
