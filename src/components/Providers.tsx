"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./ErrorBoundary";
import { useWebSocket } from '@/lib/ws-client';
import { useEffect } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  // WebSocket ile gerçek zamanlı bildirim örneği
  useWebSocket(
    typeof window !== 'undefined' ? `ws://${window.location.host}/api/ws` : '',
    (data) => {
      if (data && data.type === 'notification') {
        // Burada react-hot-toast veya özel bir bildirim sistemi ile gösterilebilir
        // toast.success(data.message);
        // TODO: Bildirim state'ine ekle
      }
    }
  );
  return (
    <SessionProvider>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#333",
            color: "#fff",
          },
        }}
      />
    </SessionProvider>
  );
}
