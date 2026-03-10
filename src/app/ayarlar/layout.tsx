"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import Link from "next/link";

const MENU = [
  {
    href: "/profil",
    icon: "👤",
    label: "Profili Düzenle",
    desc: "Ad, biyografi, konum, fotoğraf",
  },
  {
    href: "/ayarlar/guvenlik",
    icon: "🔒",
    label: "Hesap Güvenliği",
    desc: "Şifre ve e-posta değiştir",
  },
  {
    href: "/ayarlar/profesyonel",
    icon: "⭐",
    label: "Profesyonel Hesap",
    desc: "Antrenör veya tesis başvurusu",
  },
  {
    href: "/ayarlar/isletme",
    icon: "🏟️",
    label: "İşletme Yönetimi",
    desc: "Tesis profili, ilanlar, galeri",
  },
  {
    href: "/ayarlar/gizlilik",
    icon: "🛡️",
    label: "Gizlilik",
    desc: "Hesap görünürlüğü, engellenenler",
  },
  {
    href: "/ayarlar/bildirimler",
    icon: "🔔",
    label: "Bildirimler",
    desc: "Push bildirim tercihleri",
  },
];

export default function AyarlarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/giris");
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">Ayarlar</h1>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <nav className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            {MENU.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-700 last:border-0 transition-colors ${
                    active
                      ? "bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-l-emerald-500"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className={`text-sm font-medium ${active ? "text-emerald-700 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300"}`}>
                      {item.label}
                    </p>
                    <p className="text-xs text-gray-400 hidden md:block">{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </nav>

          <Link
            href="/profil"
            className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 px-1"
          >
            ← Profilime Dön
          </Link>
        </aside>

        {/* İçerik */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
