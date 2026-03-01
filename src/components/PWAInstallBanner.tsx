"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already dismissed or installed
    if (localStorage.getItem("pwa-banner-dismissed")) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Delay so it doesn't pop immediately
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem("pwa-banner-dismissed", "1");
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm animate-slide-up">
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-700 rounded-2xl shadow-xl px-4 py-3">
        <span className="text-2xl" aria-hidden="true">📱</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">Uygulamayı Ekle</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">Ana ekrana ekleyerek daha hızlı kullan</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 py-1.5 transition"
          aria-label="Uygulamayı yükle"
        >
          Ekle
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
          aria-label="Kapat"
        >
          ×
        </button>
      </div>
    </div>
  );
}
