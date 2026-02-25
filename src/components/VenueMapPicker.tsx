"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet varsayılan icon sorunu (webpack ile kırılıyor) — manuel düzelt
const pinIcon = (color: "green" | "blue" | "red") =>
  L.divIcon({
    className: "",
    html: `<div style="
      width:28px;height:36px;position:relative;
    ">
      <svg viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 22 14 22S28 23.333 28 14C28 6.268 21.732 0 14 0z"
          fill="${color === "green" ? "#10b981" : color === "red" ? "#ef4444" : "#3b82f6"}"
          stroke="white" stroke-width="2"/>
        <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
      </svg>
    </div>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });

export interface MapVenue {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  vicinity?: string | null;
  isCustom?: boolean;
}

interface Props {
  sportName: string;
  districtName: string;
  districtId?: string;
  onSelect: (venue: MapVenue) => void;
  onClose: () => void;
  initialVenue?: MapVenue | null;
}

// İlçe koordinatı için Nominatim'e sor
async function geocodeDistrict(district: string): Promise<[number, number] | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(district + ", Türkiye")}&format=json&limit=1&countrycodes=tr`,
      { headers: { "User-Agent": "SportsPartnerApp/1.0 (sportspartner@example.com)" } }
    );
    const data = await r.json();
    if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {}
  return null;
}

// Haritada tıklamayı dinleyen iç component
function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Harita merkezini değiştiren iç component
function MapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

export default function VenueMapPicker({ sportName, districtName, districtId, onSelect, onClose, initialVenue }: Props) {
  const [center, setCenter] = useState<[number, number]>([39.925533, 32.866287]); // Türkiye merkezi varsayılan
  const [venues, setVenues] = useState<MapVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [customPin, setCustomPin] = useState<{ lat: number; lng: number } | null>(null);
  const [customName, setCustomName] = useState("");
  const [selected, setSelected] = useState<MapVenue | null>(initialVenue ?? null);
  const [centerReady, setCenterReady] = useState(false);

  // İlçe koordinatını bul + API'den mekanları çek
  useEffect(() => {
    let alive = true;
    setLoading(true);

    async function load() {
      // 1. Harita merkezini bul
      const coords = await geocodeDistrict(districtName);
      if (!alive) return;
      if (coords) {
        setCenter(coords);
      }
      setCenterReady(true);

      // 2. Mekanları API'den çek
      try {
        const params = new URLSearchParams({ sport: sportName, district: districtName });
        if (districtId) params.set("districtId", districtId);
        const r = await fetch(`/api/places?${params.toString()}`);
        const json = await r.json();
        if (alive && Array.isArray(json.venues)) {
          setVenues(json.venues.filter((v: MapVenue) => v.lat && v.lng));
        }
      } catch {}
      if (alive) setLoading(false);
    }

    load();
    return () => { alive = false; };
  }, [sportName, districtName, districtId]);

  // Haritaya tıklayınca custom pin bırak
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setCustomPin({ lat, lng });
    setCustomName("");
    setSelected(null);
  }, []);

  // Nominatim pin'i seç
  const handleVenueSelect = (v: MapVenue) => {
    setSelected(v);
    setCustomPin(null);
    setCustomName("");
  };

  // Custom pin'i onayla
  const handleCustomConfirm = () => {
    if (!customPin) return;
    const venue: MapVenue = {
      place_id: `custom-${customPin.lat.toFixed(5)}-${customPin.lng.toFixed(5)}`,
      name: customName.trim() || "Özel Mekan",
      lat: customPin.lat,
      lng: customPin.lng,
      vicinity: `${customPin.lat.toFixed(4)}, ${customPin.lng.toFixed(4)}`,
      isCustom: true,
    };
    setSelected(venue);
    setCustomPin(null);
  };

  const handleConfirm = () => {
    if (selected) onSelect(selected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">
        {/* Başlık */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">📍 Mekan Seç</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {sportName} · {districtName} · {loading ? "Mekanlar aranıyor..." : `${venues.length} mekan bulundu`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        {/* Harita */}
        <div className="relative" style={{ height: 380 }}>
          {centerReady && (
            <MapContainer
              center={center}
              zoom={14}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapCenter center={center} />
              <ClickHandler onMapClick={handleMapClick} />

              {/* API'den gelen mekan pinleri */}
              {venues.map((v) => (
                <Marker key={v.place_id} position={[v.lat, v.lng]} icon={selected?.place_id === v.place_id ? pinIcon("green") : pinIcon("blue")}>
                  <Popup>
                    <div className="min-w-[160px]">
                      <p className="font-semibold text-sm">{v.name}</p>
                      {v.vicinity && <p className="text-xs text-gray-500 mt-0.5">{v.vicinity}</p>}
                      <button
                        onClick={() => handleVenueSelect(v)}
                        className="mt-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium py-1.5 px-3 rounded-lg"
                      >
                        ✓ Bu Mekanı Seç
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* Kullanıcının elle koyduğu pin */}
              {customPin && (
                <Marker position={[customPin.lat, customPin.lng]} icon={pinIcon("red")}>
                  <Popup>
                    <div className="min-w-[180px]">
                      <p className="text-xs text-gray-600 mb-1">Bu noktayı işaretlediniz</p>
                      <input
                        type="text"
                        placeholder="Mekan adı (opsiyonel)"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs mb-2"
                      />
                      <button
                        onClick={handleCustomConfirm}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium py-1.5 px-3 rounded-lg"
                      >
                        ✓ Bu Noktayı Seç
                      </button>
                    </div>
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          )}

          {/* Yükleniyor overlay */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70 z-[1000]">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-300">Mekanlar aranıyor...</p>
              </div>
            </div>
          )}
        </div>

        {/* Bilgi + Seçilen mekan + Onay */}
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <p className="text-xs text-gray-400">
            💡 Haritadaki <span className="text-blue-500 font-medium">mavi pin</span>'lere tıklayarak spor tesisi seçebilirsiniz.
            {" "}Listede yoksa haritada boş bir yere tıklayarak <span className="text-red-400 font-medium">kırmızı pin</span> koyun.
          </p>

          {selected ? (
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl px-4 py-3">
              <span className="text-emerald-600 text-xl">✓</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-emerald-800 dark:text-emerald-300 truncate">{selected.name}</p>
                {selected.vicinity && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 truncate">{selected.vicinity}</p>
                )}
                {selected.isCustom && (
                  <p className="text-xs text-amber-600 mt-0.5">📌 Haritadan işaretlendi</p>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-emerald-400 hover:text-emerald-600 text-lg">×</button>
            </div>
          ) : (
            <div className="text-center py-2 text-sm text-gray-400">
              Haritadan bir mekan seçin veya boş bir yere tıklayın
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Vazgeç
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selected}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold"
            >
              Mekanı Onayla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
