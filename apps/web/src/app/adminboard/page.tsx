"use client";

import { useEffect, useState } from "react";

interface CoachDocument {
  id: string;
  originalName: string;
  mimeType: string;
  s3Key: string;
  uploadedAt: string;
  url: string;
  coach: {
    id: string;
    specialty: string;
    isApproved: boolean;
  };
}

type ActionState = "idle" | "loading" | "done";

export default function AdminPage() {
  const [documents, setDocuments] = useState<CoachDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actions, setActions] = useState<Record<string, ActionState>>({});
  const [feedback, setFeedback] = useState<
    Record<string, { type: "accept" | "refuse"; message: string }>
  >({});
  const [preview, setPreview] = useState<CoachDocument | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/coach-documents`,
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocuments(data);
    } catch {
      setError("Impossible de charger les documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleAction = async (
    doc: CoachDocument,
    type: "accept" | "refuse",
  ) => {
    setActions((prev) => ({ ...prev, [doc.id]: "loading" }));
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/coach-documents/${doc.id}/${type}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setFeedback((prev) => ({
        ...prev,
        [doc.id]: { type, message: data.message },
      }));
      setActions((prev) => ({ ...prev, [doc.id]: "done" }));

      setTimeout(() => {
        setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
        if (preview?.id === doc.id) setPreview(null);
      }, 2000);
    } catch {
      setActions((prev) => ({ ...prev, [doc.id]: "idle" }));
    }
  };

  const pending = documents.filter((d) => !d.coach.isApproved);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="animate-spin text-[#c9a84c]"
            width="28"
            height="28"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <p className="text-[#8a96b0] text-sm">Chargement des documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c336f]  text-[#f0eee8] px-[5vw] py-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <div>
          <div className="flex items-center gap-2.5 text-[#c9a84c] text-[0.7rem] font-semibold tracking-[3px] uppercase mb-3">
            <span className="w-6 h-px bg-[#c9a84c]" />
            Administration
          </div>
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1
                className="text-3xl md:text-4xl font-black text-[#f0eee8]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Validation des coachs
              </h1>
              <p className="text-[#8a96b0] text-sm mt-1">
                {pending.length} document{pending.length > 1 ? "s" : ""} en
                attente de vérification
              </p>
            </div>
            <button
              onClick={fetchDocuments}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(201,168,76,0.18)] text-[#8a96b0] text-xs font-semibold hover:text-[#e8c97a] hover:border-[#c9a84c] transition-all"
            >
              <svg
                width="13"
                height="13"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              Actualiser
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            {error}
          </div>
        )}

        {pending.length === 0 && !error && (
          <div className="text-center py-20 border border-dashed border-[rgba(201,168,76,0.8)] rounded-2xl bg-[rgba(201,168,76,0.02)]">
            <div className="w-12 h-12 rounded-full border border-[rgba(201,168,76,0.8)] bg-[rgba(201,168,76,0.08)] flex items-center justify-center mx-auto mb-4 text-[#e8c97a]">
              <svg
                width="22"
                height="22"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
            <p className="text-white text-bold">
              Aucun document en attente. Tout est à jour.
            </p>
          </div>
        )}

        {pending.length > 0 && (
          <div className="flex gap-5 items-start">
            <div className="flex flex-col gap-3 flex-1 min-w-0">
              {pending.map((doc) => {
                const isDone = actions[doc.id] === "done";
                const isLoading = actions[doc.id] === "loading";
                const fb = feedback[doc.id];
                const isSelected = preview?.id === doc.id;

                return (
                  <div
                    key={doc.id}
                    onClick={() => !isDone && setPreview(doc)}
                    className={`rounded-2xl border p-5 transition-all cursor-pointer ${
                      isDone
                        ? fb?.type === "accept"
                          ? "border-green-500/30 bg-green-500/5 opacity-60"
                          : "border-red-500/30 bg-red-500/5 opacity-60"
                        : isSelected
                          ? "border-[rgba(201,168,76,0.5)] bg-[#111d36]"
                          : "border-[rgba(201,168,76,0.18)] bg-[#0d1528] hover:bg-[#111d36] hover:border-[rgba(201,168,76,0.35)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.18)] flex items-center justify-center text-[#c9a84c] shrink-0">
                          <svg
                            width="18"
                            height="18"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                            />
                          </svg>
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-[#f0eee8] text-sm truncate">
                            {doc.originalName}
                          </p>
                          <p className="text-[#c9a84c] text-xs mt-0.5">
                            {doc.coach.specialty}
                          </p>
                          <p className="text-[#8a96b0] text-[0.7rem] mt-1">
                            Soumis le{" "}
                            {new Date(doc.uploadedAt).toLocaleDateString(
                              "fr-FR",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                          </p>
                          <p className="text-[#8a96b0] text-[0.68rem] font-mono mt-0.5 truncate">
                            Coach ID : {doc.coach.id.slice(0, 8)}...
                          </p>
                        </div>
                      </div>

                      <div
                        className="flex flex-col gap-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isDone ? (
                          <span
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${fb?.type === "accept" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}
                          >
                            {fb?.type === "accept" ? "✓ Approuvé" : "✗ Refusé"}
                          </span>
                        ) : (
                          <>
                            <button
                              disabled={isLoading}
                              onClick={() => handleAction(doc, "accept")}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-semibold hover:bg-green-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {isLoading ? (
                                <svg
                                  className="animate-spin"
                                  width="12"
                                  height="12"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                  />
                                  <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  width="12"
                                  height="12"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2.5}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.5 12.75l6 6 9-13.5"
                                  />
                                </svg>
                              )}
                              Approuver
                            </button>
                            <button
                              disabled={isLoading}
                              onClick={() => handleAction(doc, "refuse")}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <svg
                                width="12"
                                height="12"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2.5}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                              Refuser
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {preview && (
              <div className="w-80 shrink-0 sticky top-24 border border-[rgba(201,168,76,0.25)] rounded-2xl bg-[#0d1528] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(201,168,76,0.15)]">
                  <span className="text-xs font-semibold text-[#c9a84c] tracking-wide uppercase">
                    Aperçu
                  </span>
                  <button
                    onClick={() => setPreview(null)}
                    className="text-[#8a96b0] hover:text-[#e8c97a] transition-colors"
                  >
                    <svg
                      width="14"
                      height="14"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="p-4">
                  {preview.mimeType === "application/pdf" ? (
                    <iframe
                      src={preview.url}
                      className="w-full h-72 rounded-xl border border-[rgba(201,168,76,0.15)] bg-[#0a0f1e]"
                      title={preview.originalName}
                    />
                  ) : (
                    <img
                      src={preview.url}
                      alt={preview.originalName}
                      className="w-full rounded-xl border border-[rgba(201,168,76,0.15)] object-contain max-h-72"
                    />
                  )}
                </div>
                <div className="px-4 pb-4 flex flex-col gap-2">
                  {[
                    { label: "Fichier", value: preview.originalName },
                    { label: "Spécialité", value: preview.coach.specialty },
                    {
                      label: "Coach ID",
                      value: preview.coach.id.slice(0, 16) + "...",
                    },
                    {
                      label: "Soumis le",
                      value: new Date(preview.uploadedAt).toLocaleDateString(
                        "fr-FR",
                        { day: "numeric", month: "long", year: "numeric" },
                      ),
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-[#8a96b0]">{row.label}</span>
                      <span className="text-[#f0eee8] font-medium text-right max-w-[140px] truncate">
                        {row.value}
                      </span>
                    </div>
                  ))}

                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 w-full py-2 rounded-lg border border-[rgba(201,168,76,0.18)] text-[#c9a84c] text-xs font-semibold text-center hover:bg-[rgba(201,168,76,0.07)] hover:border-[#c9a84c] transition-all"
                  >
                    Ouvrir dans un nouvel onglet ↗
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
