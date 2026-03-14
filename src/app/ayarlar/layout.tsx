"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AyarlarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const isTr = locale === "tr";
  const { status } = useSession();

  const text = {
    title: isTr ? "Ayarlar" : "Settings",
    quickTitle: isTr ? "Hızlı Ayarlar" : "Quick Settings",
    quickDesc: isTr ? "Dil ve hesap bölümlerine mobilde daha rahat eriş." : "Quick mobile access to language and account sections.",
    backToProfile: isTr ? "← Profilime Dön" : "← Back to Profile",
  };

  const menu = useMemo(() => ([
    {
      href: "/profil",
      icon: "👤",
      label: isTr ? "Profili Düzenle" : "Edit Profile",
      desc: isTr ? "Ad, biyografi, konum, fotoğraf" : "Name, bio, location, photo",
    },
    {
      href: "/ayarlar/guvenlik",
      icon: "🔒",
      label: isTr ? "Hesap Güvenliği" : "Account Security",
      desc: isTr ? "Şifre ve e-posta değiştir" : "Change password and email",
    },
    {
      href: "/ayarlar/profesyonel",
      icon: "⭐",
      label: isTr ? "Profesyonel Hesap" : "Professional Account",
      desc: isTr ? "Antrenör başvurusu ve onay durumu" : "Trainer application and approval status",
    },
    {
      href: "/ayarlar/gizlilik",
      icon: "🛡️",
      label: isTr ? "Gizlilik" : "Privacy",
      desc: isTr ? "Hesap görünürlüğü, engellenenler" : "Visibility and blocked users",
    },
    {
      href: "/ayarlar/bildirimler",
      icon: "🔔",
      label: isTr ? "Bildirimler" : "Notifications",
      desc: isTr ? "Push bildirim tercihleri" : "Push notification preferences",
    },
    {
      href: "/ayarlar/davet",
      icon: "🎁",
      label: isTr ? "Arkadaşını Davet Et" : "Invite Friends",
      desc: isTr ? "Davet kodu ile arkadaşını getir" : "Invite your friends with your code",
    },
  ]), [isTr]);

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
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-8">{text.title}</h1>
      <div className="md:hidden mb-5 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{text.quickTitle}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{text.quickDesc}</p>
          </div>
          <LanguageSwitcher />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {menu.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`min-w-max rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                }`}
              >
                {item.icon} {item.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar */}
        <aside className="hidden md:block w-full md:w-64 shrink-0">
          <nav className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            {menu.map((item) => {
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
            {text.backToProfile}
          </Link>
        </aside>

        {/* İçerik */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
