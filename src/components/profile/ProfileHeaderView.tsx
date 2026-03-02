"use client";

import Link from "next/link";
import { differenceInYears } from "date-fns";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import { GENDER_LABELS } from "@/types";

const GENDER_ICONS: Record<string, string> = {
  MALE: "♂️",
  FEMALE: "♀️",
};

const LEVEL_CONFIG: Record<string, { label: string; cls: string }> = {
  BEGINNER: { label: "Acemi", cls: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300" },
  AMATEUR: { label: "Amatör", cls: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300" },
  SEMI_PRO: { label: "Yarı Pro", cls: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300" },
  PRO: { label: "⚡ Pro", cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300" },
};

interface ProfileHeaderViewProps {
  user: any;
  uploadingAvatar: boolean;
  uploadingCover: boolean;
  setUploadingAvatar: (v: boolean) => void;
  setUploadingCover: (v: boolean) => void;
  onEditClick: () => void;
  onUploadSuccess: () => void;
  onFollowerClick?: () => void;
  onFollowingClick?: () => void;
}

export default function ProfileHeaderView({
  user,
  uploadingAvatar,
  uploadingCover,
  setUploadingAvatar,
  setUploadingCover,
  onEditClick,
  onUploadSuccess,
  onFollowerClick,
  onFollowingClick,
}: ProfileHeaderViewProps) {
  const lvl = user.userLevel || "BEGINNER";
  const levelCfg = LEVEL_CONFIG[lvl] || LEVEL_CONFIG.BEGINNER;

  const handleCoverUpload = async (file: File) => {
    setUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append("type", "cover");
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) { onUploadSuccess(); toast.success("Kapak fotoğrafı güncellendi"); }
      else toast.error(json.error || "Yüklenemedi");
    } finally { setUploadingCover(false); }
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("type", "avatar");
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) { onUploadSuccess(); toast.success("Profil fotoğrafı güncellendi"); }
      else toast.error(json.error || "Yüklenemedi");
    } finally { setUploadingAvatar(false); }
  };

  return (
    <>
      {/* Kapak Fotoğrafı */}
      <div className="relative h-32 bg-gradient-to-r from-emerald-400 to-teal-500 group">
        {user.coverUrl && (
          <img src={user.coverUrl} alt="Kapak" className="w-full h-full object-cover" />
        )}
        <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition cursor-pointer">
          <span className="text-white text-sm font-semibold bg-black/40 px-3 py-1.5 rounded-lg">
            {uploadingCover ? "Yükleniyor..." : "📷 Kapak fotoğrafı değiştir"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadingCover}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }}
          />
        </label>
      </div>

      <div className="p-6">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="relative -mt-14 group">
            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-3xl overflow-hidden border-4 border-white dark:border-gray-800 shadow">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name?.charAt(0)?.toUpperCase() || "?"
              )}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer">
              <span className="text-white text-xs">📷</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingAvatar}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }}
              />
            </label>
          </div>

          {/* İsim + Bilgiler */}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{user.name}</h1>
              {/* Antrenör Rozeti — userType=TRAINER VEYA trainerProfile mevcutsa */}
              {(user.userType === "TRAINER" || user.trainerProfile) && (
                <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-700 whitespace-nowrap">
                  🏅 Antrenör{user.trainerProfile?.isVerified ? " ✓" : ""}
                </span>
              )}
              {/* Tesis Rozeti — userType=VENUE VEYA venueProfile mevcutsa */}
              {(user.userType === "VENUE" || user.venueProfile) && (
                <span className="inline-flex items-center gap-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-700 whitespace-nowrap">
                  🏟️ Tesis{user.venueProfile?.isVerified ? " ✓" : ""}
                </span>
              )}
              <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${levelCfg.cls}`}>
                {levelCfg.label}
              </span>
              <div className="flex items-center gap-1.5 text-sm">
                {user.gender && (
                  <span title={GENDER_LABELS[user.gender as keyof typeof GENDER_LABELS]}>
                    {GENDER_ICONS[user.gender] || "👤"}
                  </span>
                )}
                {user.birthDate && (
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-bold text-gray-600 dark:text-gray-400">
                    {differenceInYears(new Date(), new Date(user.birthDate))} Yaş
                  </span>
                )}
              </div>
            </div>

            <p className="text-gray-500 dark:text-gray-400">{user.email}</p>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {user.phone && <p className="text-gray-500 dark:text-gray-400 text-sm">📞 {user.phone}</p>}
              {user.city && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  📍 {user.city.name}{user.district?.name ? `, ${user.district.name}` : ""}
                </p>
              )}
            </div>

            {/* Sosyal İstatistikler — tıklanabilir */}
            <div className="flex gap-4 mt-2">
              <button
                onClick={onFollowerClick}
                className="text-sm text-left hover:text-emerald-600 dark:hover:text-emerald-400 transition group"
              >
                <span className="font-bold text-gray-800 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{user._count?.followers || 0}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">Takipçi</span>
              </button>
              <button
                onClick={onFollowingClick}
                className="text-sm text-left hover:text-emerald-600 dark:hover:text-emerald-400 transition group"
              >
                <span className="font-bold text-gray-800 dark:text-gray-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{user._count?.following || 0}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-1">Takip Edilen</span>
              </button>
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed line-clamp-3">{user.bio}</p>
            )}

            {/* Trainer Badges */}
            {user.trainerProfile?.isVerified && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {user.trainerProfile?.specialization && (
                  <span className="inline-flex items-center bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                    🎯 {user.trainerProfile.specialization}
                  </span>
                )}
                {user.trainerProfile?.experience && (
                  <span className="inline-flex items-center bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                    🏆 {user.trainerProfile.experience} Yıl Deneyim
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Sağ: Sosyal Medya + Düzenle */}
          <div className="flex flex-col items-end gap-2">
            {(user.instagram || user.tiktok || user.facebook || user.twitterX || user.vk) && (
              <div className="flex items-center gap-1.5">
                {user.instagram && (
                  <a href={`https://instagram.com/${user.instagram}`} target="_blank" rel="noopener noreferrer" title="Instagram"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white hover:opacity-80 transition-opacity">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                  </a>
                )}
                {user.tiktok && (
                  <a href={`https://tiktok.com/@${user.tiktok}`} target="_blank" rel="noopener noreferrer" title="TikTok"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-black text-white hover:opacity-80 transition-opacity">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.79a8.18 8.18 0 004.78 1.52V6.85a4.85 4.85 0 01-1.01-.16z"/></svg>
                  </a>
                )}
                {user.facebook && (
                  <a href={`https://facebook.com/${user.facebook}`} target="_blank" rel="noopener noreferrer" title="Facebook"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white hover:opacity-80 transition-opacity">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  </a>
                )}
                {user.twitterX && (
                  <a href={`https://x.com/${user.twitterX}`} target="_blank" rel="noopener noreferrer" title="X (Twitter)"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-black text-white hover:opacity-80 transition-opacity">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  </a>
                )}
                {user.vk && (
                  <a href={`https://vk.com/${user.vk}`} target="_blank" rel="noopener noreferrer" title="VK"
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-500 text-white hover:opacity-80 transition-opacity">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2zm3.08 13.5h-1.64c-.63 0-.82-.52-1.93-1.63-.96-.96-1.39-.96-1.39 0 0 1.63-.43 1.63-1.08 1.63-1.67 0-3.52-1.04-4.82-2.84-1.96-2.73-2.5-4.72-2.5-5.12 0-.18.15-.35.35-.35h1.64c.26 0 .35.15.44.38.51 1.57 1.39 2.95 1.74 2.95.14 0 .2-.06.2-.38V9.35c-.04-.62-.35-.67-.35-.89 0-.15.12-.3.3-.3h2.57c.22 0 .3.12.3.35v2.74c0 .22.09.3.16.3.14 0 .27-.08.55-.38.87-.99 1.5-2.51 1.5-2.51.09-.2.25-.38.5-.38h1.64c.49 0 .6.25.49.56-.21.64-2.08 2.66-2.08 2.66-.16.24-.22.35 0 .61.16.2.69.74 1.05 1.17.65.73 1.14 1.35 1.27 1.78.14.42-.08.64-.49.64z"/></svg>
                  </a>
                )}
              </div>
            )}
            <Button variant="secondary" size="sm" onClick={onEditClick}>
              Düzenle
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
