"use client";

import { useListings } from "@/hooks/useListings";
import FilterBar from "@/components/FilterBar";
import ListingCard from "@/components/ListingCard";
import Pagination from "@/components/ui/Pagination";

export default function HomePage() {
  const { listings, loading, error, pagination, fetchWithFilters, goToPage } =
    useListings(12);

  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 dark:text-gray-100">
          <span role="img" aria-label="kupa">🏆</span> Spor Partneri &amp; Rakip Bul
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Spor yapmak için birini mi arıyorsun? Doğru yerdesin!
        </p>
      </div>

      {/* Filtreler */}
      <FilterBar onFilterChange={fetchWithFilters} />

      {/* Hata mesajı */}
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

      {/* İlan listesi */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 animate-pulse"
              aria-hidden="true"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-1" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </div>
  );
}
