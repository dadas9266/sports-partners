import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("venue-profile");
const VENUE_TYPES = [
  "SPORTS_FACILITY",
  "FITNESS_CENTER",
  "SUPPLEMENT_STORE",
  "EQUIPMENT_STORE",
  "SPORTS_CLUB",
  "HEALTH_CENTER",
  "EVENT_ORGANIZER",
  "SPORTS_NUTRITION",
  "OTHER",
] as const;

function normalizeVenueType(value: unknown): (typeof VENUE_TYPES)[number] {
  return typeof value === "string" && VENUE_TYPES.includes(value as (typeof VENUE_TYPES)[number])
    ? value as (typeof VENUE_TYPES)[number]
    : "OTHER";
}

// Kendi Venue Profilini Al — GET /api/venue-profile
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId)
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    const profile = await prisma.venueProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { name: true, avatarUrl: true, coverUrl: true, email: true } },
        facilities: { orderBy: { sportName: "asc" } },
      },
    });

    // Compute sportDetails map from VenueFacility records (for isletme edit form)
    const sportDetails = profile?.facilities?.reduce(
      (acc: Record<string, Record<string, string>>, f) => {
        acc[f.sportName] = { sahaType: f.equipment[0] ?? "", sahaCount: String(f.count) };
        return acc;
      },
      {}
    ) ?? {};

    // Mekan istatistikleri
    let stats = null;
    if (profile) {
      const approvedMatches = await prisma.match.count({
        where: { approvedById: userId },
      });
      stats = { approvedMatches };
    }

    return NextResponse.json({ profile: { ...profile, sportDetails }, stats });
  } catch (err) {
    log.error("Venue GET hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Venue Profili Oluştur / Güncelle — PUT /api/venue-profile
export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId)
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    // Kullanıcı VENUE tipinde mi?
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true },
    });

    if (!user)
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

    // Sadece bireysel hesapları VENUE'ye yükselt.
    // TRAINER gibi profesyonel rolleri ezmeyerek çift rol kullanımını korur.
    if (user.userType === "INDIVIDUAL") {
      await prisma.user.update({ where: { id: userId }, data: { userType: "VENUE" } });
    }

    const body = await request.json();
    const {
      businessName, address, description, phone, website,
      capacity, sports, images, openingHours, logoUrl,
      sportDetails, amenities, venueType,
    } = body;
    const normalizedVenueType = normalizeVenueType(venueType);

    if (!businessName?.trim())
      return NextResponse.json({ error: "İşletme adı zorunlu" }, { status: 400 });

    const profile = await prisma.venueProfile.upsert({
      where: { userId },
      update: {
        businessName, address, description, phone, website,
        capacity: capacity ? Number(capacity) : null,
        sports: sports ?? [],
        amenities: amenities ?? [],
        images: images ?? [],
        openingHours,
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        venueType: normalizedVenueType,
      },
      create: {
        userId,
        businessName, address, description, phone, website,
        capacity: capacity ? Number(capacity) : null,
        sports: sports ?? [],
        amenities: amenities ?? [],
        images: images ?? [],
        openingHours,
        logoUrl: logoUrl ?? null,
        venueType: normalizedVenueType,
      },
    });

    // Sync VenueFacility records from sportDetails form data
    if (sportDetails && typeof sportDetails === "object") {
      await prisma.venueFacility.deleteMany({ where: { profileId: profile.id } });
      const facilityRows = Object.entries(
        sportDetails as Record<string, Record<string, string>>
      )
        .filter(([, d]) => d && (d.sahaCount || d.sahaType))
        .map(([sportName, d]) => ({
          profileId: profile.id,
          sportName,
          facilityType: "saha",
          count: parseInt(d.sahaCount ?? "1") || 1,
          equipment: d.sahaType ? [d.sahaType] : [],
        }));
      if (facilityRows.length > 0) {
        await prisma.venueFacility.createMany({ data: facilityRows });
      }
    }

    log.info("Venue profili güncellendi", { userId });
    return NextResponse.json({ profile });
  } catch (err) {
    log.error("Venue PUT hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
