import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCache, cacheKey, CACHE_TTL } from "@/lib/cache";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:places");

// Spor → Google Places arama query'si eşleştirmesi
const SPORT_TO_PLACE_QUERY: Record<string, string> = {
  futbol: "futbol sahası halı saha",
  basketbol: "basketbol sahası",
  tenis: "tenis kortu",
  voleybol: "voleybol sahası",
  yüzme: "yüzme havuzu",
  boks: "boks salonu spor salonu",
  fitness: "spor salonu fitness",
  "masa tenisi": "masa tenisi salonu",
  "buz pateni": "buz pateni pisti",
  golf: "golf sahası",
  bowling: "bowling salonu",
  "e-spor": "e-spor cafe",
  koşu: "atletizm pisti park",
  bisiklet: "bisiklet yolu park",
  kayak: "kayak merkezi",
  sörf: "sörf noktası plaj",
  olta: "balık tutma noktası göl nehir",
  okçuluk: "okçuluk menzili",
  default: "spor tesisi",
};

function getSportQuery(sportName: string): string {
  const lower = sportName.toLowerCase();
  return SPORT_TO_PLACE_QUERY[lower] ?? SPORT_TO_PLACE_QUERY.default;
}

// GET /api/places?sport=futbol&lat=41.01&lng=28.97&district=Kadıköy
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport") ?? "";
  const lat = parseFloat(searchParams.get("lat") ?? "0");
  const lng = parseFloat(searchParams.get("lng") ?? "0");
  const district = searchParams.get("district") ?? "";

  if (!sport) {
    return NextResponse.json({ error: "sport parametresi zorunlu" }, { status: 400 });
  }

  const cKey = cacheKey.googlePlaces(
    `${sport}-${district}`,
    lat || 0,
    lng || 0
  );

  try {
    const results = await withCache(cKey, CACHE_TTL.PLACES, async () => {
      // Önce kendi DB'mizde VenueCache'e bak
      const cached = await prisma.venueCache.findUnique({
        where: { query: `${sport}-${district}-${lat.toFixed(3)}-${lng.toFixed(3)}` },
      });

      if (cached) {
        const age = Date.now() - cached.createdAt.getTime();
        // 24 saatten eski değilse kullan
        if (age < 24 * 60 * 60 * 1000) {
          return JSON.parse(cached.placesJson);
        }
      }

      // Google Places API'ye sor
      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        // API key yoksa DB'deki Venue tablosundan döndür
        return await getFallbackVenues(sport, district);
      }

      const query = getSportQuery(sport);
      const locationParam = lat && lng ? `&location=${lat},${lng}&radius=5000` : "";
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + " " + district)}&type=establishment${locationParam}&language=tr&key=${apiKey}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("Google Places API hatası");

      const data = await response.json();
      const places = (data.results ?? []).slice(0, 10).map((p: GooglePlace) => ({
        id: p.place_id,
        name: p.name,
        address: p.formatted_address,
        lat: p.geometry?.location?.lat,
        lng: p.geometry?.location?.lng,
        rating: p.rating,
        source: "google",
      }));

      // DB'ye cache kaydet
      await prisma.venueCache.upsert({
        where: { query: `${sport}-${district}-${lat.toFixed(3)}-${lng.toFixed(3)}` },
        update: { placesJson: JSON.stringify(places), lat, lng },
        create: {
          query: `${sport}-${district}-${lat.toFixed(3)}-${lng.toFixed(3)}`,
          lat,
          lng,
          placesJson: JSON.stringify(places),
        },
      });

      return places;
    });

    return NextResponse.json({ places: results });
  } catch (err) {
    log.error("Places API hatası", err);
    // Hata durumunda DB fallback
    const fallback = await getFallbackVenues(sport, district);
    return NextResponse.json({ places: fallback });
  }
}

// Google Places yoksa veya hata varsa kendi Venue tablosundan döndür
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
    id: v.id,
    name: v.name,
    address: v.address ?? `${v.district.name}`,
    lat: null,
    lng: null,
    rating: null,
    source: "local",
  }));
}

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry?: { location?: { lat: number; lng: number } };
  rating?: number;
}
