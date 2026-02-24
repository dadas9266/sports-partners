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

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
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
          where: { status: "OPEN", dateTime: { gte: new Date() } },
          orderBy: { dateTime: "asc" },
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
      },
    });

    if (!user) return notFound("Kullanıcı bulunamadı");

    // Ortalama puan hesapla
    const avgRating =
      user.ratingsReceived.length > 0
        ? user.ratingsReceived.reduce((s, r) => s + r.score, 0) /
          user.ratingsReceived.length
        : null;

    const totalMatches = user._count.matches1 + user._count.matches2;

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
        city: user.city,
        sports: user.sports,
        avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
        ratingCount: user._count.ratingsReceived,
        totalListings: user._count.listings,
        totalMatches,
        activeListings: user.listings,
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
