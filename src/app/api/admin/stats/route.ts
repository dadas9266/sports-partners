import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("admin:stats");

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
    if (!admin?.isAdmin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsers30d,
      newUsers7d,
      bannedUsers,
      totalListings,
      openListings,
      totalMatches,
      completedMatches,
      totalClubs,
      totalGroups,
      totalRatings,
      onlineUsersCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: last30 } } }),
      prisma.user.count({ where: { createdAt: { gte: last7 } } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.listing.count(),
      prisma.listing.count({ where: { status: "OPEN" } }),
      prisma.match.count(),
      prisma.match.count({ where: { status: "COMPLETED" } }),
      prisma.club.count(),
      prisma.group.count(),
      prisma.rating.count(),
      prisma.user.count({ where: { lastSeenAt: { gte: new Date(Date.now() - 5 * 60 * 1000) } } }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        users: { total: totalUsers, new30d: newUsers30d, new7d: newUsers7d, banned: bannedUsers, online: onlineUsersCount },
        listings: { total: totalListings, open: openListings },
        matches: { total: totalMatches, completed: completedMatches },
        clubs: { total: totalClubs },
        groups: { total: totalGroups },
        ratings: { total: totalRatings },
      },
    });
  } catch (err) {
    log.error("Admin stats error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
