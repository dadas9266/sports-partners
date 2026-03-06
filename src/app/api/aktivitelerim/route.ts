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
          responses: {
            where: { status: "PENDING" },
            select: {
              id: true,
              message: true,
              user: { select: { id: true, name: true, avatarUrl: true } },
            },
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
          u1Approved: true,
          u2Approved: true,
          u1Reported: true,
          u2Reported: true,
          user1Id: true,
          user2Id: true,
        },
      }),
    ]);

    // Her maç için kullanıcının onaylayıp onaylamadığını ve puan verip vermediğini ekle
    const matchesWithMeta = matches.map((m) => {
      const isU1 = m.user1Id === userId;
      const myApproved = isU1 ? m.u1Approved : m.u2Approved;
      const myReported = isU1 ? m.u1Reported : m.u2Reported;
      
      return {
        ...m,
        iHaveConfirmed: myApproved || m.status === "COMPLETED",
        iHaveReported: myReported,
        iHaveRated: (m as any).ratings.some((r: any) => r.ratedById === userId),
      };
    });

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
