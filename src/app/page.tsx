"use client";

import { useListings } from "@/hooks/useListings";
import FilterBar from "@/components/FilterBar";
import ListingCard from "@/components/ListingCard";
import Pagination from "@/components/ui/Pagination";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { getFeed, getRecommendations } from "@/services/api";
import type { ListingSummary } from "@/types";

export default function HomePage() {
  const { listings, loading, error, pagination, fetchWithFilters, goToPage } =
    useListings(12);
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"all" | "feed">("all");

  const [feedListings, setFeedListings] = useState<ListingSummary[]>([]);
  const [recommendations, setRecommendations] = useState<ListingSummary[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedPage, setFeedPage] = useState(1);
  const [feedHasNext, setFeedHasNext] = useState(false);
  const [recReason, setRecReason] = useState<string>("popular");

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

  useEffect(() => {
    getRecommendations(6)
      .then((res) => {
        if (res.success && res.data) {
          setRecommendations(res.data);
          setRecReason(res.reason ?? "popular");
        }
      })
      .catch(() => {/* ignore */});
  }, []);

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-800 dark:via-teal-900 dark:to-emerald-900 rounded-2xl mb-8 p-8 md:p-10 text-white shadow-lg animate-fade-in">
        {/* Dekoratif arka plan halkaları */}
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
        <div className="mb-8 animate-fade-in">
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

      {/* Sekmeler (sadece giriş yapmışsa Keşfet göster) */}
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
          <FilterBar onFilterChange={fetchWithFilters} />
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
              <span className="text-6xl" role="img" aria-label="üzgün yüz">😕</span>
              <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg">
                Henüz uygun ilan bulunamadı
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                Filtreleri değiştirmeyi deneyin veya yeni bir ilan oluşturun
              </p>
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
