"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Facility {
  id: string;
  sportName: string;
  facilityType: string;
  count: number;
  equipment: string[];
}

interface VenueDetail {
  id: string;
  businessName: string;
  address: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  capacity: number | null;
  sports: string[];
  equipment: string[];
  amenities: string[];
  images: string[];
  openingHours: string | null;
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  user: { id: string; name: string | null; avatarUrl: string | null };
  facilities: Facility[];
}

const FACILITY_TYPE_LABELS: Record<string, string> = {
  saha:  "⚽ Saha",
  kort:  "🎾 Kort",
  havuz: "🏊 Havuz",
  ring:  "🥊 Ring",
  salon: "🏋️ Salon",
};

export default function MekanDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const [venue, setVenue]     = useState<VenueDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [venueListings, setVenueListings] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/mekanlar/${id}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) { setNotFound(true); return; }
        setVenue(json.data);
        // Geocode the address via Nominatim (no API key required)
        if (json.data.address) {
          fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(json.data.address)}&limit=1`,
            { headers: { "Accept-Language": "tr" } }
          )
            .then(r => r.json())
            .then((results: Array<{ lat: string; lon: string }>) => {
              if (results.length > 0) {
                setMapCoords({ lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) });
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch venue owner's listings
  useEffect(() => {
    if (!venue) return;
    fetch(`/api/listings?userId=${venue.user.id}&limit=20`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data) {
          const vListings = json.data.filter((l: any) => (l.type as string).startsWith("VENUE_"));
          setVenueListings(vListings);
        }
      })
      .catch(() => {});
  }, [venue]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !venue) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">😕</div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Mekan bulunamadı</p>
        <Link href="/mekanlar" className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm hover:bg-emerald-600 transition-colors">
          Tüm Mekanlara Dön
        </Link>
      </div>
    );
  }

  const isOwner = session?.user?.id === venue.user.id;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back */}
        <Link
          href="/mekanlar"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors"
        >
          ← Tüm Mekanlar
        </Link>

        {/* Image gallery */}
        {venue.images.length > 0 && (
          <div className="mb-6">
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden bg-gray-200 dark:bg-gray-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={venue.images[activeImg]}
                alt={venue.businessName}
                className="w-full h-full object-cover"
              />
              {venue.isVerified && (
                <span className="absolute top-3 right-3 bg-emerald-500 text-white text-sm font-semibold px-3 py-1 rounded-full">
                  ✓ Onaylı Mekan
                </span>
              )}
            </div>
            {venue.images.length > 1 && (
              <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                {venue.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === activeImg ? "border-emerald-500" : "border-transparent"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Main info card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{venue.businessName}</h1>
              {venue.address && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">📍 {venue.address}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              {venue.phone && (
                <a
                  href={`tel:${venue.phone}`}
                  className="flex-shrink-0 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                >
                  📞 Ara
                </a>
              )}
              {isOwner && (
                <Link
                  href="/ayarlar/isletme"
                  className="flex-shrink-0 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                >
                  ⚙️ Kurucu Paneli
                </Link>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600 dark:text-gray-300">
            {venue.openingHours && (
              <div className="flex items-center gap-1.5">
                <span className="text-base">🕐</span>
                <span>{venue.openingHours}</span>
              </div>
            )}
            {venue.capacity && (
              <div className="flex items-center gap-1.5">
                <span className="text-base">👤</span>
                <span>Kapasite: {venue.capacity} kişi</span>
              </div>
            )}
            {venue.website && (
              <a
                href={venue.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                <span className="text-base">🌐</span>
                <span>{venue.website.replace(/^https?:\/\//, "")}</span>
              </a>
            )}
          </div>

          {/* Sports */}
          {venue.sports.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Sporlar</p>
              <div className="flex flex-wrap gap-2">
                {venue.sports.map(s => (
                  <span key={s} className="px-3 py-1 rounded-full text-sm bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {venue.description && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">{venue.description}</p>
            </div>
          )}

          {isOwner && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-900/20 p-4">
                <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-300">👑 Kurucu Yönetim Alanı</h2>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-400 mt-1">
                  Bu işletme topluluk sayfasının kurucususun. Yönetim panelinden galeri, ilanlar ve işletme bilgilerini düzenleyebilirsin.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Link
                    href="/ayarlar/isletme"
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors"
                  >
                    Yönetim Panelini Aç
                  </Link>
                  <Link
                    href="/ilan/olustur"
                    className="px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                  >
                    Topluluk İlanı Paylaş
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Owner */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs overflow-hidden">
              {venue.user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={venue.user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (venue.user.name?.[0] ?? "?").toUpperCase()
              )}
            </div>
            <span>
              Sahip:{" "}
              <Link href={`/profil/${venue.user.id}`} className="hover:text-emerald-500 transition-colors">
                {venue.user.name ?? "Mekan Sahibi"}
              </Link>
            </span>
          </div>
        </div>

        {/* Facilities */}
        {venue.facilities.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Tesisler &amp; Alanlar</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {venue.facilities.map(f => (
                <div key={f.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <div className="text-xl flex-shrink-0 mt-0.5">
                    {f.facilityType === "saha" ? "⚽" :
                     f.facilityType === "kort" ? "🎾" :
                     f.facilityType === "havuz" ? "🏊" :
                     f.facilityType === "ring"  ? "🥊" : "🏋️"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {f.sportName} — {FACILITY_TYPE_LABELS[f.facilityType] ?? f.facilityType}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{f.count} adet</p>
                    {f.equipment.length > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{f.equipment.join(", ")}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Amenities */}
        {venue.amenities.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Tesis Olanakları</h2>
            <div className="flex flex-wrap gap-2">
              {venue.amenities.map(a => (
                <span key={a} className="px-3 py-1.5 rounded-full text-sm bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 font-medium">
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Equipment */}
        {venue.equipment.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Ekipmanlar</h2>
            <div className="flex flex-wrap gap-2">
              {venue.equipment.map(e => (
                <span key={e} className="px-3 py-1 rounded-full text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
                  {e}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Venue Listings */}
        {venueListings.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">📋 İşletme İlanları</h2>
            <div className="space-y-3">
              {venueListings.map((listing: any) => {
                const typeLabels: Record<string, string> = {
                  VENUE_RENTAL: "🏟️ Kiralık",
                  VENUE_MEMBERSHIP: "💳 Üyelik",
                  VENUE_CLASS: "📚 Ders/Kurs",
                  VENUE_PRODUCT: "🛍️ Ürün",
                  VENUE_EVENT: "🎉 Etkinlik",
                  VENUE_SERVICE: "🔧 Hizmet",
                };
                return (
                  <Link
                    key={listing.id}
                    href={`/ilan/${listing.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/70 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                          {typeLabels[listing.type] ?? listing.type}
                        </span>
                        <span className="text-xs text-gray-400">{listing.sport?.name}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-1 truncate">
                        {listing.description || "Açıklama yok"}
                      </p>
                    </div>
                    <span className="text-gray-400 text-sm ml-2">→</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Harita */}
        {venue.address && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">📍 Konum</h2>
            {mapCoords ? (
              <>
                <div className="rounded-xl overflow-hidden h-64 border border-gray-100 dark:border-gray-800">
                  <iframe
                    title="Mekan Konumu"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapCoords.lon - 0.006}%2C${mapCoords.lat - 0.004}%2C${mapCoords.lon + 0.006}%2C${mapCoords.lat + 0.004}&layer=mapnik&marker=${mapCoords.lat}%2C${mapCoords.lon}`}
                  />
                </div>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${mapCoords.lat}&mlon=${mapCoords.lon}#map=16/${mapCoords.lat}/${mapCoords.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  OpenStreetMap'te Aç ↗
                </a>
              </>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <div className="animate-spin w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full" />
                <span>Harita yükleniyor…</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
