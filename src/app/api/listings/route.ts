import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createListingSchema, listingFilterSchema } from "@/lib/validations";
import { getCurrentUserId } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { withCache, cacheDel, cacheKey, CACHE_TTL, cacheDelPattern } from "@/lib/cache";

const log = createLogger("listings");

// Seviye yakınlığı hesapla
const LEVEL_ORDER: Record<string, number> = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2, PROFESSIONAL: 3 };

// Uyumluluk skoru hesapla (0-100) — akıllı eşleşme
function computeCompatibility(
  listing: {
    sportId: string;
    level: string;
    district: { cityId: string };
    user: { id: string; preferredTime: string | null; preferredStyle: string | null };
  },
  viewer: {
    cityId: string | null;
    sportIds: string[];
    preferredTime: string | null;
    preferredStyle: string | null;
    level?: string | null;
  }
): number {
  let score = 0;

  // Aynı şehir: +25
  if (viewer.cityId && viewer.cityId === listing.district.cityId) score += 25;

  // Aynı spor dalı: +30
  if (viewer.sportIds.includes(listing.sportId)) score += 30;

  // Seviye yakınlığı: aynı = +20, 1 kademe fark = +10, 2+ = +0
  if (viewer.level && listing.level) {
    const diff = Math.abs((LEVEL_ORDER[listing.level] ?? 1) - (LEVEL_ORDER[viewer.level] ?? 1));
    if (diff === 0) score += 20;
    else if (diff === 1) score += 10;
  }

  // Tercih edilen zaman dilimi: +15
  if (viewer.preferredTime && viewer.preferredTime === listing.user.preferredTime) score += 15;

  // Tercih edilen stil: +10
  if (viewer.preferredStyle && viewer.preferredStyle === listing.user.preferredStyle) score += 10;

  return Math.min(score, 100);
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

    let { sportId, districtId, cityId, level, type, upcoming, quickOnly, isRecurring, dateFrom, dateTo, minPrice, maxPrice, page, pageSize } = parsed.data;

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
      AND: [
        // Süresi dolmuş hızlı ilanları gizle
        { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
        // TRAINER ve EQUIPMENT için tarih kısıtı yok; RIVAL/PARTNER yalnızca gelecektekiler
        { OR: [{ type: { in: ["TRAINER", "EQUIPMENT"] } }, { dateTime: { gte: now } }] },
      ],
    };

    if (sportId) where.sportId = sportId;
    if (districtId) where.districtId = districtId;
    if (cityId) {
      // ilçesi olan ilanlar district.cityId ile, ilçesiz ilanlar doğrudan cityId ile filtrelenir
      (where.AND as Prisma.ListingWhereInput[]).push({
        OR: [{ cityId }, { district: { cityId } }],
      });
    }
    if (level) where.level = level;
    if (type) where.type = type;
    if (upcoming === "true") {
      const weekLater = new Date();
      weekLater.setDate(weekLater.getDate() + 7);
      // AND dizisine ekle - üst koşulları ezmez
      (where.AND as Prisma.ListingWhereInput[]).push({ dateTime: { gte: now, lte: weekLater } });
    }    if (quickOnly === "true") {
      where.isQuick = true;
    }
    if (isRecurring === "true") {
      where.isRecurring = true;
    }
    if (dateFrom || dateTo) {
      (where.AND as Prisma.ListingWhereInput[]).push({
        dateTime: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        },
      });
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      // Price filter applies to EQUIPMENT (equipmentDetail.price) or TRAINER (trainerProfile.hourlyRate)
      if (!type || type === "EQUIPMENT") {
        (where.AND as Prisma.ListingWhereInput[]).push({
          OR: [
            {
              equipmentDetail: {
                price: {
                  ...(minPrice !== undefined ? { gte: minPrice } : {}),
                  ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
                },
              },
            },
            ...(!type
              ? [{
                  trainerProfile: {
                    hourlyRate: {
                      ...(minPrice !== undefined ? { gte: minPrice } : {}),
                      ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
                    },
                  },
                }]
              : []),
          ],
        });
      } else if (type === "TRAINER") {
        (where.AND as Prisma.ListingWhereInput[]).push({
          trainerProfile: {
            hourlyRate: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          },
        });
      }
    }

    const [total, listings] = await withCache(
      cacheKey.listings({ sportId, districtId, cityId, level, type, upcoming, quickOnly, isRecurring, dateFrom, dateTo, minPrice, maxPrice, page, pageSize }),
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
              equipmentDetail: { select: { price: true, isSold: true } },
              trainerProfile: { select: { hourlyRate: true } },
            },
            orderBy: [{ isQuick: "desc" }, { dateTime: "asc" }],
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
        ]);
      }
    );

    // Uyumluluk skoru — sadece giriş yapan kullanıcılar için
    let viewer: { cityId: string | null; sportIds: string[]; preferredTime: string | null; preferredStyle: string | null; level?: string | null } | null = null;

    if (userId) {
      const profile = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          cityId: true,
          preferredTime: true,
          preferredStyle: true,
          userLevel: true,
          sports: { select: { id: true } },
        },
      });
      if (profile) {
        viewer = {
          cityId: profile.cityId,
          sportIds: profile.sports.map((s) => s.id),
          preferredTime: profile.preferredTime,
          preferredStyle: profile.preferredStyle,
          level: profile.userLevel,
        };
      }
    }

    const listingsWithScore = listings.map((l: any) => ({
      ...l,
      compatibilityScore: viewer ? computeCompatibility(
        { sportId: l.sportId, level: l.level, district: { cityId: l.district.cityId }, user: l.user },
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

    // Banned kullanıcı ilan oluşturamaz
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBanned: true, currentStreak: true },
    });

    if (user?.isBanned) {
      return NextResponse.json(
        { success: false, error: "Hesabınız geçici olarak kısıtlandı. İlan oluşturamazsınız." },
        { status: 403 }
      );
    }

    // Hafta sonu + 7 günlük seri = +1 bonus ilan hakkı
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayListingCount = await prisma.listing.count({
      where: { userId, createdAt: { gte: todayStart } },
    });
    const isWeekend = [0, 6].includes(new Date().getDay()); // 0=Pazar, 6=Cumartesi
    const hasStreakBonus = isWeekend && (user?.currentStreak ?? 0) >= 7;
    const dailyLimit = 5 + (hasStreakBonus ? 1 : 0);

    if (todayListingCount >= dailyLimit) {
      const msg = hasStreakBonus
        ? "Hafta sonu seri bonus hakkınız dahil günlük ilan limitinize ulaştınız (max 6 ilan/gün)"
        : "Günlük ilan limitinize ulaştınız (max 5 ilan/gün)";
      return NextResponse.json({ success: false, error: msg }, { status: 429 });
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
        cityId: parsed.data.cityId,
        districtId: parsed.data.districtId || null,
        venueId: parsed.data.venueId || null,
        userId,
        latitude: parsed.data.latitude ?? null,
        longitude: parsed.data.longitude ?? null,
        // TRAINER/EQUIPMENT için tarih opsiyonel; yoksa şu anki zaman kullanılır (gizli field)
        dateTime: parsed.data.dateTime
          ? new Date(parsed.data.dateTime)
          : new Date(),
        level: parsed.data.level ?? "BEGINNER",
        description: parsed.data.description || null,
        maxParticipants: parsed.data.maxParticipants ?? 2,
        allowedGender: parsed.data.allowedGender ?? "ANY",
        isQuick: parsed.data.isQuick ?? false,
        expiresAt,
        isRecurring: parsed.data.isRecurring ?? false,
        recurringDays: parsed.data.recurringDays?.length
          ? parsed.data.recurringDays.join(",")
          : null,
        minAge: parsed.data.minAge ?? null,
        maxAge: parsed.data.maxAge ?? null,
        groupId: parsed.data.groupId ?? null,
        // Eğitmen profili verisi
        ...(parsed.data.type === "TRAINER" && parsed.data.trainerProfile
          ? {
              trainerProfile: {
                create: {
                  userId,
                  hourlyRate: parsed.data.trainerProfile.hourlyRate ?? null,
                  gymName: parsed.data.trainerProfile.gymName || null,
                  gymAddress: parsed.data.trainerProfile.gymAddress || null,
                  ...(parsed.data.trainerProfile.specialization || parsed.data.trainerProfile.experience !== undefined
                    ? {
                        specializations: {
                          create: {
                            sportName: parsed.data.trainerProfile.specialization || "Genel",
                            years: parsed.data.trainerProfile.experience ?? 0,
                          },
                        },
                      }
                    : {}),
                },
              },
            }
          : {}),
        // Ekipman detayı
        ...(parsed.data.type === "EQUIPMENT" && parsed.data.equipmentDetail
          ? {
              equipmentDetail: {
                create: {
                  price: parsed.data.equipmentDetail.price ?? 0,
                  condition: parsed.data.equipmentDetail.condition ?? "GOOD",
                  brand: parsed.data.equipmentDetail.brand || null,
                  model: parsed.data.equipmentDetail.model || null,
                  images: parsed.data.equipmentDetail.images ?? [],
                },
              },
            }
          : {}),
      },
      include: {
        sport: true,
        district: { include: { city: true } },
        venue: true,
        trainerProfile: { include: { specializations: true } },
        equipmentDetail: true,
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

