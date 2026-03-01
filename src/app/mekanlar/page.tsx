"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useDebounce } from "@/hooks/useDebounce";

interface VenueCard {
  id: string;
  businessName: string;
  address: string | null;
  description: string | null;
  sports: string[];
  images: string[];
  openingHours: string | null;
  capacity: number | null;
  isVerified: boolean;
  user: { id: string; name: string | null; avatarUrl: string | null };
  _count: { facilities: number };
}

const SPORT_LIST = ["Futbol", "Basketbol", "Tenis", "Yüzme", "Voleybol", "Badminton", "Boks", "Fitness"];

export default function MekanlarPage() {
  const [venues, setVenues]     = useState<VenueCard[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [sport, setSport]       = useState("");
  const [page, setPage]         = useState(1);

  const debouncedSearch = useDebounce(search, 300);

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (sport) params.set("sport", sport);
      params.set("page", String(page));
      params.set("limit", "12");

      const res = await fetch(`/api/mekanlar?${params}`);
      const json = await res.json();
      setVenues(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      // silence
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, sport, page]);

  useEffect(() => { fetchVenues(); }, [fetchVenues]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, sport]);

  const LIMIT = 12;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🏢 İşletmeler</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Tesisler, sahalar ve spor işletmelerini keşfet
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Mekan ara..."
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={sport}
            onChange={e => setSport(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Tüm sporlar</option>
            {SPORT_LIST.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {(search || sport) && (
            <button
              onClick={() => { setSearch(""); setSport(""); }}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              ✕ Temizle
            </button>
          )}
        </div>

        {/* Results count */}
        {!loading && total > 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{total} mekan bulundu</p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <div className="text-5xl mb-3">🏟️</div>
            <p className="font-medium">Mekan bulunamadı</p>
            <p className="text-sm mt-1">Filtrelerinizi değiştirmeyi deneyin</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {venues.map(v => (
              <VenueCardComponent key={v.id} venue={v} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              ← Önceki
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Sonraki →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function VenueCardComponent({ venue }: { venue: VenueCard }) {
  const coverImage = venue.images?.[0];

  return (
    <Link
      href={`/mekanlar/${venue.id}`}
      className="group bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      {/* Cover image */}
      <div className="relative h-40 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImage} alt={venue.businessName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🏟️</div>
        )}
        {venue.isVerified && (
          <span className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            ✓ Onaylı
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {venue.businessName}
        </h3>
        {venue.address && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">📍 {venue.address}</p>
        )}

        {/* Sports tags */}
        {venue.sports.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {venue.sports.slice(0, 3).map(s => (
              <span key={s} className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                {s}
              </span>
            ))}
            {venue.sports.length > 3 && (
              <span className="text-xs text-gray-400 px-1">+{venue.sports.length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 text-xs text-gray-500 dark:text-gray-400">
          {venue.openingHours ? (
            <span>🕐 {venue.openingHours}</span>
          ) : (
            <span className="invisible">-</span>
          )}
          {venue.capacity && (
            <span>👤 {venue.capacity} kişi</span>
          )}
        </div>
      </div>
    </Link>
  );
}
