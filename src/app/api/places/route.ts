import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { getCityForDistrict, trLower } from "@/lib/district-city-map";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const log = createLogger("api:places");

// ---------------------------------------------------------------------------
// Spor dalı → Nominatim arama terimi (Türkçe, geniş kapsam)
// Not: "spor salonu" gibi genel terimler Türkiye'de daha iyi sonuç verir
// ---------------------------------------------------------------------------
const SPORT_TO_QUERY: Record<string, string[]> = {
  futbol:        ["halı saha", "futbol sahası"],
  basketbol:     ["basketbol sahası", "spor salonu"],
  tenis:         ["tenis kortu", "tenis kulübü"],
  voleybol:      ["voleybol sahası", "spor salonu"],
  yüzme:         ["yüzme havuzu", "aquapark"],
  boks:          ["boks salonu", "dövüş spor salonu"],
  fitness:       ["spor salonu", "fitness", "gym"],
  "masa tenisi": ["masa tenisi", "spor salonu"],
  "buz pateni":  ["buz pateni pisti", "buz salonu"],
  golf:          ["golf sahası"],
  bowling:       ["bowling salonu"],
  bisiklet:      ["bisiklet", "bisiklet parkı"],
  kayak:         ["kayak merkezi"],
  sörf:          ["sörf", "su sporları"],
  okçuluk:       ["okçuluk", "atıcılık"],
  koşu:          ["atletizm", "koşu parkuru", "spor salonu"],
  default:       ["spor salonu", "spor tesisi"],
};

function getSportQueries(sportName: string): string[] {
  const lower = sportName.toLowerCase();
  for (const key of Object.keys(SPORT_TO_QUERY)) {
    if (lower.includes(key)) return SPORT_TO_QUERY[key];
  }
  return SPORT_TO_QUERY.default;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    quarter?: string;
    suburb?: string;
    district?: string;
    city?: string;
    town?: string;
    province?: string;
  };
}

