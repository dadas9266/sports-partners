import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("aktivitelerim");

/**
 * GET /api/aktivitelerim
 * Kullanıcının tüm aktivitesini (ilanlar, başvurular, eşleşmeler) döndürür.
 */
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId)
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    const [listings, responses, matches] = await Promise.all([
      // Kullanıcının kendi ilanları
      prisma.listing.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          type: true,
          status: true,
          dateTime: true,
          createdAt: true,
          sport: { select: { id: true, name: true, icon: true } },
          district: {
            select: { name: true, city: { select: { name: true } } },
          },
          _count: { select: { responses: true } },
        },
      }),

      // Kullanıcının başvurduğu ilanlar (oluşturduğu response'lar)
      prisma.response.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          status: true,
          message: true,
          createdAt: true,
          listing: {
            select: {
              id: true,
              type: true,
              status: true,
              dateTime: true,
              sport: { select: { id: true, name: true, icon: true } },
              district: {
                select: { name: true, city: { select: { name: true } } },
              },
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      }),

      // Kullanıcının eşleşmeleri
      prisma.match.findMany({
        where: {
          OR: [{ user1Id: userId }, { user2Id: userId }],
        },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          status: true,
          scheduledAt: true,
          completedAt: true,
          trustScore: true,
          approvedById: true,
          createdAt: true,
          user1: { select: { id: true, name: true, avatarUrl: true } },
          user2: { select: { id: true, name: true, avatarUrl: true } },
          listing: {
            select: {
              id: true,
              type: true,
              dateTime: true,
              sport: { select: { id: true, name: true, icon: true } },
              district: {
                select: { name: true, city: { select: { name: true } } },
              },
            },
          },
          ratings: { select: { ratedById: true } },
          _count: { select: { messages: true } },
        },
      }),
    ]);

    // Her maç için kullanıcının onaylayıp onaylamadığını ve puan verip vermediğini ekle
    const matchesWithMeta = matches.map((m) => ({
      ...m,
      iHaveConfirmed: m.approvedById === userId || m.status === "COMPLETED",
      iHaveRated: m.ratings.some((r) => r.ratedById === userId),
    }));

    log.info("Aktivitelerim yüklendi", {
      userId,
      listings: listings.length,
      responses: responses.length,
      matches: matches.length,
    });

    return NextResponse.json({
      success: true,
      data: { listings, responses, matches: matchesWithMeta },
    });
  } catch (err) {
    log.error("Aktivitelerim hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
