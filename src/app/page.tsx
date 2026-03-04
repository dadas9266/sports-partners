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
  // Batch 1: 4 bağımsız sorgu paralel çalışır (hiçbiri diğerini beklemez)
  const [turkeyId, locations, sports, recommendations] = await Promise.all([
    getTurkeyId(),
    getInitialLocations(),
    getInitialSports(),
    getPopularListings(6),
  ]);

  // Batch 2: Sadece getInitialListings turkeyId'ye bağımlı, ayrı çekilir
  const listingsData = await getInitialListings(turkeyId ?? undefined);

  return (
    <HomeClient
      initialListings={listingsData.listings}
      initialTotal={listingsData.total}
      initialPageSize={listingsData.pageSize}
      initialRecommendations={recommendations}
      initialLocations={locations}
      initialSports={sports}
      turkeyId={turkeyId}
    />
  );
}

// ISR: 60 saniyede bir yeniden validate et
export const revalidate = 60;
