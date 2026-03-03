"use client";

import type { ReactNode } from "react";

import Link from "next/link";
import { useActivityCount } from "@/hooks/useActivityCount";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import Dropdown from "@/components/ui/Dropdown";
import Button from "@/components/ui/Button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useTranslations } from "next-intl";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [discoverOpen, setDiscoverOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const discoverRef = useRef<HTMLDivElement>(null);

  // Gerçek zamanlı bildirimler — NotificationContext'ten (SSE Providers.tsx'de açık)
  const { notifications, unreadCount, unreadMessages, markAllRead, refresh: refreshNotifs } = useNotifications();
  const activityCount = useActivityCount(!!session);

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
    if (!menuOpen && !notifOpen && !discoverOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      // Bildirim paneli navRef dışında render edilir; panel içi tıklamaları yoksay
      if (notifPanelRef.current && notifPanelRef.current.contains(target)) return;
      if (navRef.current && !navRef.current.contains(target)) {
        setMenuOpen(false);
        setNotifOpen(false);
        setDiscoverOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, notifOpen, discoverOpen]);

  const handleOpenNotif = async () => {
    const opening = !notifOpen;
    setNotifOpen((v) => !v);
    setMenuOpen(false); // always close mobile menu when toggling notif panel
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

  const mobileLinkClass = "block hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2.5 rounded-xl transition text-gray-700 dark:text-gray-200 text-sm font-medium";
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
              { href: "/harita", icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              ), label: "Harita" },
              { href: "/sosyal", icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ), label: "Sosyal" },
              { href: "/arama", icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                </svg>
              ), label: "Ara" },
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>Keşfet</span>
                <svg className={`w-3 h-3 transition-transform ${discoverOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {discoverOpen && (
                <>
                  <div className="fixed inset-0 z-[88]" onClick={() => setDiscoverOpen(false)} />
                  <div className="absolute left-0 top-full mt-1.5 w-52 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-[89] overflow-hidden py-1.5">
                    {[
                      { href: "/topluluklar", icon: "🏛️", label: "Topluluklar", desc: "Gruplar, kulüpler, takımlar" },
                      { href: "/mekanlar", icon: "🏟️", label: "Mekanlar", desc: "Spor tesisleri & sahalar" },
                      { href: "/turnuvalar", icon: "🏆", label: "Turnuvalar", desc: "Aktif turnuvalar" },
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

          <div className="flex-1 flex justify-center">
            {session && (
              <Link href="/ilan/olustur" className="group">
                <Button variant="primary" size="lg" className="shadow-md px-5 py-1.5 text-sm font-bold tracking-wide relative overflow-hidden transition-all group-hover:scale-105 bg-gradient-to-r from-emerald-500 to-teal-600 border-0 rounded-xl">
                  <span className="relative z-10">{t("createListing")}</span>
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {session ? (
              <>
                <Link href="/aktivitelerim" className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" aria-label="Aktivitelerim" title="Aktivitelerim">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  {activityCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                      {activityCount > 9 ? "9+" : activityCount}
                    </span>
                  )}
                </Link>
                <Link href="/mesajlar" className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" aria-label={t("messages")}>
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
                  <Link href="/ayarlar/isletme" className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30">🏟️ İşletme Yönetimi</Link>
                  <Link href="/topluluklarim" className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30">{t("myCommunities")}</Link>
                  <Link href="/ayarlar" className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30">{t("settings")}</Link>
                  <button onClick={() => signOut()} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                    {t("signOut")}
                  </button>
                </Dropdown>
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
            ) : (
              <>
                <Link href="/auth/giris" className="hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded-lg transition text-sm font-medium">{t("signIn")}</Link>
                <Link href="/auth/kayit" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-4 py-1.5 rounded-xl hover:opacity-90 transition text-sm shadow-sm">{t("register")}</Link>
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
            <button className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition" onClick={() => setMenuOpen((v) => !v)} aria-label={t("toggleMenu")} aria-expanded={menuOpen} aria-controls="mobile-menu">
              <span className="text-xl text-gray-600 dark:text-gray-300">{menuOpen ? "✕" : "☰"}</span>
            </button>
            <div className="hidden md:flex">
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-menu" className="md:hidden pb-4 space-y-1 px-4 border-t border-gray-100 dark:border-gray-700/50 pt-2" role="menu">
          <Link href="/" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🏠 İlanlar</Link>
          <Link href="/harita" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🗺️ Harita</Link>
          <Link href="/sosyal" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🌐 Sosyal Akış</Link>
          <Link href="/arama" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🔍 Ara</Link>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 pt-2 pb-0.5">Keşfet</p>
          <Link href="/topluluklar" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🏛️ Topluluklar</Link>
          <Link href="/mekanlar" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🏟️ Mekanlar</Link>
          <Link href="/turnuvalar" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🏆 Turnuvalar</Link>
          <Link href="/liderlik" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🏅 Liderlik Tablosu</Link>
          {session ? (
            <>
              <Link href="/ilan/olustur" className="block bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-3 py-2.5 rounded-xl text-sm text-center shadow-sm" onClick={() => setMenuOpen(false)} role="menuitem">{t("createListing")}</Link>
              <Link href="/profil" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">👤 {t("profile")}</Link>
              <Link href="/teklifler" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">⚔️ Teklifler</Link>
              <Link href="/aktivitelerim" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">⚡ Aktivitelerim</Link>
              <Link href="/ayarlar" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">⚙️ {t("settings")}</Link>
              <Link href="/ayarlar/isletme" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🏟️ İşletme Yönetimi</Link>
              <Link href="/mesajlar" className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2.5 rounded-xl transition text-sm text-gray-700 dark:text-gray-200" onClick={() => setMenuOpen(false)} role="menuitem">
                <span>💬 {t("messages")}</span>
                {unreadMessages > 0 && <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{unreadMessages > 9 ? "9+" : unreadMessages}</span>}
              </Link>
              <button onClick={() => { setMenuOpen(false); handleOpenNotif(); }} className="flex items-center gap-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2.5 rounded-xl transition text-sm text-gray-700 dark:text-gray-200" role="menuitem" aria-label={t("notifications")}>
                <span>🔔 {t("notifications")}</span>
                {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>
              <button onClick={() => { setMenuOpen(false); signOut(); }} className="block w-full text-left hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2.5 rounded-xl transition text-sm text-red-600 dark:text-red-400 font-medium" role="menuitem">{t("signOut")}</button>
            </>
          ) : (
            <>
              <Link href="/auth/giris" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">{t("signIn")}</Link>
              <Link href="/auth/kayit" className="block bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-3 py-2.5 rounded-xl text-sm text-center shadow-sm" onClick={() => setMenuOpen(false)} role="menuitem">{t("register")}</Link>
            </>
          )}
        </div>
      )}
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
                  <button
                    key={n.id}
                    className={`w-full text-left flex gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${!n.read ? "bg-emerald-50/70 dark:bg-emerald-900/10" : ""}`}
                    onClick={() => {
                      setNotifOpen(false);
                      if (n.link && n.link !== "#") router.push(n.link);
                    }}
                  >
                    <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-base">
                      {n.type === "NEW_MESSAGE" ? "💬" : n.type === "NEW_MATCH" ? "🤝" : n.type === "NEW_RATING" ? "⭐" : n.type === "NEW_FOLLOWER" ? "👤" : n.type === "NO_SHOW_WARNING" ? "⚠️" : n.type === "TRAINER_VERIFIED" ? "✓" : "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug">{n.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{new Date(n.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                    {!n.read && <span className="shrink-0 w-2 h-2 bg-emerald-500 rounded-full mt-1.5" />}
                  </button>
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
