"use client";

import { useTransition, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";

const LOCALES = [
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
];

function getLocaleCookie(): string {
  if (typeof document === "undefined") return "tr";
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/);
  const nextLocaleMatch = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : nextLocaleMatch ? decodeURIComponent(nextLocaleMatch[1]) : "tr";
}

export default function LanguageSwitcher({
  mode = "compact",
  onSelect,
}: {
  mode?: "compact" | "full";
  onSelect?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState("tr");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrent(getLocaleCookie());
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const switchLocale = (locale: string) => {
    document.cookie = `locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
    document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;SameSite=Lax`;
    setCurrent(locale);
    setOpen(false);
    onSelect?.();
    startTransition(() => {
      router.refresh();
    });
  };

  const currentLocale = LOCALES.find((l) => l.code === current) ?? LOCALES[0];

  if (mode === "full") {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LOCALES.map(({ code, label, flag }) => (
          <button
            key={code}
            type="button"
            onClick={() => switchLocale(code)}
            disabled={isPending}
            className={`rounded-2xl border px-3 py-3 text-left transition ${
              current === code
                ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-emerald-500 dark:hover:bg-gray-700"
            }`}
          >
            <div className="text-base">{flag}</div>
            <div className="mt-1 text-xs font-semibold uppercase tracking-wide">{code}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-gray-700 text-gray-200 hover:bg-gray-600 dark:bg-gray-800 transition-colors disabled:cursor-not-allowed"
      >
        {currentLocale.flag} {currentLocale.code.toUpperCase()}
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 z-50 min-w-[140px]">
          {LOCALES.map(({ code, label, flag }) => (
            <button
              key={code}
              onClick={() => switchLocale(code)}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${
                current === code
                  ? "bg-emerald-600/20 text-emerald-400"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <span>{flag}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
