// Conversions between the API shapes and the builder's local shapes

import { ApiExercise, ApiProgramme, DayPayload } from "./api";
import { Exercise, ProgramItem } from "./types";
import { exportProgramPdf } from "./exportPdf";

export const apiToExercise = (e: ApiExercise): Exercise => ({
  id: e.id,
  title: e.name,
  description: e.description ?? "",
  videoUrl: e.videoUrl ?? "",
  imageUrl: e.imageUrl ?? undefined,
});

// The builder edits a single session: every day of the programme is flattened in order
export const programmeToItems = (programme: ApiProgramme): ProgramItem[] =>
  [...programme.days]
    .sort((a, b) => a.dayIndex - b.dayIndex)
    .flatMap((day) => [...day.exercises].sort((a, b) => a.order - b.order))
    .map((entry) => {
      const exercise = apiToExercise(entry.exercise);
      return {
        instanceId: entry.id,
        exerciseId: exercise.id,
        title: exercise.title,
        description: exercise.description,
        videoUrl: exercise.videoUrl,
        imageUrl: exercise.imageUrl,
        sets: entry.sets,
        reps: entry.reps,
      };
    });

export const itemsToDays = (items: ProgramItem[]): DayPayload[] => [
  {
    dayIndex: 1,
    name: "Séance",
    exercises: items.map((item, index) => ({
      exerciseId: item.exerciseId,
      order: index + 1,
      sets: item.sets,
      reps: item.reps,
    })),
  },
];

export const exerciseCount = (programme: ApiProgramme) =>
  (programme.days ?? []).reduce((sum, day) => sum + (day.exercises?.length ?? 0), 0);

export const downloadProgramme = (programme: ApiProgramme) =>
  exportProgramPdf(programme.name, programmeToItems(programme));

export const todayIso = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
