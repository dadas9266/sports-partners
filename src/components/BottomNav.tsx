"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const navItems = [
  { href: "/", icon: HomeIcon, label: "Ana Sayfa" },
  { href: "/arama", icon: SearchIcon, label: "Keşfet" },
  { href: "/harita", icon: MapIcon, label: "Harita" },
  { href: "/sosyal", icon: SocialIcon, label: "Sosyal" },
];

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

function MapIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" fill={active ? "currentColor" : "none"} opacity={active ? "0.15" : "0"} />
      <polyline points="9 3 9 18" />
      <polyline points="15 6 15 21" />
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
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

  const currentPath = pathname ?? "";
  const shouldHide = currentPath.startsWith("/auth") || currentPath.startsWith("/admin");
  if (shouldHide) return null;

  const isActive = (href: string) => {
    const path = pathname ?? "";
    if (href === "/") return path === "/";
    return path.startsWith(href);
  };

  const profileActive = currentPath.startsWith("/profil");

  const handleProfileTap = () => {
    if (!session) {
      router.push("/auth/giris");
    } else {
      router.push("/profil");
    }
  };

  return (
    <nav
      aria-label="Alt menü"
      className="md:hidden fixed bottom-0 inset-x-0 z-[65] px-2 pb-2"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
    >
      <div className="mx-auto flex items-stretch h-[72px] max-w-md rounded-2xl border border-gray-200/90 dark:border-gray-700/80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
        {/* Sol taraf: Ana Sayfa, Keşfet, Sosyal */}
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors min-h-[56px] ${
                active
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              }`}
            >
              <span className={`rounded-xl p-1.5 ${active ? "bg-emerald-50 dark:bg-emerald-900/30" : ""}`}>
                <Icon active={active} />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}

        {/* Merkez: İlan Oluştur */}
        {session && (
          <Link
            href="/ilan/olustur"
            className="flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold min-h-[56px]"
          >
            <span className="flex items-center justify-center w-11 h-11 -mt-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg text-xl font-bold ring-4 ring-white dark:ring-gray-900">
              +
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">İlan</span>
          </Link>
        )}

        {/* Profil tab */}
        <button
          type="button"
          onClick={handleProfileTap}
          className={`flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors min-h-[56px] ${
            profileActive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
          aria-label="Profilim"
        >
          <span className={`rounded-xl p-1.5 ${profileActive ? "bg-emerald-50 dark:bg-emerald-900/30" : ""}`}>
            <ProfileIcon active={profileActive} />
          </span>
          <span>Profil</span>
        </button>
      </div>
    </nav>
  );
}
