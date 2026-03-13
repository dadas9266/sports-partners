"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useLocale } from "next-intl";
import FilterBar from "@/components/FilterBar";
import ListingCard from "@/components/ListingCard";
import Pagination from "@/components/ui/Pagination";
import { getListings, getFeed, getRecommendations } from "@/services/api";
import type { ListingSummary, Country, Sport } from "@/types";

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
  const locale = useLocale();
  const isTr = locale === "tr";
  const text = {
    fetchError: isTr ? "İlanlar yüklenemedi" : "Could not load listings",
    heroTitle: isTr ? "Spor Partneri & Rakip Bul" : "Find a Sports Partner or Rival",
    heroSubtitle: isTr ? "Spor yapmak için birini mi arıyorsun? Doğru yerdesin!" : "Looking for someone to train or compete with? You are in the right place.",
    startNow: isTr ? "Hemen Başla" : "Get Started",
    signIn: isTr ? "Giriş Yap" : "Sign In",
    personalized: isTr ? "✨ Sana Özel" : "✨ For You",
    popular: isTr ? "🔥 Popüler İlanlar" : "🔥 Popular Listings",
    allListingsTab: isTr ? "📋 Tüm İlanlar" : "📋 All Listings",
    feedTab: isTr ? "🌐 Keşfet" : "🌐 Discover",
    found: isTr ? "ilan bulundu" : "listings found",
    retry: isTr ? "Tekrar Dene" : "Try Again",
    noCityListings: isTr ? "Bu şehirde henüz ilan yok" : "No listings in this city yet",
    firstListingHint: isTr ? "İlk ilanı vererek spor arkadaşı bulmaya başla!" : "Post the first listing and start finding sports partners!",
    firstListingCta: isTr ? "🎉 İlk ilanı sen ver!" : "🎉 Post the first listing",
    noResults: isTr ? "Henüz uygun ilan bulunamadı" : "No matching listings found yet",
    noResultsHint: isTr ? "Filtreleri değiştirmeyi deneyin veya yeni bir ilan oluşturun" : "Try changing filters or create a new listing",
    feedIntro: isTr ? "👥 Takip ettiğin kişilerin ilanları ve ilgi alanlarına göre seçilmiş içerikler" : "👥 Listings from people you follow and selected recommendations",
    noFeed: isTr ? "Keşfedecek içerik bulunamadı" : "No content to discover",
    noFeedHint: isTr ? "Daha fazla kullanıcı takip et veya profilini güncelle" : "Follow more users or update your profile",
    updateProfile: isTr ? "Profili Güncelle →" : "Update Profile →",
    followingBadge: isTr ? "👥 Takip" : "👥 Following",
    prev: isTr ? "← Önceki" : "← Previous",
    page: isTr ? "Sayfa" : "Page",
    next: isTr ? "Sonraki →" : "Next →",
  };
  
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
          setError((data as any).error || text.fetchError);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : text.fetchError);
        setListings([]);
      } finally {
        setLoading(false);
      }
    },
    [initialPageSize, text.fetchError]
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
            {text.heroTitle}
          </h1>
          <p className="text-emerald-100 text-base md:text-lg max-w-xl mx-auto">
            {text.heroSubtitle}
          </p>
          {!session && (
            <div className="flex justify-center gap-3 mt-5">
              <a href="/auth/kayit" className="bg-white text-emerald-700 font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-50 transition shadow text-sm">
                {text.startNow}
              </a>
              <a href="/auth/giris" className="border border-white/50 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-white/10 transition text-sm">
                {text.signIn}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Öneri bölümü */}
      {recommendations.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {recReason === "personalized" ? text.personalized : text.popular}
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

      {/* Sekmeler */}
      {session && (
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-5">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${activeTab === "all" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}
          >
            {text.allListingsTab}
          </button>
          <button
            onClick={() => setActiveTab("feed")}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${activeTab === "feed" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}
          >
            {text.feedTab}
          </button>
        </div>
      )}

      {/* Tüm İlanlar Sekmesi */}
      {activeTab === "all" && (
        <>
          <FilterBar
            onFilterChange={fetchWithFilters}
            initialLocations={initialLocations}
            initialSports={initialSports}
          />

          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {pagination.total > 0 ? `${pagination.total} ${text.found}` : ""}
            </p>
          </div>
          {error && (
            <div className="text-center py-8" role="alert">
              <p className="text-red-500">{error}</p>
              <button
                onClick={() => fetchWithFilters({})}
                className="mt-3 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
              >
                {text.retry}
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
                    {text.noCityListings}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                    {text.firstListingHint}
                  </p>
                  <Link
                    href="/ilan/olustur"
                    className="mt-6 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-lg shadow-emerald-600/20"
                  >
                    {text.firstListingCta}
                  </Link>
                </>
              ) : (
                <>
                  <span className="text-6xl" role="img" aria-label="üzgün yüz">😕</span>
                  <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg">
                    {text.noResults}
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                    {text.noResultsHint}
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
            {text.feedIntro}
          </p>
          {feedLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : feedListings.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-6xl">🌐</span>
              <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg">{text.noFeed}</p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                {text.noFeedHint}
              </p>
              <Link href="/profil" className="mt-3 inline-block text-emerald-600 dark:text-emerald-400 hover:underline font-semibold">
                {text.updateProfile}
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-fade">
                {feedListings.map((listing) => (
                  <div key={listing.id} className="relative">
                    {listing.isFromFollowing && (
                      <span className="absolute top-2 right-2 z-10 bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                        {text.followingBadge}
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
                  {text.prev}
                </button>
                <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">{text.page} {feedPage}</span>
                <button
                  onClick={() => setFeedPage((p) => p + 1)}
                  disabled={!feedHasNext}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  {text.next}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
