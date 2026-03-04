"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import FilterBar from "@/components/FilterBar";
import ListingCard from "@/components/ListingCard";
import Pagination from "@/components/ui/Pagination";
import { getListings, getFeed, getRecommendations } from "@/services/api";
import type { ListingSummary, Country, Sport } from "@/types";

interface NearbyListing {
  id: string;
  distance: number;
  type: string;
  description: string | null;
  level: string;
  dateTime: Date;
  maxParticipants: number;
  sportName: string;
  sportIcon: string;
  userName: string | null;
  userAvatar: string | null;
  userId: string;
}

const TYPE_LABELS: Record<string, string> = {
  RIVAL: "🥊 Rakip",
  PARTNER: "🤝 Partner",
  TRAINER: "🎓 Eğitmen",
  EQUIPMENT: "🛒 Malzeme",
};

interface HomeClientProps {
  initialListings: ListingSummary[];
  initialTotal: number;
  initialPageSize: number;
  initialRecommendations: ListingSummary[];
  initialLocations: Country[];
  initialSports: Sport[];
  turkeyId: string | null;
}

export default function HomeClient({
  initialListings,
  initialTotal,
  initialPageSize,
  initialRecommendations,
  initialLocations,
  initialSports,
  turkeyId,
}: HomeClientProps) {
  const { data: session } = useSession();
  
  // İlanlar state - SSR'dan gelen verilerle başla
  const [listings, setListings] = useState<ListingSummary[]>(initialListings);
  const [loading, setLoading] = useState(false); // SSR'dan veri geldi, loading false
  const [error, setError] = useState<string | null>(null);
  const [currentFilters, setCurrentFilters] = useState<Record<string, string>>(
    turkeyId ? { countryId: turkeyId } : {}
  );
  const [pagination, setPagination] = useState({
    total: initialTotal,
    page: 1,
    pageSize: initialPageSize,
    totalPages: Math.ceil(initialTotal / initialPageSize),
    hasNext: initialTotal > initialPageSize,
    hasPrev: false,
  });

  const [activeTab, setActiveTab] = useState<"all" | "feed">("all");
  const [feedListings, setFeedListings] = useState<ListingSummary[]>([]);
  const [recommendations, setRecommendations] = useState<ListingSummary[]>(initialRecommendations);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasNext, setFeedHasNext] = useState(false);
  const [recReason, setRecReason] = useState<string>("popular");

  // Yakın ilanlar
  const [nearbyListings, setNearbyListings] = useState<NearbyListing[]>([]);
  const [nearbyRadius, setNearbyRadius] = useState(2);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [gpsGranted, setGpsGranted] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lon: number } | null>(null);

  // Filtre Drawer
  const [filterOpen, setFilterOpen] = useState(false);

  // Client-side fetch function
  const fetchListings = useCallback(
    async (filters: Record<string, string> = {}, page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getListings(filters, page, initialPageSize);
        if (data.success) {
          setListings(data.data);
          setPagination(data.pagination);
        } else {
          setListings([]);
          setError((data as any).error || "İlanlar yüklenemedi");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "İlanlar yüklenemedi");
        setListings([]);
      } finally {
        setLoading(false);
      }
    },
    [initialPageSize]
  );

  const fetchWithFilters = useCallback(
    (filters: Record<string, string>) => {
      setCurrentFilters(filters);
      fetchListings(filters, 1);
    },
    [fetchListings]
  );

  const goToPage = useCallback(
    (page: number) => {
      fetchListings(currentFilters, page);
    },
    [currentFilters, fetchListings]
  );

  // Feed tab
  useEffect(() => {
    if (activeTab !== "feed" || !session) return;
    setFeedLoading(true);
    getFeed(feedPage)
      .then((res) => {
        setFeedListings(res.data ?? []);
        setFeedHasNext(res.pagination?.hasNext ?? false);
      })
      .catch(() => {/* ignore */})
      .finally(() => setFeedLoading(false));
  }, [activeTab, session, feedPage]);

  // Personalized recommendations (client-side only for logged-in users)
  useEffect(() => {
    if (!session) return;
    getRecommendations(6)
      .then((res) => {
        if (res.success && res.data) {
          setRecommendations(res.data);
          setRecReason(res.reason ?? "popular");
        }
      })
      .catch(() => {/* ignore */});
  }, [session]);

  // Nearby listings
  const fetchNearby = useCallback((lat: number, lon: number, radius: number) => {
    setNearbyLoading(true);
    fetch(`/api/listings/nearby?lat=${lat}&lon=${lon}&radius=${radius}&limit=8`)
      .then(r => r.json())
      .then(j => setNearbyListings(j.data ?? []))
      .catch(() => {})
      .finally(() => setNearbyLoading(false));
  }, []);

  const requestNearby = () => {
    if (!navigator.geolocation) return;
    setNearbyLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserCoords(coords);
        setGpsGranted(true);
        fetchNearby(coords.lat, coords.lon, nearbyRadius);
      },
      () => setNearbyLoading(false),
      { timeout: 8000 }
    );
  };

  useEffect(() => {
    if (userCoords) fetchNearby(userCoords.lat, userCoords.lon, nearbyRadius);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyRadius]);

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-800 dark:via-teal-900 dark:to-emerald-900 rounded-2xl mb-8 p-8 md:p-10 text-white shadow-lg">
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/5 rounded-full" aria-hidden="true" />
        <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-white/5 rounded-full" aria-hidden="true" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-white/[0.03] rounded-full" aria-hidden="true" />
        <div className="relative text-center">
          <div className="text-4xl mb-3" role="img" aria-label="kupa">🏆</div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2">
            Spor Partneri &amp; Rakip Bul
          </h1>
          <p className="text-emerald-100 text-base md:text-lg max-w-xl mx-auto">
            Spor yapmak için birini mi arıyorsun? Doğru yerdesin!
          </p>
          {!session && (
            <div className="flex justify-center gap-3 mt-5">
              <a href="/auth/kayit" className="bg-white text-emerald-700 font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition shadow text-sm">
                Hemen Başla
              </a>
              <a href="/auth/giris" className="border border-white/50 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-white/10 transition text-sm">
                Giriş Yap
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Öneri bölümü */}
      {recommendations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {recReason === "personalized" ? "✨ Sana Özel" : "🔥 Popüler İlanlar"}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory">
            {recommendations.map((listing) => (
              <div key={listing.id} className="min-w-[260px] snap-start">
                <ListingCard listing={listing} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yakınındaki İlanlar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            📍 Yakınındaki İlanlar
          </h2>
          {gpsGranted && (
            <select
              value={nearbyRadius}
              onChange={e => setNearbyRadius(Number(e.target.value))}
              className="text-xs border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400"
            >
              <option value={0.5}>500 m</option>
              <option value={1}>1 km</option>
              <option value={2}>2 km</option>
              <option value={5}>5 km</option>
              <option value={10}>10 km</option>
            </select>
          )}
        </div>

        {!gpsGranted ? (
          <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl px-5 py-4">
            <span className="text-2xl">📡</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Etrafındaki ilanları gör</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Konumunu paylaşarak yakınındaki spor arkadaşlarını bul</p>
            </div>
            <button
              onClick={requestNearby}
              disabled={nearbyLoading}
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-50 transition-colors"
            >
              {nearbyLoading ? "Yükleniyor..." : "Konumu Paylaş"}
            </button>
          </div>
        ) : nearbyLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1,2,3].map(i => <div key={i} className="min-w-[200px] h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
          </div>
        ) : nearbyListings.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
            {nearbyRadius} km içinde ilan bulunamadı — yarıçapı artırmayı dene
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
            {nearbyListings.map(item => (
              <Link
                key={item.id}
                href={`/ilan/${item.id}`}
                className="min-w-[200px] snap-start bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{TYPE_LABELS[item.type] ?? item.type}</span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400">~{item.distance} km</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {item.sportIcon} {item.sportName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {item.userName ?? "Anonim"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Sekmeler */}
      {session && (
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-5">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${activeTab === "all" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}
          >
            📋 Tüm İlanlar
          </button>
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${activeTab === "feed" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}
          >
            🌐 Keşfet
          </button>
        </div>
      )}

      {/* Tüm İlanlar Sekmesi */}
      {activeTab === "all" && (
        <>
          {/* Filtre Tetikleyici Buton */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pagination.total > 0 ? `${pagination.total} ilan bulundu` : ""}
            </p>
            <button
              onClick={() => setFilterOpen(true)}
              className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-500 text-gray-600 dark:text-gray-300 text-sm font-medium px-4 py-2 rounded-xl shadow-sm transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 8h10M11 12h2M15 16h-6" />
              </svg>
              Filtrele
              {Object.keys(currentFilters).some(k => k !== "countryId") && (
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              )}
            </button>
          </div>

          <FilterBar
            onFilterChange={fetchWithFilters}
            initialLocations={initialLocations}
            initialSports={initialSports}
            isOpen={filterOpen}
            onClose={() => setFilterOpen(false)}
          />
          {error && (
            <div className="text-center py-8" role="alert">
              <p className="text-red-500">{error}</p>
              <button
                onClick={() => fetchWithFilters({})}
                className="mt-3 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                Tekrar Dene
              </button>
            </div>
          )}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5"
                  aria-hidden="true"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 skeleton rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 skeleton rounded w-24 mb-1.5" />
                      <div className="h-3 skeleton rounded w-16" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 skeleton rounded w-full" />
                    <div className="h-3 skeleton rounded w-3/4" />
                    <div className="h-3 skeleton rounded w-1/2" />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <div className="h-6 skeleton rounded-full w-16" />
                    <div className="h-6 skeleton rounded-full w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16">
              {currentFilters.cityId ? (
                <>
                  <span className="text-6xl" role="img" aria-label="baloncuk">🏙️</span>
                  <p className="mt-4 text-gray-700 dark:text-gray-300 text-xl font-semibold">
                    Bu şehirde henüz ilan yok
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                    İlk ilanı vererek spor arkadaşı bulmaya başla!
                  </p>
                  <Link
                    href="/ilan/olustur"
                    className="mt-6 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-600/20"
                  >
                    🎉 İlk ilanı sen ver!
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-6xl" role="img" aria-label="üzgün yüz">😕</span>
                  <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg">
                    Henüz uygun ilan bulunamadı
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                    Filtreleri değiştirmeyi deneyin veya yeni bir ilan oluşturun
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fade">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                hasNext={pagination.hasNext}
                hasPrev={pagination.hasPrev}
                onPageChange={goToPage}
              />
            </>
          )}
        </>
      )}

      {/* Keşfet Sekmesi */}
      {activeTab === "feed" && (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            👥 Takip ettiğin kişilerin ilanları ve ilgi alanlarına göre seçilmiş içerikler
          </p>
          {feedLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : feedListings.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-6xl">🌐</span>
              <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg">Keşfedecek içerik bulunamadı</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Daha fazla kullanıcı takip et veya profilini güncelle
              </p>
              <Link href="/profil" className="mt-3 inline-block text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">
                Profili Güncelle →
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fade">
                {feedListings.map((listing) => (
                  <div key={listing.id} className="relative">
                    {listing.isFromFollowing && (
                      <span className="absolute top-2 right-2 z-10 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                        👥 Takip
                      </span>
                    )}
                    <ListingCard listing={listing} />
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setFeedPage((p) => Math.max(1, p - 1))}
                  disabled={feedPage <= 1}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  ← Önceki
                </button>
                <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">Sayfa {feedPage}</span>
                <button
                  onClick={() => setFeedPage((p) => p + 1)}
                  disabled={!feedHasNext}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Sonraki →
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
