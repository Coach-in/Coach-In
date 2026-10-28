// Types for programation

export interface Exercise {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  imageUrl?: string;
}

export interface ProgramItem {
  instanceId: string;
  exerciseId: string;
  title: string;
  description: string;
  videoUrl: string;
  imageUrl?: string;
  sets: number;
  reps: string;
}

export const EXERCISE_MIME = "application/x-coachin-exercise";
export const INSTANCE_MIME = "application/x-coachin-instance";

export type DragSource = { kind: "library"; exerciseId: string } | { kind: "item"; from: number };

// dropEffect must match the source's effectAllowed, otherwise the browser cancels the drop:
// library exercises are copied, program items are moved
export const dropEffectFor = (e: React.DragEvent): DataTransfer["dropEffect"] =>
  e.dataTransfer.types.includes(EXERCISE_MIME) ? "copy" : "move";

export const SEED_EXERCISES: Exercise[] = [
  {
    id: "ex-squat",
    title: "Squat barre",
    description:
      "Descendre sous la parallaxe, genoux alignés sur les orteils. Resserrer le haut du dos avant chaque répétition.",
    videoUrl: "https://videos.exemple.fr/squat-barre",
    imageUrl: "/exercises/squat.jpg",
  },
];

export const DEFAULT_SETS = 3;
export const DEFAULT_REPS = "10";
