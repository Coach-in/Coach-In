"use client";

import { useState } from "react";
import { DragSource, Exercise, ProgramItem, SEED_EXERCISES, EXERCISE_MIME, INSTANCE_MIME } from "./lib/types";
import { LibrarySidebar } from "./_components/LibrarySidebar";
import { ProgramBuilder } from "./_components/ProgramBuilder";
import { ConfigModal } from "./_components/ConfigModal";
import exercisesData from "./exercises.json";

const BASE_EXERCISES: Exercise[] = (exercisesData as Exercise[]).map((ex) => ({
  id: ex.id,
  title: ex.title,
  description: ex.description,
  videoUrl: ex.videoUrl,
  imageUrl: ex.imageUrl,
}));

export default function ProgramationPage() {
  const [exercises, setExercises] = useState<Exercise[]>(BASE_EXERCISES.length > 0 ? BASE_EXERCISES : SEED_EXERCISES);
  const [program, setProgram] = useState<ProgramItem[]>([]);
  const [programName, setProgramName] = useState("Programme Push Pull Request");

  // Exercise waiting for its sets/reps, and where it will be inserted
  const [pending, setPending] = useState<{ exercise: Exercise; index?: number } | null>(null);
  // What is being dragged (drives the visuals) and the insertion slot under the cursor (0..program.length)
  const [drag, setDrag] = useState<DragSource | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const createExercise = (exerciseData: Omit<Exercise, "id">) => {
    setExercises((prev) => [
      ...prev,
      {
        id: `ex-${Date.now().toString(36)}`,
        title: exerciseData.title,
        description: exerciseData.description,
        videoUrl: exerciseData.videoUrl,
        imageUrl: exerciseData.imageUrl,
      },
    ]);
  };

  const removeExercise = (id: string) => setExercises((prev) => prev.filter((x) => x.id !== id));

  const setExerciseImage = (id: string, imageUrl: string) => {
    setExercises((prev) => prev.map((x) => (x.id === id ? { ...x, imageUrl } : x)));
    setProgram((prev) => prev.map((i) => (i.exerciseId === id ? { ...i, imageUrl } : i)));
  };

  // Shared by the "+" button and drag & drop; index defaults to the end of the program
  const requestAdd = (exercise: Exercise, index?: number) => {
    const existing = program.find((i) => i.exerciseId === exercise.id);
    if (existing) {
      insertItem(exercise, existing.sets, existing.reps, index);
      return;
    }
    setPending({ exercise, index });
  };

  const insertItem = (exercise: Exercise, sets: number, reps: string, index?: number) => {
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

  const confirmPending = (sets: number, reps: string) => {
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
    <div className="bg-navy-950 text-ink print:bg-white print:text-black">
      <div className="mx-auto flex max-w-7xl flex-col lg:h-[calc(100vh-4rem)] lg:flex-row print:block print:max-w-none">
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
    </div>
  );
}
