import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import type { ListingSummary } from "@/types";
import { LEVEL_LABELS, LEVEL_COLORS } from "@/types";
import Badge from "@/components/ui/Badge";

type ListingCardProps = {
  listing: ListingSummary;
};

export default function ListingCard({ listing }: ListingCardProps) {
  const dateStr = format(new Date(listing.dateTime), "d MMM yyyy, HH:mm", {
    locale: tr,
  });

  return (
    <Link href={`/ilan/${listing.id}`} aria-label={`${listing.sport.name} ilanı detayı`}>
      <article className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition cursor-pointer h-full">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label={listing.sport.name}>
              {listing.sport.icon || "🏅"}
            </span>
            <div>
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                {listing.sport.name}
              </h3>
              <Badge variant={listing.type === "RIVAL" ? "orange" : "emerald"}>
                {listing.type === "RIVAL"
                  ? "🥊 Rakip Arıyor"
                  : "🤝 Partner Arıyor"}
              </Badge>
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
              {listing.district.city.name}, {listing.district.name}
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
          <div className="flex items-center gap-1">
            <span role="img" aria-label="kullanıcı">👤</span>
            <span>{listing.user.name}</span>
          </div>
        </div>

        {listing.description && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {listing.description}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {listing._count.responses} karşılık
          </span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            Detay →
          </span>
        </div>
      </article>
    </Link>
  );
}
