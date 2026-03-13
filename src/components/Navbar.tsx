"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { useActivityCount } from "@/hooks/useActivityCount";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import Dropdown from "@/components/ui/Dropdown";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";
import toast from "react-hot-toast";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const discoverRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Gerçek zamanlı bildirimler — NotificationContext'ten (SSE Providers.tsx'de açık)
  const { notifications, unreadCount, unreadMessages, markAllRead, refresh: refreshNotifs } = useNotifications();
  const activityCount = useActivityCount(!!session);
  const [actionedFollowIds, setActionedFollowIds] = useState<Map<string, "accepted" | "rejected">>(new Map());

  useEffect(() => {
    if (!session) return;
    fetch("/api/streak", { method: "POST" }).catch(() => {});
  }, [session]);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  useEffect(() => {
    if (!notifOpen && !discoverOpen && !moreOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (notifPanelRef.current && notifPanelRef.current.contains(target)) return;
      if (moreRef.current && moreRef.current.contains(target)) return;
      if (navRef.current && !navRef.current.contains(target)) {
        setNotifOpen(false);
        setDiscoverOpen(false);
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen, discoverOpen, moreOpen]);

  const handleOpenNotif = async () => {
    const opening = !notifOpen;
    setNotifOpen((v) => !v);
    if (opening) {
      // Her açılışta güncel bildirimleri çek
      await refreshNotifs();
      if (unreadCount > 0) {
        await markAllRead();
      }
    }
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const t = useTranslations("nav");

  return (
    <>
    <nav
      ref={navRef}
      className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl text-gray-800 dark:text-gray-100 shadow-sm border-b border-gray-200/60 dark:border-gray-700/60 sticky top-0 z-50"
      role="navigation"
      aria-label={t("mainNav")}
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center gap-1 md:gap-1.5">
            <Link href="/" className="text-xl font-bold flex items-center gap-2 mr-3" aria-label={t("homePage")}>
              <span className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-sm font-black shadow-sm">SP</span>
              <span className="hidden sm:inline text-lg font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">SporPartner</span>
            </Link>

            {/* Nav linkleri — sadeleştirilmiş */}
            {([
              { href: "/sosyal", icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ), label: t("social") },
              { href: "/arama", icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              ), label: t("search") },
            ] as { href: string; icon: ReactNode; label: string }[]).map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname === item.href
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                    : "text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                }`}
                aria-label={item.label}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}

            {/* (+) İlan Oluştur — sadece desktop */}
            {session && (
              <Link
                href="/ilan/olustur"
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>{t("createListing")}</span>
              </Link>
            )}

            {/* Keşfet Dropdown — Topluluklar, Mekanlar, Turnuvalar */}
            <div className="relative hidden md:block" ref={discoverRef}>
              <button
                onClick={() => setDiscoverOpen(v => !v)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  discoverOpen || ["/topluluklar", "/mekanlar", "/turnuvalar"].some(p => pathname?.startsWith(p))
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20"
                    : "text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>{t("discover") || "Keşfet"}</span>
                <svg className={`w-3 h-3 transition-transform ${discoverOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {discoverOpen && (
                <>
                  <div className="fixed inset-0 z-[88]" onClick={() => setDiscoverOpen(false)} />
                  <div className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-[89] overflow-hidden py-1.5">
                    {[
                      { href: "/topluluklar", icon: "🏛️", label: t("communities"), desc: t("communitiesDesc") },
                      { href: "/mekanlar", icon: "🏟️", label: t("venues"), desc: t("venuesDesc") },
                      { href: "/turnuvalar", icon: "🏆", label: t("tournaments"), desc: t("tournamentsDesc") },
                      { href: "/liderlik", icon: "🥇", label: t("leaderboard"), desc: t("leaderboardDesc") },
                    ].map(item => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setDiscoverOpen(false)}
                        className={`flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition ${pathname?.startsWith(item.href) ? "bg-emerald-50 dark:bg-emerald-900/20" : ""}`}
                      >
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{item.label}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{item.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            {session ? (
              <>
                <Link href="/aktivitelerim" className="hidden sm:inline-flex relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" aria-label="Aktivitelerim" title="Aktivitelerim">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  {activityCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {activityCount > 9 ? "9+" : activityCount}
                    </span>
                  )}
                </Link>
                <Link href="/mesajlar" className="hidden sm:inline-flex relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" aria-label={t("messages")}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">{unreadMessages > 9 ? "9+" : unreadMessages}</span>
                  )}
                </Link>
                <div className="relative" ref={notifRef}>
                  <button onClick={handleOpenNotif} className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" aria-label={t("notifications")}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">{unreadCount > 9 ? "9+" : unreadCount}</span>
                    )}
                  </button>
                </div>
                <Dropdown
                  align="right"
                  trigger={
                    <span className="inline-flex items-center gap-2 cursor-pointer p-1 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition">
                      <img src={session.user?.image || "/icons/avatar.svg"} alt="Profil" className="w-8 h-8 rounded-full border-2 border-emerald-200 dark:border-emerald-700 shadow-sm" />
                      <span className="hidden md:inline text-sm font-semibold text-gray-700 dark:text-gray-200">{session.user?.name}</span>
                    </span>
                  }
                >
                  {session.user?.isAdmin && (
                    <Link href="/admin" className="block px-4 py-2 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                      {t("admin")}
                    </Link>
                  )}
                  <Link href="/profil" className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30">{t("profile")}</Link>
                  <Link href="/ayarlar/isletme" className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30">🏟️ Tesis Yönetimi</Link>
                  <Link href="/topluluklarim" className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30">{t("myCommunities")}</Link>
                  <Link href="/ayarlar" className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30">{t("settings")}</Link>
                  <button onClick={() => signOut()} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                    {t("signOut")}
                  </button>
                </Dropdown>
                <button onClick={toggleDarkMode} className="hidden md:inline-flex ml-1 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" aria-label="Tema Değiştir">
                  {darkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                    </svg>
                  )}
                </button>

                {/* ─── Mobil üç nokta (...) menüsü ─── */}
                <div className="relative md:hidden" ref={moreRef}>
                  <button
                    onClick={() => setMoreOpen(v => !v)}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                    aria-label="Daha Fazla"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
                    </svg>
                  </button>
                  {moreOpen && (
                    <>
                      <div className="fixed inset-0 z-[88] bg-black/40 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
                      <div className="fixed inset-x-0 bottom-0 z-[89] max-h-[82vh] overflow-y-auto rounded-t-[28px] border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
                        <div className="mx-auto mt-3 h-1.5 w-14 rounded-full bg-gray-300 dark:bg-gray-700" />
                        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <img src={session.user?.image || "/icons/avatar.svg"} alt="Profil" className="h-11 w-11 rounded-2xl border border-emerald-200 object-cover shadow-sm dark:border-emerald-700" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{session.user?.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Mobil hızlı erişim</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setMoreOpen(false)}
                              className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                              aria-label={t("close")}
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>

                          <div className="mt-4 grid grid-cols-4 gap-2">
                            {[
                              { href: "/mesajlar", icon: "💬", label: "Mesajlar" },
                              { href: "/aktivitelerim", icon: "📌", label: "Aktivite" },
                              { href: "/ayarlar", icon: "⚙️", label: "Ayarlar" },
                              { action: () => { toggleDarkMode(); setMoreOpen(false); }, icon: "🌓", label: "Tema" },
                            ].map((item) => (
                              item.href ? (
                                <Link
                                  key={item.label}
                                  href={item.href}
                                  onClick={() => setMoreOpen(false)}
                                  className="rounded-2xl bg-gray-50 px-2 py-3 text-center text-xs font-semibold text-gray-700 transition hover:bg-emerald-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <span className="mb-1 block text-lg">{item.icon}</span>
                                  {item.label}
                                </Link>
                              ) : (
                                <button
                                  key={item.label}
                                  type="button"
                                  onClick={item.action}
                                  className="rounded-2xl bg-gray-50 px-2 py-3 text-center text-xs font-semibold text-gray-700 transition hover:bg-emerald-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                  <span className="mb-1 block text-lg">{item.icon}</span>
                                  {item.label}
                                </button>
                              )
                            ))}
                          </div>

                          <div className="mt-5">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Dil</p>
                            <LanguageSwitcher mode="full" onSelect={() => setMoreOpen(false)} />
                          </div>

                          <div className="mt-5 space-y-1">
                            {[
                              { href: "/ayarlar/profil", icon: "👤", label: "Profili Düzenle" },
                              { href: "/ayarlar/guvenlik", icon: "🔒", label: "Hesap Güvenliği" },
                              { href: "/ayarlar/profesyonel", icon: "⭐", label: "Profesyonel Hesap" },
                              { href: "/ayarlar/isletme", icon: "🏟️", label: "Tesis Yönetimi" },
                              ...((session.user as any)?.userType === "TRAINER" ? [{ href: "/antrenor/derslerim", icon: "📚", label: "Ders Takibi" }] : []),
                              { href: "/ayarlar/gizlilik", icon: "🛡️", label: "Gizlilik" },
                              { href: "/topluluklar", icon: "🌐", label: "Topluluklar" },
                              { href: "/turnuvalar", icon: "🏆", label: "Turnuvalar" },
                            ].map((item) => (
                              <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMoreOpen(false)}
                                className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition ${pathname?.startsWith(item.href) ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300" : "text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"}`}
                              >
                                <span className="text-lg">{item.icon}</span>
                                <span className="text-sm font-medium">{item.label}</span>
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/auth/giris" className="hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded-lg transition text-sm font-medium">{t("signIn")}</Link>
                <Link href="/auth/kayit" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-4 py-1.5 rounded-xl hover:opacity-90 transition text-sm shadow-sm">{t("register")}</Link>
                <div className="md:hidden">
                  <LanguageSwitcher />
                </div>
                <button onClick={toggleDarkMode} className="ml-1 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" aria-label="Tema Değiştir">
                  {darkMode ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
                    </svg>
                  )}
                </button>
              </>
            )}
            <div className="hidden md:flex">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>

    </nav>

      {notifOpen && session && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]" onClick={() => setNotifOpen(false)} aria-hidden="true" />
          <div ref={notifPanelRef} className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl z-[9999] flex flex-col" role="dialog" aria-label={t("notifications")}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <span className="font-bold text-gray-800 dark:text-gray-100 text-base">{t("notifications")}</span>
                {unreadCount > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
              </div>
              <button onClick={() => setNotifOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition" aria-label={t("close")}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span className="text-5xl">🔕</span>
                  <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">{t("noNotifications")}</p>
                </div>
              ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              setNotifOpen(false);
                              if (n.link && n.link !== "#") {
                                router.push(n.link);
                              }
                            }}
                            className={`w-full text-left flex gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-50 dark:border-gray-700/50 last:border-0 cursor-pointer ${!n.read ? "bg-emerald-50/70 dark:bg-emerald-900/10" : ""}`}
                          >
                            <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-base">
                              {n.type === "NEW_MESSAGE" ? "💬" : n.type === "FOLLOW_REQUEST" ? "📩" : n.type === "NEW_MATCH" ? "🤝" : n.type === "NEW_RATING" ? "⭐" : n.type === "NEW_FOLLOWER" ? "👤" : n.type === "NO_SHOW_WARNING" ? "⚠️" : n.type === "TRAINER_VERIFIED" ? "✓" : "🔔"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug">{n.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{new Date(n.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                              
                              {/* Follow Request Actions */}
                              {n.type === "FOLLOW_REQUEST" && !actionedFollowIds.has(n.id) && !n.read && (
                                <div className="flex gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
                                  <button 
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const userId = n.link?.split("/").pop();
                                      if (!userId) return;
                                      try {
                                        const res = await fetch(`/api/follow-requests`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ followerId: userId, action: "ACCEPT" })
                                        });
                                        if (res.ok) { 
                                          setActionedFollowIds((prev) => new Map(prev).set(n.id, "accepted"));
                                          // Bildirimi okundu olarak işaretle
                                          fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [n.id] }) }).catch(() => {});
                                          toast.success("✅ Takip isteği kabul edildi"); 
                                        }
                                      } catch {}
                                    }}
                                    className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition"
                                  >
                                    Onayla
                                  </button>
                                  <button 
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const userId = n.link?.split("/").pop();
                                      if (!userId) return;
                                      try {
                                        const res = await fetch(`/api/follow-requests`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ followerId: userId, action: "REJECT" })
                                        });
                                        if (res.ok) { 
                                          setActionedFollowIds((prev) => new Map(prev).set(n.id, "rejected"));
                                          fetch("/api/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [n.id] }) }).catch(() => {});
                                          toast.success("İstek reddedildi"); 
                                        }
                                      } catch {}
                                    }}
                                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                  >
                                    Sil
                                  </button>
                                </div>
                              )}
                              {n.type === "FOLLOW_REQUEST" && (actionedFollowIds.has(n.id) || n.read) && (
                                <p className="text-[10px] font-semibold mt-1">
                                  {actionedFollowIds.get(n.id) === "rejected"
                                    ? <span className="text-gray-400">✘ İstek reddedildi</span>
                                    : <span className="text-emerald-600 dark:text-emerald-400">✔ Artık takipçiniz</span>
                                  }
                                </p>
                              )}

                              {!n.type?.includes("REQUEST") && (
                                <button
                                  onClick={() => {
                                    setNotifOpen(false);
                                    if (n.link && n.link !== "#") router.push(n.link);
                                  }}
                                  className="mt-2 text-[10px] text-emerald-600 font-bold hover:underline"
                                >
                                  Görüntüle →
                                </button>
                              )}
                            </div>
                            {!n.read && <span className="shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />}
                          </div>
                        ))
              )}
            </div>
            {notifications.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
                <p className="text-xs text-center text-gray-400 dark:text-gray-500">{t("notificationsShowing", { count: notifications.length })}</p>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
