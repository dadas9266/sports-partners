"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// SSR devre dışı — Leaflet sadece tarayıcıda çalışır
const MapComponent = dynamic(() => import("@/components/MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800 rounded-xl">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Harita yükleniyor...</p>
      </div>
    </div>
  ),
});

interface MapListing {
  id: string;
  description: string | null;
  type: string;
  latitude: number;
  longitude: number;
  sport: { name: string; icon: string } | null;
  user: { id: string; name: string | null; avatarUrl: string | null };
  district: { name: string; city: { name: string } } | null;
}

const TYPE_LABELS: Record<string, string> = {
  RIVAL: "Rakip",
  PARTNER: "Ortak",
  TRAINER: "Antrenör",
  EQUIPMENT: "Ekipman",
  VENUE_RENTAL: "Saha Kiralama",
  VENUE_MEMBERSHIP: "Üyelik",
  VENUE_CLASS: "Ders/Kurs",
  VENUE_PRODUCT: "Ürün",
  VENUE_EVENT: "Etkinlik",
  VENUE_SERVICE: "Hizmet",
};

const TYPE_COLORS: Record<string, string> = {
  RIVAL: "#ef4444",
  PARTNER: "#3b82f6",
  TRAINER: "#8b5cf6",
  EQUIPMENT: "#f59e0b",
  VENUE_RENTAL: "#10b981",
  VENUE_MEMBERSHIP: "#06b6d4",
  VENUE_CLASS: "#f97316",
  VENUE_PRODUCT: "#84cc16",
  VENUE_EVENT: "#ec4899",
  VENUE_SERVICE: "#6366f1",
};

export default function HaritaPage() {
  const [listings, setListings] = useState<MapListing[]>([]);
  const [filtered, setFiltered] = useState<MapListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    fetch("/api/listings/map")
      .then((r) => r.json())
      .then((data) => {
        setListings(data.listings ?? []);
        setFiltered(data.listings ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const filterByType = useCallback((type: string | null) => {
    setActiveType(type);
    if (!type) {
      setFiltered(listings);
    } else {
      setFiltered(listings.filter((l) => l.type === type));
    }
  }, [listings]);

  const getMyLocation = useCallback(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setUserLocation([pos.coords.latitude, pos.coords.longitude]);
    });
  }, []);

  // Haritada var olan ilan tipleri
  const availableTypes = [...new Set(listings.map((l) => l.type))];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-900">
      {/* Başlık ve filtreler */}
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">🗺️ İlan Haritası</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {loading ? "Yükleniyor..." : `${filtered.length} ilan haritada gösteriliyor`}
            </p>
          </div>
          <button
            onClick={getMyLocation}
            className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-3 py-2 rounded-xl hover:bg-blue-700 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v4M12 19v4M1 12h4M19 12h4" />
            </svg>
            Konum
          </button>
        </div>

        {/* Tip filtreleri */}
        {availableTypes.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => filterByType(null)}
              className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                activeType === null
                  ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
              }`}
            >
              Tümü ({listings.length})
            </button>
            {availableTypes.map((type) => {
              const count = listings.filter((l) => l.type === type).length;
              return (
                <button
                  key={type}
                  onClick={() => filterByType(type)}
                  className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    activeType === type ? "text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  }`}
                  style={activeType === type ? { backgroundColor: TYPE_COLORS[type] ?? "#6b7280" } : {}}
                >
                  {TYPE_LABELS[type] ?? type} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Harita */}
      <div className="flex-1 px-4 pb-4 min-h-0">
        {!loading && listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-5xl mb-4">🗺️</div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Haritada ilan yok</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              Henüz konum bilgisi paylaşan ilan yok. İlan oluştururken
              &ldquo;Konumumu Paylaş&rdquo; seçeneğini kullanan ilanlar burada görünür.
            </p>
          </div>
        ) : (
          <div className="h-full rounded-xl overflow-hidden shadow-lg">
            <MapComponent
              listings={filtered}
              center={userLocation ?? [39.9, 32.8]}
              zoom={userLocation ? 12 : 6}
            />
          </div>
        )}
      </div>
    </div>
  );
}
