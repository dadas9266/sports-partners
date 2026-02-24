import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, isValidId, notFound } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("users:public-profile");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) return notFound("Geçersiz kullanıcı ID");

    const currentUserId = await getCurrentUserId();

    const user = (await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
        // @ts-ignore
        birthDate: true,
        // @ts-ignore
        gender: true,
        city: { select: { name: true, country: { select: { name: true } } } },
        sports: { select: { id: true, name: true, icon: true } },
        _count: {
          select: {
            listings: true,
            matches1: true,
            matches2: true,
            ratingsReceived: true,
          },
        },
        ratingsReceived: {
          select: { score: true },
        },
        listings: {
          where: { status: "OPEN" as any, dateTime: { gte: new Date() } },
          orderBy: { dateTime: "asc" as any },
          take: 6,
          select: {
            id: true,
            type: true,
            sport: { select: { id: true, name: true, icon: true } },
            district: { select: { name: true, city: { select: { name: true } } } },
            dateTime: true,
            level: true,
            status: true,
            description: true,
            _count: { select: { responses: true } },
          },
        },
      } as any,
    })) as any;

    if (!user) return notFound("Kullanıcı bulunamadı");

    // Ortalama puan hesapla
    const ratings = user.ratingsReceived || [];
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((s: number, r: { score: number }) => s + r.score, 0) /
          ratings.length
        : null;

    const count = user._count || {
      listings: 0,
      matches1: 0,
      matches2: 0,
      ratingsReceived: 0,
    };
    const totalMatches = (count.matches1 || 0) + (count.matches2 || 0);

    // Kendi profilinde ekstra bilgiler
    const isOwnProfile = currentUserId === id;

    log.info("Kullanıcı profili görüntülendi", { targetId: id, viewerId: currentUserId });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        createdAt: user.createdAt,
        birthDate: user.birthDate,
        gender: user.gender,
        city: user.city,
        sports: user.sports,
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        ratingCount: count.ratingsReceived || 0,
        totalListings: count.listings || 0,
        totalMatches,
        activeListings: user.listings || [],
        isOwnProfile,
      },
    });
  } catch (error) {
    log.error("Kullanıcı profili yüklenirken hata", error);
    return NextResponse.json(
      { success: false, error: "Profil yüklenemedi" },
      { status: 500 }
    );
  }
}
