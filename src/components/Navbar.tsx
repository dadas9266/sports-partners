"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef, useCallback } from "react";
import { getNotifications, markNotificationsRead } from "@/services/api";
import type { Notification } from "@/types";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!session) return;
    try {
      const data = await getNotifications();
      setNotifications(data.data ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // sessiz hata
    }
  }, [session]);

  // SSE — gerçek zamanlı bildirimler + mesaj sayısı
  useEffect(() => {
    if (!session) return;
    const sse = new EventSource("/api/notifications/stream");
    sseRef.current = sse;

    sse.addEventListener("notifications", (e) => {
      try {
        const payload = JSON.parse(e.data) as { count: number };
        if (payload.count > 0) {
          setUnreadCount((prev) => prev + payload.count);
          fetchNotifications();
        }
      } catch { /* ignore */ }
    });

    sse.addEventListener("heartbeat", (e) => {
      try {
        const payload = JSON.parse(e.data) as { unreadMessages: number };
        setUnreadMessages(payload.unreadMessages ?? 0);
      } catch { /* ignore */ }
    });

    sse.onerror = () => {
      sse.close();
    };

    return () => {
      sse.close();
      sseRef.current = null;
    };
  }, [session, fetchNotifications]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Close mobile menu on outside click
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
      await markNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
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

  const linkClass = "hover:bg-emerald-700 dark:hover:bg-emerald-800 px-3 py-2 rounded transition";
  const mobileLinkClass = "block hover:bg-emerald-700 dark:hover:bg-emerald-800 px-3 py-2 rounded transition";

  return (
    <nav ref={navRef} className="bg-emerald-600 dark:bg-emerald-800 text-white shadow-lg sticky top-0 z-50" role="navigation" aria-label="Ana navigasyon">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-14">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold flex items-center gap-2" aria-label="SporPartner Ana Sayfa">
            <span role="img" aria-label="kupa">🏆</span>
            <span>SporPartner</span>
          </Link>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/" className={linkClass}>
              İlanlar
            </Link>
            <Link href="/harita" className={linkClass}>
              🗺️ Harita
            </Link>
            <Link href="/liderlik" className={linkClass}>
              🏅 Liderlik
            </Link>
            {session ? (
              <>
                <Link
                  href="/ilan/olustur"
                  className="bg-white text-emerald-700 font-semibold px-3 py-2 rounded hover:bg-emerald-50 transition"
                >
                  + İlan Oluştur
                </Link>
                <Link href="/profil" className={linkClass}>
                  Profilim
                </Link>
                {/* Mesajlar */}
                <Link href="/mesajlar" className={`relative ${linkClass}`} aria-label="Mesajlar">
                  💬
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </Link>
                {/* Bildirim Bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={handleOpenNotif}
                    className={`relative ${linkClass}`}
                    aria-label="Bildirimler"
                  >
                    🔔
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                  {/* Dropdown */}
                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                        <span className="font-semibold text-gray-800 dark:text-gray-100">Bildirimler</span>
                        <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
                      </div>
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm">Bildirim yok</p>
                        ) : (
                          notifications.slice(0, 10).map((n) => (
                            <a
                              key={n.id}
                              href={n.link ?? "#"}
                              className={`block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition border-b border-gray-50 dark:border-gray-700 last:border-0 ${!n.read ? "bg-emerald-50 dark:bg-emerald-900/10" : ""}`}
                              onClick={() => setNotifOpen(false)}
                            >
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{n.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.body}</p>
                            </a>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => signOut()}
                  className={linkClass}
                  aria-label="Çıkış yap"
                >
                  Çıkış
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/giris" className={linkClass}>
                  Giriş Yap
                </Link>
                <Link
                  href="/auth/kayit"
                  className="bg-white text-emerald-700 font-semibold px-3 py-2 rounded hover:bg-emerald-50 transition"
                >
                  Kayıt Ol
                </Link>
              </>
            )}
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded hover:bg-emerald-700 dark:hover:bg-emerald-900 transition"
              aria-label={darkMode ? "Açık tema" : "Koyu tema"}
              title={darkMode ? "Açık temaya geç" : "Koyu temaya geç"}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded hover:bg-emerald-700 transition"
              aria-label={darkMode ? "Açık tema" : "Koyu tema"}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
            <button
              className="p-2"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div id="mobile-menu" className="md:hidden pb-4 space-y-2" role="menu">
            <Link href="/" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">
              İlanlar
            </Link>
            <Link href="/harita" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">
              🗺️ Harita
            </Link>
            <Link href="/liderlik" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">
              🏅 Liderlik Tablosu
            </Link>
            {session ? (
              <>
                <Link
                  href="/ilan/olustur"
                  className="block bg-white text-emerald-700 font-semibold px-3 py-2 rounded"
                  onClick={() => setMenuOpen(false)}
                  role="menuitem"
                >
                  + İlan Oluştur
                </Link>
                <Link href="/profil" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">
                  Profilim
                </Link>
                <Link href="/mesajlar" className="flex items-center gap-2 hover:bg-emerald-700 dark:hover:bg-emerald-800 px-3 py-2 rounded transition" onClick={() => setMenuOpen(false)} role="menuitem">
                  <span>💬 Mesajlar</span>
                  {unreadMessages > 0 && (
                    <span className="bg-blue-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </Link>
                <button
                  onClick={() => { setMenuOpen(false); handleOpenNotif(); }}
                  className="flex items-center gap-2 w-full text-left hover:bg-emerald-700 dark:hover:bg-emerald-800 px-3 py-2 rounded transition"
                  role="menuitem"
                  aria-label="Bildirimler"
                >
                  <span>🔔 Bildirimler</span>
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setMenuOpen(false); signOut(); }}
                  className="block w-full text-left hover:bg-emerald-700 px-3 py-2 rounded transition"
                  role="menuitem"
                >
                  Çıkış
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/giris" className={mobileLinkClass} onClick={() => setMenuOpen(false)} role="menuitem">
                  Giriş Yap
                </Link>
                <Link
                  href="/auth/kayit"
                  className="block bg-white text-emerald-700 font-semibold px-3 py-2 rounded"
                  onClick={() => setMenuOpen(false)}
                  role="menuitem"
                >
                  Kayıt Ol
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
