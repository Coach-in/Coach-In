"use client";

import { useEffect, useState } from "react";

export enum NotificationStatus {
  UNSEEN = "unseen",
  SEEN = "seen",
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

interface Notification {
  id: string;
  message: string;
  status: NotificationStatus;
  sentAt: string;
  sender: User;
  receiver: User;
}

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationsModal({
  isOpen,
  onClose,
}: Readonly<NotificationsModalProps>) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const tokenRes = await fetch("/api/auth/set-token");
      const { authenticated, token } = await tokenRes.json();

      if (!authenticated || !token) {
        setError("Non authentifié");
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!res.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      setError("Impossible de charger les notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const markAsSeen = async (id: string) => {
    try {
      const tokenRes = await fetch("/api/auth/set-token");
      const { token } = await tokenRes.json();

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/seen`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to mark as seen:", err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const tokenRes = await fetch("/api/auth/set-token");
      const { token } = await tokenRes.json();

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (res.ok) {
        fetchNotifications();
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  if (!isOpen) return null;

  const unseenCount = notifications.filter(
    (n) => n.status === NotificationStatus.UNSEEN,
  ).length;

  return (
    <>
      <div className="fixed inset-0 bg-scrim z-40" onClick={onClose}></div>

      <div className="fixed top-20 right-4 w-96 max-h-[32rem] bg-graphite-800 border border-gold-warm-border rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gold-warm-border bg-navy-wash">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-gold-cream">
                Notifications
              </h2>
              {unseenCount > 0 && (
                <p className="text-xs text-ink-subtle mt-0.5">
                  {unseenCount} non lue{unseenCount > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-ink-subtle hover:text-gold-warm transition-colors"
            >
              <svg
                width="20"
                height="20"
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
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg
                className="animate-spin h-8 w-8 text-gold-warm mb-3"
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
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <p className="text-ink-subtle text-sm">Chargement...</p>
            </div>
          ) : error ? (
            <div className="px-5 py-4">
              <div className="p-4 rounded-lg bg-danger-surface border border-danger-line text-danger-ink text-sm">
                {error}
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-5">
              <div className="w-16 h-16 rounded-full bg-gold-warm-soft border border-gold-warm-border flex items-center justify-center mb-4">
                <svg
                  width="28"
                  height="28"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  className="text-gold-warm"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                  />
                </svg>
              </div>
              <p className="text-ink-subtle text-sm">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-gold-warm-soft">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-5 py-4 hover:bg-navy-wash transition-colors ${
                    notification.status === NotificationStatus.UNSEEN
                      ? "bg-gold-warm-faint"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-warm to-gold-cream flex items-center justify-center text-graphite-800 font-bold text-sm shrink-0">
                      {notification.sender.username
                        ?.split("_")
                        .map((p) => p[0]?.toUpperCase())
                        .join("")
                        .slice(0, 2) || "?"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-ink-body text-sm leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <p className="text-ink-subtle text-xs">
                          {new Date(notification.sentAt).toLocaleDateString(
                            "fr-FR",
                            {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </p>
                        {notification.status === NotificationStatus.UNSEEN && (
                          <span className="w-1.5 h-1.5 rounded-full bg-gold-warm"></span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        {notification.status === NotificationStatus.UNSEEN && (
                          <button
                            onClick={() => markAsSeen(notification.id)}
                            className="text-gold-warm hover:text-gold-cream text-xs font-medium transition-colors"
                          >
                            Marquer comme lu
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-ink-subtle hover:text-danger-ink text-xs font-medium transition-colors"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <div className="px-5 py-3 border-t border-gold-warm-border bg-navy-wash">
            <button
              onClick={fetchNotifications}
              className="w-full text-center text-gold-warm hover:text-gold-cream text-sm font-medium transition-colors"
            >
              Actualiser
            </button>
          </div>
        )}
      </div>
    </>
  );
}
