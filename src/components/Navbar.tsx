"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import Dropdown from "@/components/ui/Dropdown";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Gerçek zamanlı bildirimler — NotificationContext'ten (SSE Providers.tsx'de açık)
  const { notifications, unreadCount, unreadMessages, markAllRead } = useNotifications();

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
    if (!menuOpen && !notifOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen, notifOpen]);

  const handleOpenNotif = async () => {
    setNotifOpen((v) => !v);
    if (!notifOpen && unreadCount > 0) {
      await markAllRead();
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

  return (
    <nav
      ref={navRef}
      className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl text-gray-800 dark:text-gray-100 shadow-sm border-b border-gray-200/60 dark:border-gray-700/60 sticky top-0 z-50"
      role="navigation"
      aria-label="Ana navigasyon"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center gap-1 md:gap-2">
            <Link href="/" className="text-xl font-bold flex items-center gap-2 mr-2" aria-label="SporPartner Ana Sayfa">
              <span className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white text-sm font-black shadow-sm">SP</span>
              <span className="hidden sm:inline text-lg font-extrabold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">SporPartner</span>
            </Link>
            <Link href="/" className="hover:bg-gray-100 dark:hover:bg-gray-800 px-2.5 py-1.5 rounded-lg transition text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400" aria-label="İlanlar">
              <span className="text-base">📋</span>
            </Link>
            <Link href="/harita" className="hover:bg-gray-100 dark:hover:bg-gray-800 px-2.5 py-1.5 rounded-lg transition text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400" aria-label="Harita">
              <span className="text-base">🗺️</span>
            </Link>
            <Link href="/sosyal" className="hover:bg-gray-100 dark:hover:bg-gray-800 px-2.5 py-1.5 rounded-lg transition text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400" aria-label="Sosyal">
              <span className="text-base">🌐</span>
            </Link>
            <Link href="/topluluklar" className="hover:bg-gray-100 dark:hover:bg-gray-800 px-2.5 py-1.5 rounded-lg transition text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400" aria-label="Topluluklar">
              <span className="text-base">🏛️</span>
            </Link>
            <Link href="/turnuvalar" className="hover:bg-gray-100 dark:hover:bg-gray-800 px-2.5 py-1.5 rounded-lg transition text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400" aria-label="Turnuvalar">
              <span className="text-base">🏆</span>
            </Link>
            <Link href="/arama" className="hover:bg-gray-100 dark:hover:bg-gray-800 px-2.5 py-1.5 rounded-lg transition text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400" aria-label="Ara">
              <span className="text-base">🔍</span>
            </Link>
          </div>

          <div className="flex-1 flex justify-center">
            {session && (
              <Link href="/ilan/olustur" className="group">
                <Button variant="primary" size="lg" className="shadow-md px-5 py-1.5 text-sm font-bold tracking-wide relative overflow-hidden transition-all group-hover:scale-105 bg-gradient-to-r from-emerald-500 to-teal-600 border-0 rounded-xl">
                  <span className="relative z-10">+ İlan Oluştur</span>
                </Button>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {session ? (
              <>
                <Link href="/mesajlar" className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition" aria-label="Mesajlar">
                  <span className="text-base">💬</span>
                  {unreadMessages > 0 && (
                    <Badge variant="blue" size="sm">{unreadMessages > 9 ? "9+" : unreadMessages}</Badge>
                  )}
                </Link>
                <div className="relative" ref={notifRef}>
                  <button onClick={handleOpenNotif} className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition" aria-label="Bildirimler">
                    <span className="text-base">🔔</span>
                    {unreadCount > 0 && (
                      <Badge variant="red" size="sm">{unreadCount > 9 ? "9+" : unreadCount}</Badge>
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
                  <Link href="/profil" className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30">Profilim</Link>
                  <Link href="/mekan-profil" className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30">Mekanım</Link>
                  <Link href="/topluluklarim" className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30">Topluluklarım</Link>
                  <Link href="/ayarlar" className="block px-4 py-2 text-sm hover:bg-emerald-50 dark:hover:bg-emerald-900/30">Ayarlar</Link>
                  <button onClick={() => signOut()} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30">
                    Çıkış Yap
                  </button>
                </Dropdown>
                <button onClick={toggleDarkMode} className="ml-1 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition" aria-label="Tema Değiştir">
                  {darkMode ? <span className="text-base">🌙</span> : <span className="text-base">☀️</span>}
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/giris" className="hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded-lg transition text-sm font-medium">Giriş Yap</Link>
                <Link href="/auth/kayit" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-4 py-1.5 rounded-xl hover:opacity-90 transition text-sm shadow-sm">Kayıt Ol</Link>
                <button onClick={toggleDarkMode} className="ml-1 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition" aria-label="Tema Değiştir">
                  {darkMode ? <span className="text-base">🌙</span> : <span className="text-base">☀️</span>}
                </button>
              </>
            )}
            <button className="md:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition" onClick={() => setMenuOpen((v) => !v)} aria-label="Menüyü aç/kapat" aria-expanded={menuOpen} aria-controls="mobile-menu">
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
          <Link href="/" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">📋 İlanlar</Link>
          <Link href="/harita" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🗺️ Harita</Link>
          <Link href="/liderlik" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🏅 Liderlik Tablosu</Link>
          <Link href="/sosyal" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🌐 Sosyal Akış</Link>
          <Link href="/topluluklar" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🏛️ Topluluklar</Link>
          <Link href="/turnuvalar" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🏆 Turnuvalar</Link>
          <Link href="/arama" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🔍 Ara</Link>
          {session ? (
            <>
              <Link href="/ilan/olustur" className="block bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-3 py-2.5 rounded-xl text-sm text-center shadow-sm" onClick={() => setMenuOpen(false)} role="menuitem">+ İlan Oluştur</Link>
              <Link href="/profil" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">👤 Profilim</Link>
              <Link href="/ayarlar" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">⚙️ Ayarlar</Link>
              <Link href="/mekan-profil" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">🏙️ Mekan Profili</Link>
              <Link href="/mesajlar" className="flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2.5 rounded-xl transition text-sm text-gray-700 dark:text-gray-200" onClick={() => setMenuOpen(false)} role="menuitem">
                <span>💬 Mesajlar</span>
                {unreadMessages > 0 && <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{unreadMessages > 9 ? "9+" : unreadMessages}</span>}
              </Link>
              <button onClick={() => { setMenuOpen(false); handleOpenNotif(); }} className="flex items-center gap-2 w-full text-left hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2.5 rounded-xl transition text-sm text-gray-700 dark:text-gray-200" role="menuitem" aria-label="Bildirimler">
                <span>🔔 Bildirimler</span>
                {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{unreadCount > 9 ? "9+" : unreadCount}</span>}
              </button>
              <button onClick={() => { setMenuOpen(false); signOut(); }} className="block w-full text-left hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2.5 rounded-xl transition text-sm text-red-600 dark:text-red-400 font-medium" role="menuitem">Çıkış</button>
            </>
          ) : (
            <>
              <Link href="/auth/giris" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">Giriş Yap</Link>
              <Link href="/auth/kayit" className="block bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold px-3 py-2.5 rounded-xl text-sm text-center shadow-sm" onClick={() => setMenuOpen(false)} role="menuitem">Kayıt Ol</Link>
            </>
          )}
        </div>
      )}

      {notifOpen && session && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]" onClick={() => setNotifOpen(false)} aria-hidden="true" />
          <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl z-[70] flex flex-col" role="dialog" aria-label="Bildirimler">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔔</span>
                <span className="font-bold text-gray-800 dark:text-gray-100 text-base">Bildirimler</span>
                {unreadCount > 0 && <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
              </div>
              <button onClick={() => setNotifOpen(false)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition" aria-label="Kapat">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <span className="text-5xl">🔕</span>
                  <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">Bildirim yok</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <a
                    key={n.id}
                    href={n.link ?? "#"}
                    className={`flex gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-50 dark:border-gray-700/50 last:border-0 ${!n.read ? "bg-emerald-50/70 dark:bg-emerald-900/10" : ""}`}
                    onClick={() => setNotifOpen(false)}
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
                  </a>
                ))
              )}
            </div>
            {notifications.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
                <p className="text-xs text-center text-gray-400 dark:text-gray-500">{notifications.length} bildirim gösteriliyor</p>
              </div>
            )}
          </div>
        </>
      )}
    </nav>
  );
}
