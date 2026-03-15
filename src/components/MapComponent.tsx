"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";

// Leaflet ikon düzeltmesi (Next.js'te ikonlar otomatik çalışmaz)
const fixLeafletIcons = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
};

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

interface MapComponentProps {
  listings: MapListing[];
  center?: [number, number];
  zoom?: number;
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

function createColoredIcon(type: string) {
  const color = TYPE_COLORS[type] ?? "#6b7280";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="24" height="36">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 7.2 12 24 12 24s12-16.8 12-24C24 5.4 18.6 0 12 0z"
        fill="${color}" stroke="white" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
    </svg>`;
  return L.divIcon({
    html: svg,
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
    className: "",
  });
}

export default function MapComponent({ listings, center = [39.9, 32.8], zoom = 6 }: MapComponentProps) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      className="rounded-xl"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {listings.map((listing) => (
        <Marker
          key={listing.id}
          position={[listing.latitude, listing.longitude]}
          icon={createColoredIcon(listing.type)}
        >
          <Popup maxWidth={220}>
            <div className="p-1">
              <div className="font-semibold text-sm mb-1 line-clamp-2">{listing.description ?? `${listing.sport?.name ?? ""} İlanı`}</div>
              <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                <span>{listing.sport?.icon}</span>
                <span>{listing.sport?.name}</span>
                <span className="mx-1">•</span>
                <span
                  className="px-1.5 py-0.5 rounded-full text-white text-[10px] font-medium"
                  style={{ backgroundColor: TYPE_COLORS[listing.type] ?? "#6b7280" }}
                >
                  {TYPE_LABELS[listing.type] ?? listing.type}
                </span>
              </div>
              {listing.district && (
                <div className="text-xs text-gray-400 mb-2">
                  📍 {listing.district.name}, {listing.district.city.name}
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                {listing.user.avatarUrl ? (
                  <img src={listing.user.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                    {listing.user.name?.[0] ?? "?"}
                  </div>
                )}
                <span className="text-xs text-gray-600">{listing.user.name}</span>
              </div>
              <Link
                href={`/ilan/${listing.id}`}
                className="block text-center text-xs bg-blue-600 text-white rounded-lg py-1.5 px-3 hover:bg-blue-700 transition-colors"
              >
                İlanı Gör →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
