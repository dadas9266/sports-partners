import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("recommendations");

// GET /api/recommendations — Kişiselleştirilmiş ilan önerileri
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(req.url);
    const limit = Math.min(12, Number(searchParams.get("limit") ?? 6));

    // Giriş yapmamış kullanıcılar için popüler ilanlar göster
    if (!userId) {
      const popular = await prisma.listing.findMany({
        where: { status: "OPEN", dateTime: { gte: new Date() } },
        orderBy: [{ responses: { _count: "desc" } }, { createdAt: "desc" }],
        take: limit,
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
            select: { name: true, city: { select: { name: true } } },
          },
          venue: { select: { name: true } },
          // @ts-ignore
          user: { select: { id: true, name: true, avatarUrl: true, gender: true, birthDate: true } },
          _count: { select: { responses: true } },
        },
      });
      return NextResponse.json({ success: true, data: popular, reason: "popular" });
    }

    // Kullanıcının geçmişine bak
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        cityId: true,
        sports: { select: { id: true } },
        listings: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { sportId: true, type: true, level: true, districtId: true },
        },
        responses: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { listing: { select: { sportId: true, type: true, level: true } } },
        },
      },
    });

    if (!me) {
      return NextResponse.json({ success: true, data: [], reason: "no_data" });
    }

    // Tercih analizi
    const sportIds = [...new Set([
      ...me.sports.map((s) => s.id),
      ...me.listings.map((l) => l.sportId),
      ...me.responses.map((r) => r.listing.sportId),
    ])];

    const levels = [...new Set([
      ...me.listings.map((l) => l.level),
      ...me.responses.map((r) => r.listing.level),
    ])];

    const suggestions = await prisma.listing.findMany({
      where: {
        status: "OPEN",
        dateTime: { gte: new Date() },
        userId: { not: userId },
        // KESİN ŞEHİR FİLTRESİ: Farklı şehirdeki ilanları önerme
        ...(me.cityId ? { district: { cityId: me.cityId } } : {}),
        
        // Tercih edilen sporlar varsa onlara öncelik ver (OR hala kullanılabilir ama city dışında)
        OR: sportIds.length > 0 ? [{ sportId: { in: sportIds } }] : undefined,
        ...(levels.length > 0 ? { level: { in: levels as ("BEGINNER" | "INTERMEDIATE" | "ADVANCED")[] } } : {}),
      },
      orderBy: [{ dateTime: "asc" }],
      take: limit * 2,
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
          select: { name: true, city: { select: { name: true } } },
        },
        venue: { select: { name: true } },
        // @ts-ignore
        user: { select: { id: true, name: true, avatarUrl: true, gender: true, birthDate: true } },
        _count: { select: { responses: true } },
      },
    });

    // Skor hesapla (spor eşleşmesi = 2 puan, seviye eşleşmesi = 1 puan, şehir eşleşmesi = 1 puan)
    const sportSet = new Set(sportIds);
    const levelSet = new Set(levels);

    const scored = suggestions.map((l: any) => {
      let score = 0;
      if (sportSet.has(l.sport.id)) score += 2;
      if (levelSet.has(l.level)) score += 1;
      return { ...l, score };
    });

    const result = scored
      .sort((a, b) => b.score - a.score || a.dateTime.getTime() - b.dateTime.getTime())
      .slice(0, limit);

    return NextResponse.json({ success: true, data: result, reason: "personalized" });
  } catch (error) {
    log.error("Öneri hatası", error);
    return NextResponse.json({ success: false, error: "Öneriler yüklenemedi" }, { status: 500 });
  }
}
