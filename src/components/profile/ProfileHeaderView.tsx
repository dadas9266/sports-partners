"use client";

import { differenceInYears } from "date-fns";
import { useLocale } from "next-intl";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import TrainerBadgePopup from "@/components/profile/TrainerBadgePopup";
import SocialLinksRow from "@/components/social/SocialLinksRow";
import { getCompetitiveLevelLabel } from "@/lib/localized-ui";

const GENDER_ICONS: Record<string, string> = { MALE: "♂️", FEMALE: "♀️" };

const LEVEL_CONFIG: Record<string, { cls: string }> = {
  BEGINNER: { cls: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
  AMATEUR:  { cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  SEMI_PRO: { cls: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  PRO:      { cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
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
  const locale = useLocale();
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
    <div>

      {/* ── COVER ────────────────────────────────────────── */}
      <div className="relative h-40 sm:h-48 bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 group overflow-hidden">
        {user.coverUrl && (
          <img src={user.coverUrl} alt="Kapak" className="w-full h-full object-cover" />
        )}

        {/* Cover upload overlay */}
        <label className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition cursor-pointer z-10">
          <span className="text-white text-sm font-semibold bg-black/50 px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition backdrop-blur-sm">
            {uploadingCover ? "⏳ Yükleniyor..." : "📷 Kapak Değiştir"}
          </span>
          <input type="file" accept="image/*" className="hidden" disabled={uploadingCover}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverUpload(f); }} />
        </label>

      </div>

      {/* ── PROFILE INFO ─────────────────────────────────── */}
      <div className="px-4 sm:px-5">
        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-3">
          <div className="relative group shrink-0">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] border-white dark:border-gray-900 shadow-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-2xl sm:text-3xl font-bold text-emerald-600">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name?.charAt(0)?.toUpperCase() || "?"
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer">
                {uploadingAvatar
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <span className="text-white text-[10px] font-bold text-center leading-tight">📷<br/>Değiştir</span>
                }
                <input type="file" accept="image/*" className="hidden" disabled={uploadingAvatar}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />
              </label>
            </div>
          </div>

          {/* Social icons — right side */}
          <SocialLinksRow
            links={{
              instagram: user.instagram,
              tiktok: user.tiktok,
              facebook: user.facebook,
              twitterX: user.twitterX,
              vk: user.vk,
              telegram: user.telegram,
              whatsapp: user.whatsapp,
            }}
            className="justify-end pb-1"
          />
        </div>

        {/* Name + info */}
        <div className="mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">{user.name}</h1>
            {(user.userType === "TRAINER" || user.trainerProfile) && (
              <TrainerBadgePopup
                trainerProfile={user.trainerProfile ?? { isVerified: false }}
                user={{
                  name: user.name,
                  avatarUrl: user.avatarUrl,
                  birthDate: user.birthDate,
                  city: user.city,
                }}
                isOwn={true}
              />
            )}
            {(user.userType === "VENUE" || user.venueProfile) && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                🏟️ Tesis{user.venueProfile?.isVerified ? " ✓" : ""}
              </span>
            )}
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${levelCfg.cls}`}>
              {getCompetitiveLevelLabel(lvl, locale)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {user.city && (
              <span>{user.city.name}{user.district?.name ? `, ${user.district.name}` : ""}</span>
            )}
            {user.gender && (
              <span>· {GENDER_ICONS[user.gender] || ""}</span>
            )}
            {user.birthDate && (
              <span>· {differenceInYears(new Date(), new Date(user.birthDate))} yaşında</span>
            )}
          </div>
        </div>

        {/* Stats — clean inline row */}
        <div className="flex items-center gap-4 text-sm mb-3">
          <button onClick={onFollowerClick} className="hover:text-emerald-600 transition">
            <strong className="text-gray-900 dark:text-white">{user._count?.followers || 0}</strong> <span className="text-gray-500 dark:text-gray-400">takipçi</span>
          </button>
          <button onClick={onFollowingClick} className="hover:text-emerald-600 transition">
            <strong className="text-gray-900 dark:text-white">{user._count?.following || 0}</strong> <span className="text-gray-500 dark:text-gray-400">takip</span>
          </button>
          <span><strong className="text-gray-900 dark:text-white">{user.totalMatches || 0}</strong> <span className="text-gray-500 dark:text-gray-400">maç</span></span>
          {(user.currentStreak || 0) > 0 && (
            <span className="text-orange-500"><strong>🔥 {user.currentStreak}</strong> <span className="text-gray-500 dark:text-gray-400">seri</span></span>
          )}
        </div>

        <div className="mb-3">
          <button
            type="button"
            onClick={onEditClick}
            className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition"
          >
            ✏️ Profili Düzenle
          </button>
        </div>

        {user.bio && (
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">{user.bio}</p>
        )}
      </div>
    </div>
  );
}
