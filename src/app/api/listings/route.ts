import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createListingSchema, listingFilterSchema } from "@/lib/validations";
import { getCurrentUserId } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { withCache, cacheDel, cacheKey, CACHE_TTL, cacheDelPattern } from "@/lib/cache";
import { sendPushToUser } from "@/lib/push";

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

    let { sportId, districtId, cityId, countryId, level, type, upcoming, quickOnly, isRecurring, dateFrom, dateTo, minPrice, maxPrice, page, pageSize } = parsed.data;

    // OTOMATİK ŞEHİR FİLTRELEMESİ (Sadece "Sana Uygun" veya genel aramalar için)
    // Eğer kullanıcı giriş yapmışsa ve manuel bir şehir/ilçe/ülke seçmemişse, kendi şehrini baz al.
    if (userId && !cityId && !districtId && !countryId) {
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
    
    // Konum filtrelerini (ülke/şehir/ilçe) birbirini kapsayacak şekilde (AND) uygula
    if (districtId) {
      where.districtId = districtId;
    }
    if (cityId) {
      // ilçesi olan ilanlar district.cityId ile, ilçesiz ilanlar doğrudan cityId ile filtrelenir
      (where.AND as Prisma.ListingWhereInput[]).push({
        OR: [{ cityId }, { district: { cityId } }],
      });
    }
    if (countryId) {
      // Sadece ülke seçilmiş olsa bile, o ülkeye ait tüm şehir ve ilçelerdeki ilanları getir
      (where.AND as Prisma.ListingWhereInput[]).push({
        OR: [
          { district: { city: { countryId } } },
          { city: { countryId } },
        ],
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
      select: { isBanned: true, currentStreak: true, userType: true },
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

    // Sadece TRAINER tipindeki kullanıcılar Eğitmen ilanı verebilir
    if (parsed.data.type === "TRAINER" && user?.userType !== "TRAINER") {
      return NextResponse.json(
        { success: false, error: "Eğitmen ilanı verebilmek için profilinizin Eğitmen tipine sahip olması gereklidir." },
        { status: 403 }
      );
    }

    // Hızlı ilan ise expiresAt hesapla (şu andan 2 saat sonra)
    // Acil ilan ise expiresAt = şu andan 30 dakika sonra
    let expiresAt: Date | null = null;
    if (parsed.data.isUrgent) {
      expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 dakika
    } else if (parsed.data.isQuick) {
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
        isUrgent: parsed.data.isUrgent ?? false,
        isAnonymous: parsed.data.isAnonymous ?? false,
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

    log.info("İlan oluşturuldu", { listingId: listing.id, userId, isQuick: listing.isQuick, isUrgent: listing.isUrgent, isAnonymous: listing.isAnonymous });

    // İlan listesi cache'ini temizle - yeni ilan eklendi
    await cacheDelPattern("listings:*");

    // --- ACİL EŞLEŞME: aynı semt + spor kullanıcılarına push yolla ---
    if (listing.isUrgent && listing.districtId) {
      // Fire-and-forget: cevap bekleme
      broadcastUrgentListing(listing, userId).catch((e) =>
        log.error("Acil ilan broadcast hatası", e)
      );
    }

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

// ─── Acil ilan: aynı semt + spor → push + DB bildirim broadcast ────────────────
async function broadcastUrgentListing(
  listing: { id: string; districtId: string | null; sportId: string; sport: { name: string; icon: string | null } },
  ownerId: string
) {
  if (!listing.districtId) return;

  // Aynı bölgede o sporu oynayan, giriş yapmış (push aboneliği olan veya bildirim alabilecek) kullanıcılar
  const targets = await prisma.user.findMany({
    where: {
      id: { not: ownerId },
      isBanned: false,
      sports: { some: { id: listing.sportId } },
      OR: [
        { districtId: listing.districtId },
        { district: { cityId: { not: undefined } } },
      ],
    },
    select: {
      id: true,
      pushSubscriptions: { select: { endpoint: true, p256dh: true, auth: true } },
    },
    take: 100, // max 100 kullanıcıya bildirim
  });

  if (targets.length === 0) return;

  const sportLabel = `${listing.sport.icon ?? ""} ${listing.sport.name}`.trim();
  const link = `/ilan/${listing.id}`;
  const title = "⚡ Anlık Eşleşme Talebi!";
  const body = `${sportLabel} için 30 dakika içinde oyun arayan biri var!`;

  // DB bildirimleri toplu oluştur
  await prisma.notification.createMany({
    data: targets.map((u) => ({
      userId: u.id,
      type: "URGENT_LISTING_NEARBY",
      title,
      body,
      link,
    })),
    skipDuplicates: true,
  });

  // Push bildirimleri gönder
  await Promise.allSettled(
    targets.map((u) =>
      u.pushSubscriptions.length > 0
        ? sendPushToUser(u.pushSubscriptions, { title, body, link, tag: `urgent-${listing.id}` })
        : Promise.resolve()
    )
  );

  log.info("Acil ilan broadcast tamamlandı", { listingId: listing.id, targetCount: targets.length });
}
