"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, differenceInYears } from "date-fns";
import { tr } from "date-fns/locale";
import type { ListingSummary } from "@/types";
import { LEVEL_LABELS, LEVEL_COLORS, GENDER_LABELS, STATUS_LABELS } from "@/types";

// Acil ilan geri sayım
function UrgentCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Süresi doldu"); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, "0")} kaldı`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return (
    <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-bold tabular-nums">
      🔴 {remaining}
    </span>
  );
}

// ─── Tür bazlı görsel konfigürasyonu ─────────────────────────────────────────
const LISTING_TYPE_CONFIG = {
  RIVAL: {
    label: "🥊 Rakip",
    accentColor: "border-l-orange-500",
    badgeVariant: "orange" as const,
    badgeCls: "text-orange-600 dark:text-orange-400",
  },
  PARTNER: {
    label: "🤝 Partner",
    accentColor: "border-l-emerald-500",
    badgeVariant: "emerald" as const,
    badgeCls: "text-emerald-600 dark:text-emerald-400",
  },
  TRAINER: {
    label: "🎓 Eğitmen",
    accentColor: "border-l-blue-500",
    badgeVariant: "blue" as const,
    badgeCls: "text-blue-600 dark:text-blue-400",
  },
  EQUIPMENT: {
    label: "🛒 Satılık",
    accentColor: "border-l-purple-500",
    badgeVariant: "purple" as const,
    badgeCls: "text-purple-600 dark:text-purple-400",
  },
} as const;

const GENDER_ICONS: Record<string, string> = {
  MALE: "♂️",
  FEMALE: "♀️",
  PREFER_NOT_TO_SAY: "👤",
};

type ListingCardProps = {
  listing: ListingSummary;
};

export default function ListingCard({ listing }: ListingCardProps) {
  const router = useRouter();

  const dateStr = format(new Date(listing.dateTime), "d MMM yyyy, HH:mm", {
    locale: tr,
  });

  const timeLeft = listing.expiresAt
    ? formatDistanceToNow(new Date(listing.expiresAt), { locale: tr, addSuffix: false })
    : null;

  const handleUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/profil/${listing.user.id}`);
  };

  const typeConfig = LISTING_TYPE_CONFIG[listing.type] ?? LISTING_TYPE_CONFIG.PARTNER;

  const isUrgent = !!(listing as any).isUrgent;

  return (
    <article
      onClick={() => router.push(`/ilan/${listing.id}`)}
      onKeyDown={(e) => e.key === "Enter" && router.push(`/ilan/${listing.id}`)}
      className={`rounded-xl border hover:shadow-md transition-all duration-200 cursor-pointer h-full relative group ${
        isUrgent
          ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700 border-l-[3px] border-l-red-500 ring-1 ring-red-200 dark:ring-red-800"
          : `bg-white dark:bg-gray-800 border-gray-200/80 dark:border-gray-700/60 border-l-[3px] ${typeConfig.accentColor} hover:border-gray-300 dark:hover:border-gray-600`
      }`}
      role="button"
      tabIndex={0}
      aria-label={`${listing.sport.name} ilanı detayı`}
    >
      <div className="p-4">
      {/* Üst etiketler */}
      <div className="flex flex-wrap gap-1.5 mb-2 items-center">
        <span className={`text-xs font-semibold ${typeConfig.badgeCls}`}>
          {typeConfig.label}
        </span>
        {(listing as any).isUrgent && (
          <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full font-bold animate-pulse">
            ⚡ ACİL
          </span>
        )}
        {(listing as any).isAnonymous && (
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            🕵️ Anonim
          </span>
        )}
        {listing.isQuick && timeLeft && (
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            ⚡ {timeLeft} kaldı
          </span>
        )}
        {(listing as any).isUrgent && (listing as any).expiresAt && (
          <UrgentCountdown expiresAt={(listing as any).expiresAt} />
        )}
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
        {listing.status && STATUS_LABELS[listing.status] && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_LABELS[listing.status].className}`}>
            {listing.status === "MATCHED" ? "🤝 " : listing.status === "OPEN" ? "🟢 " : ""}
            {STATUS_LABELS[listing.status].label}
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
            {listing.maxParticipants > 2 ? (
              <>👥 {listing._count.responses + 1}/{listing.maxParticipants}</>
            ) : (
              <>💬 {listing._count.responses} {listing.type === "TRAINER" ? "başvuru" : "karşılık"}</>
            )}
          </span>
          {listing.maxParticipants > 2 && (
            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-medium shrink-0">
              Grup
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
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg ${typeConfig.badgeCls} bg-gray-50 dark:bg-gray-700/60 group-hover:brightness-110 transition`}>
            Detay <span className="group-hover:translate-x-0.5 transition-transform inline-block">→</span>
          </span>
        </div>
      </div>
      </div>
    </article>
  );
}

