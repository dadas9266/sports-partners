import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createListingSchema, listingFilterSchema } from "@/lib/validations";
import { getCurrentUserId } from "@/lib/api-utils";
import { checkRateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const log = createLogger("listings");

// İlan listele (filtreleme + pagination ile)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams.entries());
    const parsed = listingFilterSchema.safeParse(rawParams);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { sportId, districtId, cityId, level, type, upcoming, page, pageSize } = parsed.data;

    const where: Prisma.ListingWhereInput = {
      status: "OPEN",
      dateTime: { gte: new Date() },
    };

    if (sportId) where.sportId = sportId;
    if (districtId) where.districtId = districtId;
    if (cityId) where.district = { cityId };
    if (level) where.level = level;
    if (type) where.type = type;
    if (upcoming === "true") {
      const weekLater = new Date();
      weekLater.setDate(weekLater.getDate() + 7);
      where.dateTime = { gte: new Date(), lte: weekLater };
    }

    const [total, listings] = await Promise.all([
      prisma.listing.count({ where }),
      prisma.listing.findMany({
        where,
        include: {
          sport: true,
          district: { include: { city: { include: { country: true } } } },
          venue: true,
          user: { select: { id: true, name: true } },
          _count: { select: { responses: true } },
        },
        orderBy: { dateTime: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: listings,
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

    const body = await request.json();
    const parsed = createListingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
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
      },
      include: {
        sport: true,
        district: { include: { city: true } },
        venue: true,
      },
    });

    log.info("İlan oluşturuldu", { listingId: listing.id, userId });

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
