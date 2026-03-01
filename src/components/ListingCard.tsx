"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, differenceInYears } from "date-fns";
import { tr } from "date-fns/locale";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import type { ListingSummary } from "@/types";
import { LEVEL_LABELS, LEVEL_COLORS, GENDER_LABELS } from "@/types";
import { toggleFavorite } from "@/services/api";

// ─── Tür bazlı görsel konfigürasyonu ─────────────────────────────────────────
const LISTING_TYPE_CONFIG = {
  RIVAL: {
    label: "🥊 Rakip Arıyor",
    borderColor: "border-l-orange-500",
    bgGradient: "from-orange-50/60 dark:from-orange-900/10",
    hoverBorder: "hover:border-orange-300/60 dark:hover:border-orange-700/50",
    badgeVariant: "orange" as const,
    headerBg: "bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-800/30",
    iconColor: "text-orange-600 dark:text-orange-400",
  },
  PARTNER: {
    label: "🤝 Partner Arıyor",
    borderColor: "border-l-emerald-500",
    bgGradient: "from-emerald-50/60 dark:from-emerald-900/10",
    hoverBorder: "hover:border-emerald-200/60 dark:hover:border-emerald-700/40",
    badgeVariant: "emerald" as const,
    headerBg: "bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-800/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  TRAINER: {
    label: "🎓 Eğitmen",
    borderColor: "border-l-blue-500",
    bgGradient: "from-blue-50/60 dark:from-blue-900/10",
    hoverBorder: "hover:border-blue-300/60 dark:hover:border-blue-700/50",
    badgeVariant: "blue" as const,
    headerBg: "bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  EQUIPMENT: {
    label: "🛒 Satılık",
    borderColor: "border-l-purple-500",
    bgGradient: "from-purple-50/60 dark:from-purple-900/10",
    hoverBorder: "hover:border-purple-300/60 dark:hover:border-purple-700/50",
    badgeVariant: "purple" as const,
    headerBg: "bg-purple-50 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-800/30",
    iconColor: "text-purple-600 dark:text-purple-400",
  },
} as const;

const GENDER_ICONS: Record<string, string> = {
  MALE: "♂️",
  FEMALE: "♀️",
  PREFER_NOT_TO_SAY: "👤",
};

type ListingCardProps = {
  listing: ListingSummary;
  isFavorited?: boolean;
  onFavoriteChange?: (listingId: string, favorited: boolean) => void;
};

