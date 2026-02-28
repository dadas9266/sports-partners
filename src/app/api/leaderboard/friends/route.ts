import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("leaderboard-friends");

// Arkadaş Sıralaması — GET /api/leaderboard/friends
// Sadece takip edilen kullanıcılar + kendin arasında sıralama
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId)
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    // Takip edilenlerin ID listesi
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });
    const friendIds = [userId, ...following.map((f: { followingId: string }) => f.followingId)];

    const users = await prisma.user.findMany({
      where: { id: { in: friendIds } },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        userLevel: true,
        currentStreak: true,
        longestStreak: true,
        totalMatches: true,
        totalPoints: true,
        ratingsReceived: { select: { score: true } },
        sports: { select: { name: true, icon: true } },
      },
    });

    const ranked = users
      .map((u: (typeof users)[number]) => {
        const avgRating =
          u.ratingsReceived.length > 0
            ? u.ratingsReceived.reduce((s: number, r: { score: number }) => s + r.score, 0) / u.ratingsReceived.length
            : 0;
        return {
          id: u.id,
          name: u.name,
          avatarUrl: u.avatarUrl,
          userLevel: u.userLevel,
          currentStreak: u.currentStreak,
          longestStreak: u.longestStreak,
          totalMatches: u.totalMatches,
          totalPoints: u.totalPoints,
          avgRating: Math.round(avgRating * 10) / 10,
          ratingCount: u.ratingsReceived.length,
          sports: u.sports,
          isMe: u.id === userId,
        };
      })
      .sort((a: { totalPoints: number }, b: { totalPoints: number }) => b.totalPoints - a.totalPoints) // Puana göre sırala
      .map((u: object, i: number) => ({ ...u, rank: i + 1 }));

    return NextResponse.json({ rankings: ranked, total: ranked.length });
  } catch (err) {
    log.error("Arkadaş leaderboard hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
