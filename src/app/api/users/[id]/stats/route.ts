import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, isValidId, notFound } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("users:stats");

// GET /api/users/[id]/stats
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) return notFound("Geçersiz kullanıcı ID");

    const currentUserId = await getCurrentUserId();

    // Kullanıcının var olduğunu doğrula
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        currentStreak: true,
        longestStreak: true,
        totalMatches: true,
        totalPoints: true,
        userLevel: true,
      },
    });
    if (!user) return notFound("Kullanıcı bulunamadı");

    // Maçları spora göre grupla
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ user1Id: id }, { user2Id: id }],
        status: { in: ["COMPLETED", "SCHEDULED", "ONGOING"] },
      },
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        createdAt: true,
        listing: {
          select: {
            sport: { select: { id: true, name: true, icon: true } },
          },
        },
        ratings: {
          where: { ratedUserId: id },
          select: { score: true },
        },
      },
    });

    // Spora göre dağılım
    const sportMap: Record<string, { id: string; name: string; icon: string | null; count: number; totalScore: number; ratingCount: number }> = {};
    for (const m of matches) {
      const sport = m.listing?.sport;
      if (!sport) continue;
      if (!sportMap[sport.id]) {
        sportMap[sport.id] = { id: sport.id, name: sport.name, icon: sport.icon, count: 0, totalScore: 0, ratingCount: 0 };
      }
      sportMap[sport.id].count += 1;
      for (const r of m.ratings) {
        sportMap[sport.id].totalScore += r.score;
        sportMap[sport.id].ratingCount += 1;
      }
    }
    const bySport = Object.values(sportMap)
      .map((s) => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        matchCount: s.count,
        avgRating: s.ratingCount > 0 ? Math.round((s.totalScore / s.ratingCount) * 10) / 10 : null,
      }))
      .sort((a, b) => b.matchCount - a.matchCount);

    // Son 12 ay aylık aktivite (maç sayısı)
    const now = new Date();
    const monthlyMap: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[key] = 0;
    }
    for (const m of matches) {
      const date = m.scheduledAt ?? m.createdAt;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (key in monthlyMap) monthlyMap[key] += 1;
    }
    const monthly = Object.entries(monthlyMap).map(([month, count]) => ({ month, count }));

    // Toplam istatistik
    const completedMatches = matches.filter((m) => m.status === "COMPLETED");
    const allRatingsReceived = matches.flatMap((m) => m.ratings);
    const avgRating =
      allRatingsReceived.length > 0
        ? Math.round((allRatingsReceived.reduce((s, r) => s + r.score, 0) / allRatingsReceived.length) * 10) / 10
        : null;

    log.info("Kullanıcı istatistikleri yüklendi", { targetId: id, viewerId: currentUserId });

    return NextResponse.json({
      success: true,
      data: {
        totalMatches: matches.length,
        completedMatches: completedMatches.length,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        totalPoints: user.totalPoints,
        userLevel: user.userLevel,
        avgRating,
        ratingCount: allRatingsReceived.length,
        bySport,
        monthly,
      },
    });
  } catch (error) {
    log.error("Kullanıcı istatistikleri yüklenirken hata", error);
    return NextResponse.json({ success: false, error: "İstatistikler yüklenemedi" }, { status: 500 });
  }
}
