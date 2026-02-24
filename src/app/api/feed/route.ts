import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("feed");

// GET /api/feed — Takip edilenlerin + kendi spor/şehir ilanları
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = 12;

    // Kullanıcının spor tercihleri ve şehri
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        cityId: true,
        sports: { select: { id: true } },
        following: { select: { followingId: true } },
      },
    });

    if (!me) return unauthorized();

    const followingIds = me.following.map((f) => f.followingId);
    const sportIds = me.sports.map((s) => s.id);

    // Takip edilenlerin + kendi sportlardaki + kendi şehirdeki ilanlar (OPEN, gelecekte)
    const where = {
      status: "OPEN" as const,
      dateTime: { gte: new Date() },
      userId: { not: userId }, // kendi ilanlarını gösterme
      OR: [
        ...(followingIds.length > 0 ? [{ userId: { in: followingIds } }] : []),
        ...(sportIds.length > 0 ? [{ sportId: { in: sportIds } }] : []),
        ...(me.cityId ? [{ district: { city: { id: me.cityId } } }] : []),
      ],
    };

    // Hiç filtre yoksa son ilanları göster
    const hasFilters = followingIds.length > 0 || sportIds.length > 0 || me.cityId;
    const finalWhere = hasFilters ? where : { status: "OPEN" as const, dateTime: { gte: new Date() } };

    const [total, listings] = await Promise.all([
      prisma.listing.count({ where: finalWhere }),
      prisma.listing.findMany({
        where: finalWhere,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          type: true,
          dateTime: true,
          level: true,
          status: true,
          description: true,
          maxParticipants: true,
          sport: { select: { id: true, name: true, icon: true } },
          district: {
            select: {
              name: true,
              city: { select: { name: true, country: { select: { name: true } } } },
            },
          },
          venue: { select: { name: true } },
          user: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { responses: true } },
        },
      }),
    ]);

    // Takip edilen kullanıcıdan gelen ilanları işaretle
    const followingSet = new Set(followingIds);
    const enriched = listings.map((l) => ({
      ...l,
      isFromFollowing: followingSet.has(l.user.id),
      isGroup: l.maxParticipants > 2,
    }));

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    log.error("Feed hatası", error);
    return NextResponse.json({ success: false, error: "Feed yüklenemedi" }, { status: 500 });
  }
}
