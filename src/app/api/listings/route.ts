import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createListingSchema, listingFilterSchema } from "@/lib/validations";
import { getCurrentUserId } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { withCache, cacheDel, cacheKey, CACHE_TTL, cacheDelPattern } from "@/lib/cache";

const log = createLogger("listings");

// Uyumluluk skoru hesapla (0-100)
function computeCompatibility(
  listing: {
    sportId: string;
    district: { cityId: string };
    user: { preferredTime: string | null; preferredStyle: string | null };
  },
  viewer: {
    cityId: string | null;
    sportIds: string[];
    preferredTime: string | null;
    preferredStyle: string | null;
  }
): number {
  let score = 0;
  if (viewer.cityId && viewer.cityId === listing.district.cityId) score += 30;
  if (viewer.sportIds.includes(listing.sportId)) score += 35;
  if (viewer.preferredTime && viewer.preferredTime === listing.user.preferredTime) score += 20;
  if (viewer.preferredStyle && viewer.preferredStyle === listing.user.preferredStyle) score += 15;
  return score;
}

// İlan listele (filtreleme + pagination ile)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = await getCurrentUserId();
    const rawParams = Object.fromEntries(searchParams.entries());
    const parsed = listingFilterSchema.safeParse(rawParams);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    let { sportId, districtId, cityId, level, type, upcoming, quickOnly, page, pageSize } = parsed.data;

    // OTOMATİK ŞEHİR FİLTRELEMESİ (Sadece "Sana Uygun" veya genel aramalar için)
    // Eğer kullanıcı giriş yapmışsa ve manuell bir şehir/ilçe seçmemişse, kendi şehrini baz al.
    if (userId && !cityId && !districtId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { cityId: true }
      });
      if (user?.cityId) {
        cityId = user.cityId;
      }
    }

    const now = new Date();

    const where: Prisma.ListingWhereInput = {
      status: "OPEN",
      dateTime: { gte: now },
      // Süresi dolmuş hızlı ilanları gizle
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    };

    if (sportId) where.sportId = sportId;
    if (districtId) where.districtId = districtId;
    if (cityId) where.district = { cityId };
    if (level) where.level = level;
    if (type) where.type = type;
    if (upcoming === "true") {
      const weekLater = new Date();
      weekLater.setDate(weekLater.getDate() + 7);
      where.dateTime = { gte: now, lte: weekLater };
    }    if (quickOnly === "true") {
      where.isQuick = true;
    }

    const [total, listings] = await withCache(
      cacheKey.listings({ sportId, districtId, cityId, level, type, upcoming, quickOnly, page, pageSize }),
      CACHE_TTL.LISTINGS,
      async () => {
        return Promise.all([
          prisma.listing.count({ where }),
          prisma.listing.findMany({
            where,
            include: {
              sport: true,
              district: { include: { city: { include: { country: true } } } },
              venue: true,
              // @ts-ignore
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                  gender: true,
                  birthDate: true,
                  preferredTime: true,
                  preferredStyle: true,
                },
              },
              _count: { select: { responses: true } },
            },
            orderBy: [{ isQuick: "desc" }, { dateTime: "asc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
        ]);
      }
    );

    // Uyumluluk skoru — sadece giriş yapan kullanıcılar için
    let viewer: { cityId: string | null; sportIds: string[]; preferredTime: string | null; preferredStyle: string | null } | null = null;

    if (userId) {
      const profile = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          cityId: true,
          preferredTime: true,
          preferredStyle: true,
          sports: { select: { id: true } },
        },
      });
      if (profile) {
        viewer = {
          cityId: profile.cityId,
          sportIds: profile.sports.map((s) => s.id),
          preferredTime: profile.preferredTime,
          preferredStyle: profile.preferredStyle,
        };
      }
    }

    const listingsWithScore = listings.map((l: any) => ({
      ...l,
      compatibilityScore: viewer ? computeCompatibility(
        { sportId: l.sportId, district: { cityId: l.district.cityId }, user: l.user },
        viewer
      ) : undefined,
    }));

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: listingsWithScore,
      pagination: {
        total,
        page,
        pageSize,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    log.error("İlanlar listelenirken hata", error);
    return NextResponse.json(
      { success: false, error: "İlanlar yüklenemedi" },
      { status: 500 }
    );
  }
}

// İlan oluştur
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    // Rate limit
    const rateCheck = checkRateLimit(userId, "listing");
    if (!rateCheck.allowed) {
      log.warn("Rate limit aşıldı", { userId });
      return NextResponse.json(
        {
          success: false,
          error: "Günlük ilan limitinize ulaştınız (max 5 ilan/gün)",
        },
        { status: 429 }
      );
    }

    // Banned kullanıcı ilan oluşturamaz
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBanned: true },
    });

    if (user?.isBanned) {
      return NextResponse.json(
        { success: false, error: "Hesabınız geçici olarak kısıtlandı. İlan oluşturamazsınız." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createListingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    // Hızlı ilan ise expiresAt hesapla (şu andan 2 saat sonra)
    let expiresAt: Date | null = null;
    if (parsed.data.isQuick) {
      if (parsed.data.expiresAt) {
        expiresAt = new Date(parsed.data.expiresAt);
      } else {
        expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      }
    }

    const listing = await prisma.listing.create({
      data: {
        type: parsed.data.type,
        sportId: parsed.data.sportId,
        districtId: parsed.data.districtId,
        venueId: parsed.data.venueId || null,
        userId,
        dateTime: new Date(parsed.data.dateTime),
        level: parsed.data.level,
        description: parsed.data.description || null,
        maxParticipants: parsed.data.maxParticipants ?? 2,
        allowedGender: parsed.data.allowedGender ?? "ANY",
        isQuick: parsed.data.isQuick ?? false,
        expiresAt,
        isRecurring: parsed.data.isRecurring ?? false,
        recurringDays: parsed.data.recurringDays?.length
          ? parsed.data.recurringDays.join(",")
          : null,
      },
      include: {
        sport: true,
        district: { include: { city: true } },
        venue: true,
      },
    });

    log.info("İlan oluşturuldu", { listingId: listing.id, userId, isQuick: listing.isQuick });

    // İlan listesi cache'ini temizle - yeni ilan eklendi
    await cacheDelPattern("listings:*");

    return NextResponse.json(
      { success: true, data: listing },
      { status: 201 }
    );
  } catch (error) {
    log.error("İlan oluşturulurken hata", error);
    return NextResponse.json(
      { success: false, error: "İlan oluşturulamadı" },
      { status: 500 }
    );
  }
}

