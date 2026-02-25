"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { ListingSummary } from "@/types";

interface MapProps {
  listings: ListingSummary[];
  className?: string;
}

// Each listing needs lat/lng — we use venue-based coords if available
// Otherwise we'll cluster by district/city using approximate coords stored in the district name
// For now, since the DB doesn't have lat/lng, we'll show a placeholder map with Istanbul center
// and cluster markers by city name hash

function cityToLatLng(cityName: string): [number, number] {
  // Approximate coordinates for Turkish cities
  const CITY_COORDS: Record<string, [number, number]> = {
    İstanbul: [41.015, 28.979],
    Ankara: [39.925, 32.836],
    İzmir: [38.423, 27.142],
    Bursa: [40.183, 29.069],
    Antalya: [36.884, 30.704],
    Adana: [37.001, 35.321],
    Gaziantep: [37.066, 37.378],
    Konya: [37.872, 32.484],
    Mersin: [36.812, 34.641],
    Diyarbakır: [37.924, 40.230],
    Kayseri: [38.732, 35.487],
    Samsun: [41.286, 36.330],
    Trabzon: [41.005, 39.726],
    Malatya: [38.356, 38.309],
    Erzurum: [39.905, 41.269],
    "Other": [39.925, 32.836],
  };
  return CITY_COORDS[cityName] ?? CITY_COORDS["Other"];
}

export default function ListingsMap({ listings, className = "" }: MapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamic import of leaflet to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix Leaflet default icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!containerRef.current) return;
      const map = L.map(containerRef.current).setView([39.925, 32.836], 6);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18,
      }).addTo(map);

      // Group listings by city for marker clustering offset
      const cityGroups: Record<string, ListingSummary[]> = {};
      listings.forEach((listing) => {
        const city = listing.district?.city?.name ?? "Other";
        if (!cityGroups[city]) cityGroups[city] = [];
        cityGroups[city].push(listing);
      });

      Object.entries(cityGroups).forEach(([city, cityListings]) => {
        const [lat, lng] = cityToLatLng(city);
        cityListings.forEach((listing, idx) => {
          // Spread markers slightly so they don't overlap
          const offsetLat = lat + (Math.random() - 0.5) * 0.1;
          const offsetLng = lng + (Math.random() - 0.5) * 0.1;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _ = idx; // used for spread

          const marker = L.marker([offsetLat, offsetLng]).addTo(map);
          const dateStr = new Date(listing.dateTime).toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          });
          marker.bindPopup(`
            <div style="min-width:180px">
              <strong>${listing.sport.icon ?? "🏅"} ${listing.sport.name}</strong><br/>
              <span style="font-size:12px;color:#666">${listing.type === "RIVAL" ? "🥊 Rakip" : listing.type === "TRAINER" ? "🎓 Eğitmen" : listing.type === "EQUIPMENT" ? "🛒 Satılık" : "🤝 Partner"} • ${listing.level}</span><br/>
              <span style="font-size:12px">📍 ${listing.district?.name}, ${city}</span><br/>
              <span style="font-size:12px">📅 ${dateStr}</span><br/>
              <span style="font-size:12px">👤 ${listing.user.name}</span><br/>
              <a href="/ilan/${listing.id}" style="color:#059669;font-size:12px;font-weight:600">Detay →</a>
            </div>
          `);
        });
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-add markers when listings change (simplified: just re-render)
  // For production you'd diff, here we keep it simple
  return (
    <div ref={containerRef} className={`rounded-xl overflow-hidden ${className}`} style={{ minHeight: 400 }} />
  );
}
