import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:places");

// Spor → Nominatim (OpenStreetMap) arama terimi
const SPORT_TO_OSM_QUERY: Record<string, string> = {
  futbol: "halı saha futbol sahası",
  basketbol: "basketbol sahası",
  tenis: "tenis kortu",
  voleybol: "voleybol sahası",
  yüzme: "yüzme havuzu",
  boks: "boks salonu",
  fitness: "spor salonu fitness",
  "masa tenisi": "masa tenisi",
  "buz pateni": "buz pateni pisti",
  golf: "golf sahası",
  bowling: "bowling salonu",
  "e-spor": "e-spor cafe",
  koşu: "atletizm parkur",
  bisiklet: "bisiklet parkı",
  kayak: "kayak merkezi",
  sörf: "sörf plaj",
  okçuluk: "okçuluk",
  default: "spor tesisi",
};

function getSportQuery(sportName: string): string {
  const lower = sportName.toLowerCase();
  for (const key of Object.keys(SPORT_TO_OSM_QUERY)) {
    if (lower.includes(key)) return SPORT_TO_OSM_QUERY[key];
  }
  return SPORT_TO_OSM_QUERY.default;
}

// Nominatim OpenStreetMap API — tamamen ücretsiz, kart yok
async function searchNominatim(sport: string, district: string): Promise<NominatimPlace[]> {
  const query = `${getSportQuery(sport)} ${district}`;
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&countrycodes=tr&addressdetails=1`;

  const res = await fetch(url, {
    headers: {
      // Nominatim kullanım politikası gereği User-Agent zorunlu
      "User-Agent": "SportsPartnerApp/1.0 (sportspartner@example.com)",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) throw new Error(`Nominatim hata: ${res.status}`);
  return await res.json();
}

// GET /api/places?sport=futbol&district=Kadıköy
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport") ?? "";
  const district = searchParams.get("district") ?? "";

  if (!sport) {
    return NextResponse.json({ error: "sport parametresi zorunlu" }, { status: 400 });
  }

  const cacheKey = `${sport.toLowerCase()}-${district.toLowerCase()}`;

  try {
    // 1. DB cache'e bak (24 saat geçerli)
    const cached = await prisma.venueCache.findUnique({ where: { query: cacheKey } });
    if (cached) {
      const ageHours = (Date.now() - cached.createdAt.getTime()) / 3600000;
      if (ageHours < 24) {
        return NextResponse.json({ venues: JSON.parse(cached.placesJson), source: "cache" });
      }
    }

    // 2. Nominatim'den sorgula
    const results = await searchNominatim(sport, district);

    const venues = results.map((p) => ({
      place_id: `osm-${p.place_id}`,
      name: p.display_name.split(",")[0].trim(),
      vicinity: [p.address?.road, p.address?.suburb, p.address?.district]
        .filter(Boolean)
        .join(", "),
      lat: parseFloat(p.lat),
      lng: parseFloat(p.lon),
      rating: null,
      source: "openstreetmap",
    }));

    // 3. DB'ye cache kaydet
    await prisma.venueCache.upsert({
      where: { query: cacheKey },
      update: { placesJson: JSON.stringify(venues), lat: 0, lng: 0 },
      create: { query: cacheKey, lat: 0, lng: 0, placesJson: JSON.stringify(venues) },
    });

    return NextResponse.json({ venues, source: "nominatim" });
  } catch (err) {
    log.error("Nominatim API hatası", err);
    const fallback = await getFallbackVenues(sport, district);
    return NextResponse.json({ venues: fallback, source: "local" });
  }
}

async function getFallbackVenues(sport: string, district: string) {
  const venues = await prisma.venue.findMany({
    where: {
      OR: [
        { sport: { name: { contains: sport, mode: "insensitive" } } },
        { district: { name: { contains: district, mode: "insensitive" } } },
      ],
    },
    include: { sport: true, district: true },
    take: 10,
  });

  return venues.map((v) => ({
    place_id: v.id,
    name: v.name,
    vicinity: v.address ?? v.district.name,
    lat: null,
    lng: null,
    rating: null,
    source: "local",
  }));
}

interface NominatimPlace {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    district?: string;
    city?: string;
  };
}