export default function ListingCard({
  listing,
  isFavorited = false,
  onFavoriteChange,
}: ListingCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [favorited, setFavorited] = useState(isFavorited);
  const [favLoading, setFavLoading] = useState(false);

  const dateStr = format(new Date(listing.dateTime), "d MMM yyyy, HH:mm", {
    locale: tr,
  });

  const timeLeft = listing.expiresAt
    ? formatDistanceToNow(new Date(listing.expiresAt), { locale: tr, addSuffix: false })
    : null;

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!session) {
      toast.error("Favorilere eklemek için giriş yapın");
      return;
    }
    setFavLoading(true);
    try {
      const res = await toggleFavorite(listing.id);
      if (res.success) {
        const next = res.data?.favorited ?? !favorited;
        setFavorited(next);
        onFavoriteChange?.(listing.id, next);
        toast.success(next ? "Favorilere eklendi" : "Favorilerden kaldırıldı");
      }
    } catch {
      toast.error("İşlem başarısız");
    } finally {
      setFavLoading(false);
    }
  };

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/profil/${listing.user.id}`);
  };

  const typeConfig = LISTING_TYPE_CONFIG[listing.type] ?? LISTING_TYPE_CONFIG.PARTNER;

  return (
    <article
      onClick={() => router.push(`/ilan/${listing.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/ilan/${listing.id}`)}
      className={`bg-gradient-to-br ${typeConfig.bgGradient} to-white dark:to-gray-800/80 rounded-2xl shadow-sm border border-gray-100/80 dark:border-gray-700/50 border-l-4 ${typeConfig.borderColor} hover:shadow-lg ${typeConfig.hoverBorder} transition-all duration-200 cursor-pointer h-full relative group overflow-hidden`}
      role="button"
      tabIndex={0}
      aria-label={`${listing.sport.name} ilanı detayı`}
    >
      {/* Tür başlık şeridi */}
      <div className={`flex items-center justify-between px-4 py-2 ${typeConfig.headerBg}`}>
        <span className={`text-xs font-bold tracking-wide ${typeConfig.iconColor}`}>
          {typeConfig.label}
        </span>
        {listing.isQuick && timeLeft && (
          <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full font-semibold">
            ⚡ {timeLeft} kaldı
          </span>
        )}
      </div>

      <div className="p-5">
      {/* Favori Butonu */}
      <button
        onClick={handleFavorite}
        disabled={favLoading}
        className={`absolute top-10 right-3 text-lg transition-all hover:scale-125 disabled:opacity-60 z-10 w-8 h-8 flex items-center justify-center rounded-full ${
          favorited
            ? "text-red-500 bg-red-50 dark:bg-red-900/30"
            : "text-gray-300 dark:text-gray-600 hover:text-red-400 bg-gray-50 dark:bg-gray-700/50"
        }`}
        aria-label={favorited ? "Favorilerden kaldır" : "Favorilere ekle"}
        title={favorited ? "Favorilerden kaldır" : "Favorilere ekle"}
      >
        {favorited ? "❤️" : "🤍"}
      </button>

      {/* Üst etiketler (cinsiyet filtresi, uyumluluk) */}
      <div className="flex flex-wrap gap-1 mb-2">
        {listing.allowedGender === "FEMALE_ONLY" && (
          <span className="text-xs bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 px-2 py-0.5 rounded-full font-semibold">
            👩 Yalnızca Kadınlar
          </span>
        )}
        {listing.allowedGender === "MALE_ONLY" && (
          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-semibold">
            👨 Yalnızca Erkekler
          </span>
        )}
        {typeof listing.compatibilityScore === "number" && listing.compatibilityScore > 0 && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              listing.compatibilityScore >= 70
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                : listing.compatibilityScore >= 40
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
            }`}
          >
            🎯 %{listing.compatibilityScore} uyumlu
          </span>
        )}
      </div>

      <div className="flex items-start justify-between mb-3 pr-8">
        <div className="flex items-center gap-2">
          <span
            className="text-2xl"
            role="img"
            aria-label={listing.sport.name}
          >
            {listing.sport.icon || "🏅"}
          </span>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-100">
              {listing.sport.name}
            </h3>
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${LEVEL_COLORS[listing.level]}`}
        >
          {LEVEL_LABELS[listing.level]}
        </span>
      </div>

      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <span role="img" aria-label="konum">📍</span>
          <span>
            {listing.district?.city?.name}, {listing.district?.name}
          </span>
        </div>
        {listing.venue && (
          <div className="flex items-center gap-1">
            <span role="img" aria-label="mekan">🏟️</span>
            <span>{listing.venue.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <span role="img" aria-label="tarih">📅</span>
          <time dateTime={listing.dateTime}>{dateStr}</time>
        </div>
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <div 
              onClick={handleUserClick}
              className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-200 dark:border-gray-600 flex-shrink-0 cursor-pointer"
            >
              {listing.user.avatarUrl ? (
                <img 
                  src={listing.user.avatarUrl} 
                  alt={listing.user.name} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-[10px] font-bold text-gray-500">{listing.user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <button
              onClick={handleUserClick}
              className="hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline transition font-medium truncate max-w-[120px]"
            >
              {listing.user.name}
            </button>
            <div className="flex items-center gap-1.5 text-xs">
              {listing.user.gender && (
                <span title={GENDER_LABELS[listing.user.gender]} className="opacity-70">
                  {GENDER_ICONS[listing.user.gender]}
                </span>
              )}
              {(() => {
                const age = listing.user.birthDate ? differenceInYears(new Date(), new Date(listing.user.birthDate)) : null;
                return age ? <span className="text-gray-400 dark:text-gray-500 font-bold">{age}</span> : null;
              })()}
            </div>
          </div>
        </div>
      </div>

      {listing.description && (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
          {listing.description}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
            💬 {listing._count.responses} {listing.type === "TRAINER" ? "başvuru" : "karşılık"}
          </span>
          {listing.maxParticipants > 2 && (
            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-medium shrink-0">
              👥 {listing.maxParticipants} kişi
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {listing.type === "EQUIPMENT" && listing.equipmentDetail && (
            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
              💰 {listing.equipmentDetail.price.toLocaleString("tr-TR")} ₺
            </span>
          )}
          {listing.type === "TRAINER" && listing.trainerProfile?.hourlyRate && (
            <span className="text-sm font-bold text-blue-700 dark:text-blue-400">
              {listing.trainerProfile.hourlyRate.toLocaleString("tr-TR")} ₺<span className="text-xs font-normal opacity-70">/sa</span>
            </span>
          )}
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg ${typeConfig.iconColor} bg-white/70 dark:bg-gray-700/60 border border-current/20 group-hover:brightness-110 transition`}>
            Detay <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
          </span>
        </div>
      </div>
      </div>
    </article>
  );
}

