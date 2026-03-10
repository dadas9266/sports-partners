import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createLogger } from "@/lib/logger";
import { getCurrentUserId } from "@/lib/api-utils";

const log = createLogger("listings-nearby");

// Yakındaki ilanları döner — Haversine formülü (PostGIS gerektirmez)
// GET /api/listings/nearby?lat=...&lon=...&radius=2&limit=8
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat    = parseFloat(searchParams.get("lat") ?? "");
    const lon    = parseFloat(searchParams.get("lon") ?? "");
    const radius = parseFloat(searchParams.get("radius") ?? "2"); // km
    const limit  = Math.min(20, parseInt(searchParams.get("limit") ?? "8", 10));

    if (isNaN(lat) || isNaN(lon)) {
      return NextResponse.json({ success: false, error: "Geçerli konum gerekli" }, { status: 400 });
    }

    const now = new Date();
    const userId = await getCurrentUserId();

    // Engellenen kullanıcı ID'lerini al
    let blockedUserIds: string[] = [];
    if (userId) {
      const blocks = await prisma.userBlock.findMany({
        where: { OR: [{ blockerId: userId }, { blockedId: userId }], type: "BLOCK" },
        select: { blockerId: true, blockedId: true },
      });
      blockedUserIds = blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId);
    }

    // Haversine: 6371 * acos(...) — PostgreSQL raw query
    const results = await prisma.$queryRaw<
      Array<{
        id: string;
        distance: number;
        type: string;
        description: string | null;
        level: string;
        dateTime: Date;
        maxParticipants: number;
        latitude: number;
        longitude: number;
        sportName: string;
        sportIcon: string;
        userName: string | null;
        userAvatar: string | null;
        userId: string;
      }>
    >`
      SELECT
        l.id,
        ROUND(GREATEST(0.4, (6371 * acos(
          LEAST(1.0,
            cos(radians(${lat})) * cos(radians(l.latitude)) *
            cos(radians(l.longitude) - radians(${lon})) +
            sin(radians(${lat})) * sin(radians(l.latitude))
          )
        )))::numeric, 1) AS distance,
        l.type,
        l.description,
        l.level,
        l."dateTime",
        l."maxParticipants",
        l.latitude,
        l.longitude,
        s.name  AS "sportName",
        s.icon  AS "sportIcon",
        u.name  AS "userName",
        u."avatarUrl" AS "userAvatar",
        u.id    AS "userId"
      FROM "Listing" l
      JOIN "Sport"   s ON s.id = l."sportId"
      JOIN "User"    u ON u.id = l."userId"
      WHERE
        l.latitude  IS NOT NULL AND
        l.longitude IS NOT NULL AND
        l.status = 'OPEN' AND
        (l."expiresAt" IS NULL OR l."expiresAt" > ${now}) AND
        (l.type IN ('TRAINER', 'EQUIPMENT') OR l."dateTime" >= ${now}) AND
        ${blockedUserIds.length > 0 ? Prisma.sql`l."userId" NOT IN (${Prisma.join(blockedUserIds)}) AND` : Prisma.empty}
        (6371 * acos(
          LEAST(1.0,
            cos(radians(${lat})) * cos(radians(l.latitude)) *
            cos(radians(l.longitude) - radians(${lon})) +
            sin(radians(${lat})) * sin(radians(l.latitude))
          )
        )) < ${radius}
      ORDER BY distance ASC
      LIMIT ${limit}
    `;

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    log.error("Yakın ilanlar yüklenirken hata", error);
    return NextResponse.json({ success: false, error: "Yakın ilanlar yüklenemedi" }, { status: 500 });
  }
}
