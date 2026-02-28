"use client";

import { useTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const LOCALES = [
  { code: "tr", label: "TR", flag: "🇹🇷" },
  { code: "en", label: "EN", flag: "🇬🇧" },
];

function getLocaleCookie(): string {
  if (typeof document === "undefined") return "tr";
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "tr";
}

export default function LanguageSwitcher() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [current, setCurrent] = useState("tr");

  useEffect(() => {
    setCurrent(getLocaleCookie());
  }, []);

  const switchLocale = (locale: string) => {
    document.cookie = `locale=${locale};path=/;max-age=31536000`;
    setCurrent(locale);
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map(({ code, label, flag }) => (
        <button
          key={code}
          onClick={() => switchLocale(code)}
          disabled={isPending || current === code}
          className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            current === code
              ? "bg-emerald-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600 dark:bg-gray-800"
          } disabled:cursor-not-allowed`}
          title={`Switch to ${label}`}
        >
          {flag} {label}
        </button>
      ))}
    </div>
  );
}
