"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

/* ── Static nav tabs (Profile handled separately) ── */
const navItems = [
  { href: "/", icon: HomeIcon, label: "Ana Sayfa" },
  { href: "/arama", icon: SearchIcon, label: "Arama" },
  { href: "/sosyal", icon: SocialIcon, label: "Sosyal" },
];

/* ── Profile quick-menu items ── */
const PROFILE_MENU = [
  { href: "/ayarlar/profil", icon: "👤", label: "Profili Düzenle", desc: "Ad, biyografi, konum, fotoğraf" },
  { href: "/ayarlar/guvenlik", icon: "🔒", label: "Hesap Güvenliği", desc: "Şifre ve e-posta değiştir" },
  { href: "/ayarlar/profesyonel", icon: "⭐", label: "Profesyonel Hesap", desc: "Antrenör veya tesis başvurusu" },
  { href: "/ayarlar/isletme", icon: "🏟️", label: "İşletme Yönetimi", desc: "Tesis profili, ilanlar, galeri" },
  { href: "/ayarlar/gizlilik", icon: "🛡️", label: "Gizlilik", desc: "Hesap görünürlüğü, engellenenler" },
  { href: "/topluluklar", icon: "🌐", label: "Topluluklar", desc: "Gruplar, kulüpler ve takımlar" },
];

/* ── SVG Icons ── */
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function SocialIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "0" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => {
    const path = pathname ?? "";
    if (href === "/") return path === "/";
    return path.startsWith(href);
  };

  const profileActive = (pathname ?? "").startsWith("/profil") || (pathname ?? "").startsWith("/ayarlar");

  // Close sheet on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [menuOpen]);

  // Close on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const handleProfileTap = useCallback(() => {
    if (!session) {
      router.push("/auth/giris");
      return;
    }
    setMenuOpen((v) => !v);
  }, [session, router]);

  return (
    <>
      {/* Floating Action Button */}
      {session && (
        <Link
          href="/ilan/olustur"
          aria-label="İlan Oluştur"
          className="md:hidden fixed bottom-20 right-4 z-50 w-14 h-14 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center transition-all"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </Link>
      )}

      {/* ── Profile Quick-Menu Sheet (slide-up) ── */}
      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px] transition-opacity duration-200 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`md:hidden fixed inset-x-0 bottom-16 z-[70] transform transition-all duration-300 ease-out ${
          menuOpen ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0 pointer-events-none"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-3 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-black/20 border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
          {/* Handle bar */}
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>

          {/* Profile quick link */}
          {session?.user && (
            <Link
              href={`/profil/${(session.user as { id?: string }).id ?? ""}`}
              className="flex items-center gap-3 mx-3 mb-2 px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/40 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold">
                {(session.user.name ?? "?")[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{session.user.name}</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Profilimi Görüntüle →</p>
              </div>
            </Link>
          )}

          {/* Menu items */}
          <div className="px-3 pb-3 space-y-0.5">
            {PROFILE_MENU.map((item) => {
              const active = (pathname ?? "").startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    active
                      ? "bg-gray-100 dark:bg-gray-800"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }`}
                >
                  <span className="text-lg w-7 text-center flex-shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.label}</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{item.desc}</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 dark:text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bottom Navigation Bar ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-[65] bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-700/80"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-16">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  active
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                <Icon active={active} />
                <span>{label}</span>
              </Link>
            );
          })}

          {/* Profile tab — opens slide-up sheet */}
          <button
            type="button"
            onClick={handleProfileTap}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              profileActive || menuOpen
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            }`}
            aria-label="Profil menüsü"
            aria-expanded={menuOpen}
          >
            <ProfileIcon active={profileActive || menuOpen} />
            <span>Profil</span>
          </button>
        </div>
      </nav>
    </>
  );
}
