import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const log = createLogger("api:places");

// ---------------------------------------------------------------------------
// Spor dalı → OSM Overpass tag sorguları
// Overpass, yer ADIYLA değil OSM ETİKETLERİYLE arama yapar:
// leisure=fitness_centre tüm fitness merkezlerini bulur, "fitness" isimli yerleri değil
// ---------------------------------------------------------------------------
const SPORT_TO_OVERPASS: Record<string, string[]> = {
  futbol:        ["node[sport=soccer]", "way[sport=soccer]", "node[leisure=pitch][sport=soccer]", "way[leisure=pitch][sport=soccer]"],
  basketbol:     ["node[sport=basketball]", "way[sport=basketball]", "node[leisure=pitch][sport=basketball]", "way[leisure=pitch][sport=basketball]"],
  tenis:         ["node[sport=tennis]", "way[sport=tennis]", "node[leisure=tennis]", "way[leisure=tennis]"],
  voleybol:      ["node[sport=volleyball]", "way[sport=volleyball]"],
  yüzme:         ["node[leisure=swimming_pool]", "way[leisure=swimming_pool]", "node[sport=swimming]", "way[sport=swimming]"],
  boks:          ["node[sport=boxing]", "way[sport=boxing]"],
  fitness:       ["node[leisure=fitness_centre]", "way[leisure=fitness_centre]", "node[leisure=sports_centre]", "way[leisure=sports_centre]"],
  "masa tenisi": ["node[sport=table_tennis]", "way[sport=table_tennis]"],
  "buz pateni":  ["node[leisure=ice_rink]", "way[leisure=ice_rink]"],
  golf:          ["node[leisure=golf_course]", "way[leisure=golf_course]"],
  bowling:       ["node[amenity=bowling_alley]", "way[amenity=bowling_alley]"],
  bisiklet:      ["node[leisure=track][sport=cycling]", "way[leisure=track][sport=cycling]", "node[amenity=bicycle_rental]"],
  kayak:         ["node[sport=skiing]", "way[sport=skiing]"],
  sörf:          ["node[sport=surfing]", "way[sport=surfing]"],
  okçuluk:       ["node[sport=archery]", "way[sport=archery]"],
  koşu:          ["node[leisure=track]", "way[leisure=track]"],
  default:       ["node[leisure=sports_centre]", "way[leisure=sports_centre]", "node[leisure=fitness_centre]", "way[leisure=fitness_centre]"],
};

function getOverpassTags(sportName: string): string[] {
  const lower = sportName.toLowerCase();
  for (const key of Object.keys(SPORT_TO_OVERPASS)) {
    if (lower.includes(key)) return SPORT_TO_OVERPASS[key];
  }
  return SPORT_TO_OVERPASS.default;
}

// ---------------------------------------------------------------------------
// Adım 1: Nominatim ile "İlçe, Şehir, Türkiye" → merkez koordinatı
// ---------------------------------------------------------------------------
async function geocodeDistrict(district: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const q = city ? `${district}, ${city}, Türkiye` : `${district}, Türkiye`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=tr`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SportsPartnerApp/1.0 (sportspartner@example.com)" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data: Array<{ lat: string; lon: string }> = await res.json();
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Adım 2: Overpass API — verilen koordinat çevresinde OSM tag'larına göre ara
// ---------------------------------------------------------------------------
interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

async function searchOverpass(lat: number, lng: number, tags: string[], radius = 5000): Promise<OverpassElement[]> {
  const around = `(around:${radius},${lat},${lng})`;
  const parts = tags.map((t) => `${t}${around};`).join("\n  ");
  const query = `[out:json][timeout:15];\n(\n  ${parts}\n);\nout center 20;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: query,
    headers: {
      "Content-Type": "text/plain",
      "User-Agent": "SportsPartnerApp/1.0 (sportspartner@example.com)",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`Overpass hata: ${res.status}`);
  const data = await res.json();
  return (data.elements ?? []) as OverpassElement[];
}

function elementToVenue(el: OverpassElement) {
  const lat = el.lat ?? el.center?.lat ?? 0;
  const lng = el.lon ?? el.center?.lon ?? 0;
  const tags = el.tags ?? {};

  const name =
    tags["name:tr"] ||
    tags.name ||
    tags.operator ||
    (tags.leisure ? tags.leisure.replace(/_/g, " ") + " tesisi" : "Spor Tesisi");

  const street = [tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" ");
  const vicinity = [
    street,
    tags["addr:quarter"] || tags["addr:suburb"] || tags["addr:district"],
    tags["addr:city"],
  ]
    .filter(Boolean)
    .join(", ");

  return {
    place_id: `osm-${el.type}-${el.id}`,
    name,
    vicinity: vicinity || null,
    lat,
    lng,
    rating: null,
    source: "openstreetmap",
  };
}

