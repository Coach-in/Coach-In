// Client for the programme/exercise endpoints of the Coach'In API

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type Role = "athlete" | "coach" | "admin";

export interface Session {
  token: string;
  role: Role;
  username: string;
}

export interface ApiExercise {
  id: string;
  name: string;
  description?: string | null;
  videoUrl?: string | null;
  imageUrl: string | null;
  createdById?: string | null;
}

export interface ApiProgrammeExercise {
  id: string;
  order: number;
  sets: number;
  reps: number;
  exercise: ApiExercise;
}

export interface ApiProgrammeDay {
  id: string;
  dayIndex: number;
  name?: string | null;
  exercises: ApiProgrammeExercise[];
}

interface ApiParty {
  id: string;
  user: { id: string; username: string };
}

export interface ApiProgramme {
  id: string;
  name: string;
  objectives?: string | null;
  startDate: string;
  endDate?: string | null;
  createdAt: string;
  updatedAt: string;
  // null = programme the athlete built themselves
  coach: ApiParty | null;
  // null = coach template not assigned to an athlete
  athlete: ApiParty | null;
  days: ApiProgrammeDay[];
}

export interface DayPayload {
  dayIndex: number;
  name?: string;
  exercises: { exerciseId: string; order: number; sets: number; reps: number }[];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Same flow as the Header: the httpOnly cookie is read by a Next route, then /users/me gives the role
export async function getSession(): Promise<Session | null> {
  try {
    const { authenticated, token } = await (await fetch("/api/auth/set-token")).json();
    if (!authenticated || !token) return null;

    const res = await fetch(`${API_URL}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    const me = await res.json();
    return { token, role: me.role, username: me.username };
  } catch {
    return null;
  }
}

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const isJson = typeof init.body === "string";
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(isJson ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      // Nest validation errors come back as an array of messages
      message = Array.isArray(body.message) ? body.message.join(", ") : body.message || message;
    } catch {}
    throw new ApiError(res.status, message);
  }

  return (res.status === 204 ? undefined : await res.json()) as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  listExercises: (token: string) => request<ApiExercise[]>(token, "/exercices"),

  createExercise: (token: string, body: { name: string; description?: string }) =>
    request<ApiExercise>(token, "/exercices", json("POST", body)),

  deleteExercise: (token: string, id: string) => request<void>(token, `/exercices/${id}`, { method: "DELETE" }),

  uploadExerciseImage: (token: string, id: string, image: Blob) => {
    const form = new FormData();
    form.append("file", image, "image.jpg");
    return request<ApiExercise>(token, `/exercices/${id}/image`, { method: "POST", body: form });
  },

  listProgrammes: (token: string) => request<ApiProgramme[]>(token, "/programmes"),

  getProgramme: (token: string, id: string) => request<ApiProgramme>(token, `/programmes/${id}`),

  createProgramme: (token: string, body: { name: string; startDate: string; days: DayPayload[] }) =>
    request<ApiProgramme>(token, "/programmes", json("POST", body)),

  renameProgramme: (token: string, id: string, name: string) =>
    request<ApiProgramme>(token, `/programmes/${id}`, json("PATCH", { name })),

  // The API has no bulk replace: existing days are deleted, then the new ones are added
  replaceProgrammeDays: async (token: string, id: string, days: DayPayload[]) => {
    const current = await request<ApiProgramme>(token, `/programmes/${id}`);
    for (const day of current.days) {
      await request<void>(token, `/programmes/${id}/days/${day.id}`, { method: "DELETE" });
    }
    let updated = current;
    for (const day of days) {
      updated = await request<ApiProgramme>(token, `/programmes/${id}/days`, json("POST", day));
    }
    return updated;
  },

  deleteProgramme: (token: string, id: string) => request<void>(token, `/programmes/${id}`, { method: "DELETE" }),
};
