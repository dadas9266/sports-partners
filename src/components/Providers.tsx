"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./ErrorBoundary";
import { NotificationContext, useNotificationState } from "@/hooks/useNotifications";

/** NotificationProvider: Oturum açılınca SSE bağlantısını kurar ve
 *  bildirimleri tüm uygulamaya açar. SessionProvider'ın içinde olmalı. */
function NotificationProvider({ children }: { children: React.ReactNode }) {
  const value = useNotificationState();
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NotificationProvider>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#1f2937",
              color: "#f9fafb",
              borderRadius: "0.75rem",
              fontSize: "0.875rem",
            },
          }}
        />
      </NotificationProvider>
    </SessionProvider>
  );
}
