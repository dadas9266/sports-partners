"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, LayerGroup } from "leaflet";
import type { ListingSummary } from "@/types";

interface MapProps {
  listings: ListingSummary[];
  className?: string;
}

function cityToLatLng(cityName: string): [number, number] {
  const CITY_COORDS: Record<string, [number, number]> = {
    İstanbul: [41.015, 28.979], Ankara: [39.925, 32.836], İzmir: [38.423, 27.142],
    Bursa: [40.183, 29.069], Antalya: [36.884, 30.704], Adana: [37.001, 35.321],
    Gaziantep: [37.066, 37.378], Konya: [37.872, 32.484], Mersin: [36.812, 34.641],
    Diyarbakır: [37.924, 40.230], Kayseri: [38.732, 35.487], Samsun: [41.286, 36.330],
    Trabzon: [41.005, 39.726], Malatya: [38.356, 38.309], Erzurum: [39.905, 41.269],
  };
  return CITY_COORDS[cityName] ?? [39.925, 32.836];
}

// Listing tipine göre renk
const TYPE_COLORS: Record<string, string> = {
  RIVAL: "#ef4444", PARTNER: "#10b981", TRAINER: "#8b5cf6", EQUIPMENT: "#f59e0b",
};

export default function ListingsMap({ listings, className = "" }: MapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const layerGroupRef = useRef<LayerGroup | null>(null);

  // Haritayı tek seferinde başlat
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    import("leaflet").then((L) => {
      if (!containerRef.current) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      const map = L.map(containerRef.current).setView([39.925, 32.836], 6);
      mapRef.current = map;
      layerGroupRef.current = L.layerGroup().addTo(map);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // Kullanıcı konumu butonu
      const LocControl = L.Control.extend({
        onAdd() {
          const btn = L.DomUtil.create("button", "leaflet-bar leaflet-control");
          btn.title = "Konumuma git";
          btn.style.cssText = "width:34px;height:34px;font-size:18px;cursor:pointer;background:#fff;border:none;display:flex;align-items:center;justify-content:center;";
          btn.innerHTML = "📍";
          L.DomEvent.on(btn, "click", () => {
            navigator.geolocation?.getCurrentPosition((pos) => {
              map.setView([pos.coords.latitude, pos.coords.longitude], 12);
            });
          });
          return btn;
        },
      });
      new LocControl({ position: "topleft" }).addTo(map);
    });
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  // Listings değişince marker'ları güncelle
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;
    import("leaflet").then((L) => {
      if (!layerGroupRef.current) return;
      layerGroupRef.current.clearLayers();

      const cityGroups: Record<string, ListingSummary[]> = {};
      listings.forEach((listing) => {
        const city = listing.district?.city?.name ?? "Other";
        if (!cityGroups[city]) cityGroups[city] = [];
        cityGroups[city].push(listing);
      });

      Object.entries(cityGroups).forEach(([city, cityListings]) => {
        const [baseLat, baseLng] = cityToLatLng(city);
        cityListings.forEach((listing) => {
          const lat = baseLat + (Math.random() - 0.5) * 0.08;
          const lng = baseLng + (Math.random() - 0.5) * 0.08;
          const color = TYPE_COLORS[listing.type] ?? "#6b7280";

          const icon = L.divIcon({
            html: `<div style="width:28px;height:28px;background:${color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)">
                     <span style="display:block;transform:rotate(45deg);text-align:center;line-height:24px;font-size:13px">${listing.sport.icon ?? "🏅"}</span>
                   </div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 28],
            className: "",
          });

          const dateStr = new Date(listing.dateTime).toLocaleDateString("tr-TR", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          });
          const typeLabel = listing.type === "RIVAL" ? "🥊 Rakip" : listing.type === "TRAINER" ? "🎓 Eğitmen" : listing.type === "EQUIPMENT" ? "🛒 Satılık" : "🤝 Partner";
          const levelLabel: Record<string, string> = { BEGINNER: "Başlangıç", INTERMEDIATE: "Orta", ADVANCED: "İleri" };

          L.marker([lat, lng], { icon }).addTo(layerGroupRef.current!)
            .bindPopup(`
              <div style="min-width:190px;font-family:system-ui">
                <p style="font-weight:700;font-size:14px;margin:0 0 4px">${listing.sport.icon ?? "🏅"} ${listing.sport.name}</p>
                <p style="font-size:12px;color:#555;margin:2px 0">${typeLabel} · ${levelLabel[listing.level] ?? listing.level}</p>
                <p style="font-size:12px;color:#555;margin:2px 0">📍 ${listing.district?.name ?? ""}, ${city}</p>
                <p style="font-size:12px;color:#555;margin:2px 0">📅 ${dateStr}</p>
                <p style="font-size:12px;color:#555;margin:2px 0">👤 ${listing.user.name}</p>
                <a href="/ilan/${listing.id}" style="display:inline-block;margin-top:6px;color:#fff;background:#059669;padding:3px 10px;border-radius:6px;font-size:12px;font-weight:600;text-decoration:none">Detay →</a>
              </div>
            `);
        });
      });
    });
  }, [listings]);

  return (
    <div ref={containerRef} className={`rounded-xl overflow-hidden ${className}`} style={{ minHeight: 400 }} />
  );
}

