import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { updateProfileSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import bcrypt from "bcryptjs";

const log = createLogger("profile");

// Mevcut kullanıcının profil bilgileri
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const [user, myListings, myResponses, myMatches, myFavorites, unreadNotifications] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true, name: true, email: true, phone: true, createdAt: true,
          bio: true, avatarUrl: true,
          gender: true,
          noShowCount: true,
          warnCount: true,
          isBanned: true,
          preferredTime: true,
          preferredStyle: true,
          onboardingDone: true,
          city: { select: { id: true, name: true, country: { select: { name: true } } } },
          sports: { select: { id: true, name: true, icon: true } },
          ratingsReceived: { select: { score: true } },
        },
      }),
      prisma.listing.findMany({
        where: { userId },
        include: {
          sport: true,
          district: { include: { city: true } },
          venue: true,
          responses: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
          },
          match: {
            include: {
              user2: { select: { id: true, name: true, phone: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.response.findMany({
        where: { userId },
        include: {
          listing: {
            include: {
              sport: true,
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.match.findMany({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
        include: {
          listing: { include: { sport: true, venue: true } },
          user1: { select: { id: true, name: true, phone: true, email: true } },
          user2: { select: { id: true, name: true, phone: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Favoriler
      prisma.favorite.findMany({
        where: { userId },
        include: {
          listing: {
            include: {
              sport: true,
              district: { include: { city: true } },
              user: { select: { id: true, name: true } },
              _count: { select: { responses: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Okunmamış bildirim sayısı
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    const avgRating = user && user.ratingsReceived.length > 0
      ? Math.round((user.ratingsReceived.reduce((s, r) => s + r.score, 0) / user.ratingsReceived.length) * 10) / 10
      : null;

    return NextResponse.json({
      success: true,
      data: {
        user: { ...user, avgRating, ratingCount: user?.ratingsReceived.length ?? 0 },
        myListings,
        myResponses,
        myMatches,
        myFavorites: myFavorites.map((f) => f.listing),
        unreadNotifications,
      },
    });
  } catch (error) {
    log.error("Profil yüklenirken hata", error);
    return NextResponse.json(
      { success: false, error: "Profil yüklenemedi" },
      { status: 500 }
    );
  }
}

// Profil güncelle
export async function PUT(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
    if ("bio" in parsed.data && parsed.data.bio !== undefined) updateData.bio = parsed.data.bio;
    if ("cityId" in parsed.data && parsed.data.cityId !== undefined) updateData.cityId = parsed.data.cityId || null;
    if ("avatarUrl" in parsed.data && parsed.data.avatarUrl !== undefined) updateData.avatarUrl = parsed.data.avatarUrl;
    if ("gender" in parsed.data && parsed.data.gender !== undefined) updateData.gender = parsed.data.gender;
    if ("preferredTime" in parsed.data && parsed.data.preferredTime !== undefined) updateData.preferredTime = parsed.data.preferredTime;
    if ("preferredStyle" in parsed.data && parsed.data.preferredStyle !== undefined) updateData.preferredStyle = parsed.data.preferredStyle;
    if ("onboardingDone" in parsed.data && parsed.data.onboardingDone !== undefined) updateData.onboardingDone = parsed.data.onboardingDone;

    // Favori sporlar güncelleme
    const sportIds = "sportIds" in parsed.data ? (parsed.data as { sportIds?: string[] }).sportIds : undefined;
    if (sportIds !== undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { sports: { set: sportIds.map((id) => ({ id })) } },
      });
    }

    // Şifre değiştirme
    if (parsed.data.newPassword && parsed.data.currentPassword) {
      // Rate limit for password change attempts
      const rateCheck = checkRateLimit(userId, "auth");
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { success: false, error: "Çok fazla deneme. Lütfen bekleyin." },
          { status: 429 }
        );
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Kullanıcı bulunamadı" },
          { status: 404 }
        );
      }

      const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash ?? "");
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Mevcut şifre hatalı" },
          { status: 400 }
        );
      }

      updateData.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "Güncellenecek bir alan bulunamadı" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, name: true, email: true, phone: true,
        bio: true, avatarUrl: true,
        city: { select: { id: true, name: true } },
        sports: { select: { id: true, name: true, icon: true } },
      },
    });

    log.info("Profil güncellendi", { userId });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    log.error("Profil güncellenirken hata", error);
    return NextResponse.json(
      { success: false, error: "Profil güncellenemedi" },
      { status: 500 }
    );
  }
}