// Nominatim ile şehir bazlı arama — birden fazla terim dener, en iyi sonucu alır
async function searchNominatimInCity(
  queries: string[],
  city: string,
): Promise<NominatimResult[]> {
  const allResults: NominatimResult[] = [];
  const seen = new Set<number>();

  for (const q of queries) {
    const searchQ = city ? `${q} ${city}` : `${q} Türkiye`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQ)}&format=json&limit=15&countrycodes=tr&addressdetails=1`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "SportsPartnerApp/1.0 (sportspartner@example.com)" },
        next: { revalidate: 0 },
      });
      if (!res.ok) continue;
      const data: NominatimResult[] = await res.json();

      for (const item of data) {
        if (seen.has(item.place_id)) continue;
        // Şehir filtresi: province (il) öncelikli, city/town ikincil
        // trLower kullanıyoruz: "İ".toLowerCase() JavaScript'te hatalı sonuç verir
        if (city) {
          const addr = item.address ?? {};
          const itemCity = trLower(addr.province || addr.city || addr.town || "");
          const cityLower = trLower(city);
          if (itemCity && !itemCity.includes(cityLower) && !cityLower.includes(itemCity)) continue;
        }
        seen.add(item.place_id);
        allResults.push(item);
      }
    } catch {
      continue;
    }
    if (allResults.length >= 12) break;
  }

  return allResults.slice(0, 15);
}

// ---------------------------------------------------------------------------
// GET /api/places?sport=Fitness&district=Şehzadeler&districtId=xxx
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport      = searchParams.get("sport")      ?? "";
  const district   = searchParams.get("district")   ?? "";
  const districtId = searchParams.get("districtId") ?? "";

  if (!sport || !district) {
    return NextResponse.json({ error: "sport ve district parametreleri zorunlu" }, { status: 400 });
  }

  // İlçenin bağlı olduğu şehri önce DB'den, yoksa Nominatim geocoding ile bul
  let cityName = "";
  try {
    const row = districtId
      ? await db.district.findUnique({ where: { id: districtId }, include: { city: true } })
      : await db.district.findFirst({ where: { name: { equals: district, mode: "insensitive" } }, include: { city: true } });
    cityName = row?.city?.name ?? "";
  } catch { /* DB hatası */ }

  // DB'de bulunamadıysa önce statik ilçe→il eşlemesine bak (hızlı, API çağrısı yok)
  if (!cityName) {
    cityName = getCityForDistrict(district) ?? "";
  }

  // Statik listede de yoksa Nominatim ile geocode et (son çare)
  if (!cityName) {
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(district + ", Türkiye")}&format=json&limit=1&countrycodes=tr&addressdetails=1`;
      const geoRes = await fetch(geoUrl, {
        headers: { "User-Agent": "SportsPartnerApp/1.0 (sportspartner@example.com)" },
        next: { revalidate: 0 },
      });
      if (geoRes.ok) {
        const geoData: NominatimResult[] = await geoRes.json();
        if (geoData.length > 0) {
          const addr = geoData[0].address ?? {};
          cityName = addr.province || addr.city || addr.town || "";
        }
      }
    } catch { /* geocode hatası */ }
  }

  const cacheKey = `nom2-${sport.toLowerCase()}-${district.toLowerCase()}-${cityName.toLowerCase()}`;
  const debug = searchParams.get("debug") === "1";

  try {
    // 1. DB cache — 24 saat geçerli
    const cached = !debug && await db.venueCache.findUnique({ where: { query: cacheKey } });
    if (cached) {
      const ageHours = (Date.now() - cached.createdAt.getTime()) / 3600000;
      if (ageHours < 24) {
        return NextResponse.json({ venues: JSON.parse(cached.placesJson), source: "cache" });
      }
    }

    // 2. Nominatim şehir bazlı arama
    const queries = getSportQueries(sport);
    if (debug) {
      // Debug: Nominatim'e gerçek istek gönder, sonucu göster
      const testQ = queries[0];
      const testUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(testQ + " " + cityName)}&format=json&limit=5&countrycodes=tr`;
      let testResult = [];
      let testError = "";
      try {
        const testRes = await fetch(testUrl, { headers: { "User-Agent": "SportsPartnerApp/1.0 (sportspartner@example.com)" }, next: { revalidate: 0 } });
        testResult = testRes.ok ? await testRes.json() : [];
        if (!testRes.ok) testError = `HTTP ${testRes.status}`;
      } catch (e) { testError = String(e); }
      return NextResponse.json({ debug: true, cityName, district, queries, cacheKey, testUrl, testCount: testResult.length, testError });
    }
    const results = await searchNominatimInCity(queries, cityName);

    // İlçeye ait sonuçları öne al
    const districtLower = district.toLowerCase();
    results.sort((a, b) => {
      const aInDistrict = a.display_name.toLowerCase().includes(districtLower) ? 0 : 1;
      const bInDistrict = b.display_name.toLowerCase().includes(districtLower) ? 0 : 1;
      return aInDistrict - bInDistrict;
    });

    const venues = results.map((p) => {
      const parts = p.display_name.split(",");
      const name = parts[0].trim();
      const addr = p.address ?? {};
      const vicinity = [
        addr.road,
        addr.quarter || addr.suburb,
        addr.district || addr.city || addr.town,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        place_id: `osm-${p.place_id}`,
        name,
        vicinity: vicinity || parts.slice(1, 3).join(",").trim() || null,
        lat: parseFloat(p.lat),
        lng: parseFloat(p.lon),
        rating: null,
        source: "openstreetmap",
      };
    });

    // 3. Cache kaydet — sadece sonuç varsa kaydet (Nominatim geçici hatası cache'lenmemeli)
    if (venues.length > 0) {
      await db.venueCache.upsert({
        where:  { query: cacheKey },
        update: { placesJson: JSON.stringify(venues), lat: 0, lng: 0 },
        create: { query: cacheKey, lat: 0, lng: 0, placesJson: JSON.stringify(venues) },
      });
    }

    return NextResponse.json({ venues, source: venues.length > 0 ? "nominatim" : "empty" });
  } catch (err) {
    log.error("Nominatim API hatası", err);
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