// ---------------------------------------------------------------------------
// GET /api/places?sport=Fitness&district=Şehzadeler&districtId=xxx
// districtId varsa DB'den şehri okur → kesin konum; yoksa ilçe adına göre DB lookup
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport      = searchParams.get("sport")      ?? "";
  const district   = searchParams.get("district")   ?? "";
  const districtId = searchParams.get("districtId") ?? "";

  if (!sport || !district) {
    return NextResponse.json({ error: "sport ve district parametreleri zorunlu" }, { status: 400 });
  }

  // İlçenin bağlı olduğu şehri DB'den çek (Şehzadeler → Manisa)
  let cityName = "";
  try {
    const row = districtId
      ? await db.district.findUnique({ where: { id: districtId }, include: { city: true } })
      : await db.district.findFirst({ where: { name: { equals: district, mode: "insensitive" } }, include: { city: true } });
    cityName = row?.city?.name ?? "";
  } catch {
    /* DB hatası → şehirsiz devam */
  }

  const cacheKey = `overpass-${sport.toLowerCase()}-${district.toLowerCase()}-${cityName.toLowerCase()}`;

  try {
    // 1. DB cache — 24 saat geçerli
    const cached = await db.venueCache.findUnique({ where: { query: cacheKey } });
    if (cached) {
      const ageHours = (Date.now() - cached.createdAt.getTime()) / 3600000;
      if (ageHours < 24) {
        return NextResponse.json({ venues: JSON.parse(cached.placesJson), source: "cache" });
      }
    }

    // 2. İlçe merkez koordinatını bul (şehir adıyla birlikte → doğru il)
    const coords = await geocodeDistrict(district, cityName);
    if (!coords) {
      log.warn("Geocode başarısız", { district, city: cityName });
      const fallback = await getFallbackVenues(sport, district);
      return NextResponse.json({ venues: fallback, source: "local" });
    }

    // 3. Spor dalına özel OSM etiketleriyle Overpass'ta ara
    const tags = getOverpassTags(sport);
    let elements = await searchOverpass(coords.lat, coords.lng, tags, 5000);

    // Sonuç yoksa yarıçapı genişlet
    if (elements.length === 0) {
      elements = await searchOverpass(coords.lat, coords.lng, tags, 10000);
    }

    // Hâlâ boşsa genel spor salonu/fitness merkezi ara
    if (elements.length === 0) {
      elements = await searchOverpass(coords.lat, coords.lng, SPORT_TO_OVERPASS.default, 8000);
    }

    // Koordinatsız ve tekrarlı elemanları temizle
    const seen = new Set<string>();
    const venues = elements
      .map(elementToVenue)
      .filter((v) => {
        if (v.lat === 0 && v.lng === 0) return false;
        if (seen.has(v.place_id)) return false;
        seen.add(v.place_id);
        return true;
      })
      .slice(0, 15);

    // 4. Cache'e kaydet
    await db.venueCache.upsert({
      where:  { query: cacheKey },
      update: { placesJson: JSON.stringify(venues), lat: coords.lat, lng: coords.lng },
      create: { query: cacheKey, lat: coords.lat, lng: coords.lng, placesJson: JSON.stringify(venues) },
    });

    return NextResponse.json({ venues, source: "overpass" });
  } catch (err) {
    log.error("Overpass API hatası", err);
    const fallback = await getFallbackVenues(sport, district);
    return NextResponse.json({ venues: fallback, source: "local" });
  }
}

async function getFallbackVenues(sport: string, district: string) {
  const venues: Array<{ id: string; name: string; address: string | null; district: { name: string }; lat: number | null; lng: number | null }> = await db.venue.findMany({
    where: {
      OR: [
        { sport:     { name: { contains: sport,    mode: "insensitive" } } },
        { district:  { name: { contains: district, mode: "insensitive" } } },
      ],
    },
    include: { sport: true, district: true },
    take: 10,
  });

  return venues.map((v) => ({
    place_id: v.id,
    name:     v.name,
    vicinity: v.address ?? v.district.name,
    lat:      null,
    lng:      null,
    rating:   null,
    source:   "local",
  }));
}
