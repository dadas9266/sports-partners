"use client";
/**
 * useNotifications — Gerçek zamanlı bildirim hook'u
 *
 * SSE (Server-Sent Events) üzerinden /api/notifications/stream ile bağlanır.
 * Bağlantı kesilirse 5 saniye sonra otomatik yeniden bağlanır.
 * Context ile tüm uygulamaya açılır (NotificationProvider).
 */
import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import type { Notification } from "@/types";

// ─── Context Tipi ─────────────────────────────────────────────────────────────
interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  unreadMessages: number;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────
export const NotificationContext = createContext<NotificationContextValue>({
  notifications: [],
  unreadCount: 0,
  unreadMessages: 0,
  markAllRead: async () => {},
  refresh: async () => {},
});

// ─── Consumer hook ────────────────────────────────────────────────────────────
export const useNotifications = () => useContext(NotificationContext);

// ─── Provider hook (Providers.tsx tarafından kullanılır) ─────────────────────
export function useNotificationState(): NotificationContextValue {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const sseRef = useRef<EventSource | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // REST ile bildirimleri çek
  const refresh = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.data ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // hata sessizce geçilir
    }
  }, [session]);

  // Tüm bildirimleri okundu işaretle
  const markAllRead = useCallback(async () => {
    if (!session) return;
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // sessiz
    }
  }, [session]);

  // SSE bağlantısını kurma fonksiyonu (retry desteği ile)
  const connectSSE = useCallback(() => {
    if (!session) return;
    if (sseRef.current) sseRef.current.close();

    const sse = new EventSource("/api/notifications/stream");
    sseRef.current = sse;

    sse.addEventListener("message", (e) => {
      try {
        const payload = JSON.parse(e.data);

        if (payload.type === "notifications" && Array.isArray(payload.data)) {
          const newItems = payload.data as Notification[];
          if (newItems.length > 0) {
            setUnreadCount((prev) => prev + newItems.length);
            setNotifications((prev) => {
              const ids = new Set(prev.map((n) => n.id));
              const fresh = newItems.filter((n) => !ids.has(n.id));
              return [...fresh, ...prev].slice(0, 50);
            });
          }
        }

        if (payload.type === "heartbeat") {
          setUnreadMessages(payload.unreadMessages ?? 0);
        }
      } catch {
        // parse hatası sessizce geçilir
      }
    });

    sse.onerror = () => {
      sse.close();
      sseRef.current = null;
      // 5 saniye sonra yeniden bağlan
      retryTimer.current = setTimeout(connectSSE, 5000);
    };
  }, [session]);

  // Oturum açıldığında SSE başlat + ilk veriyi çek
  useEffect(() => {
    if (!session) return;
    refresh();
    connectSSE();

    // 60 saniyede bir tazeleme (SSE arka planda tamamlayıcı)
    const interval = setInterval(refresh, 60_000);

    return () => {
      sseRef.current?.close();
      sseRef.current = null;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      clearInterval(interval);
    };
  }, [session, refresh, connectSSE]);

  return { notifications, unreadCount, unreadMessages, markAllRead, refresh };
}
