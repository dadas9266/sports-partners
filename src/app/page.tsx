import { Suspense } from "react";
import HomeClient from "@/components/HomeClient";
import {
  getInitialListings,
  getInitialLocations,
  getInitialSports,
  getPopularListings,
  getTurkeyId,
} from "@/lib/server-data";

// Server Component - veriyi sunucuda çeker, HTML olarak gönderir
export default async function HomePage() {
  // Paralel veri çekimi - waterfall yok
  const [turkeyId, locations, sports] = await Promise.all([
    getTurkeyId(),
    getInitialLocations(),
    getInitialSports(),
  ]);

  // Turkey ID ile ilanları çek
  const [listingsData, recommendations] = await Promise.all([
    getInitialListings(turkeyId ?? undefined),
    getPopularListings(6),
  ]);

  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
        </div>
      }
    >
      <HomeClient
        initialListings={listingsData.listings}
        initialTotal={listingsData.total}
        initialPageSize={listingsData.pageSize}
        initialRecommendations={recommendations}
        initialLocations={locations}
        initialSports={sports}
        turkeyId={turkeyId}
      />
    </Suspense>
  );
}

// ISR: 60 saniyede bir yeniden validate et
export const revalidate = 60;
