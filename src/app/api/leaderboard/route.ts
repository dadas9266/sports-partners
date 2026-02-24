import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { computeBadges } from "@/lib/badges";

const log = createLogger("leaderboard");

// GET /api/leaderboard?sport=id&limit=20
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sportId = searchParams.get("sport");
    const limit = Math.min(50, Math.max(5, Number(searchParams.get("limit") ?? 20)));

    // En yüksek puan ortalaması olan kullanıcılar (min 3 değerlendirme)
    const users = await prisma.user.findMany({
      where: {
        ...(sportId
          ? { sports: { some: { id: sportId } } }
          : {}),
        ratingsReceived: { some: {} },
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        cityId: true,
        city: { select: { name: true } },
        sports: { select: { id: true, name: true, icon: true } },
        ratingsReceived: { select: { score: true } },
        _count: {
          select: {
            matches1: true,
            matches2: true,
            listings: true,
          },
        },
      },
    });

    // Puan hesapla, sırala, filtrele (min 1 değerlendirme)
    const ranked = users
      .map((u) => {
        const totalMatches = u._count.matches1 + u._count.matches2;
        const avgRating =
          u.ratingsReceived.length > 0
            ? u.ratingsReceived.reduce((s: number, r: { score: number }) => s + r.score, 0) /
              u.ratingsReceived.length
            : 0;
        const badges = computeBadges({ totalMatches, avgRating, ratingCount: u.ratingsReceived.length });

        return {
          id: u.id,
          name: u.name,
          avatarUrl: u.avatarUrl,
          city: u.city,
          sports: u.sports,
          avgRating: Math.round(avgRating * 10) / 10,
          ratingCount: u.ratingsReceived.length,
          totalMatches,
          totalListings: u._count.listings,
          badges,
        };
      })
      .filter((u) => u.avgRating > 0)
      .sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount)
      .slice(0, limit);

    return NextResponse.json({ success: true, data: ranked });
  } catch (error) {
    log.error("Liderlik tablosu hatası", error);
    return NextResponse.json({ success: false, error: "Liderlik tablosu yüklenemedi" }, { status: 500 });
  }
}
