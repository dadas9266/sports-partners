"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import ErrorBoundary from "./ErrorBoundary";

export default function Providers({ children }: { children: React.ReactNode }) {
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
