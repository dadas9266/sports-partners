import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { updateProfileSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import bcrypt from "bcryptjs";
import { cacheDel, cacheKey } from "@/lib/cache";

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

    const [user, myListings, myResponses, myMatches, myFavorites, unreadNotifications, followersCount, followingCount, myClubs, myGroups] = await Promise.all([
      prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
        select: {
          id: true, name: true, email: true, phone: true, createdAt: true,
          bio: true, avatarUrl: true, coverUrl: true,
          gender: true,
          birthDate: true,
          noShowCount: true,
          warnCount: true,
          isBanned: true,
          preferredTime: true,
          preferredStyle: true,
          onboardingDone: true,
          userType: true,
          userLevel: true,
          lastSeenAt: true,
          currentStreak: true,
          longestStreak: true,
          totalMatches: true,
          totalPoints: true,
          lastActiveDate: true,
          city: { select: { id: true, name: true, country: { select: { id: true, name: true } } } },
          district: { select: { id: true, name: true } },
          sports: { select: { id: true, name: true, icon: true } },
          ratingsReceived: { select: { score: true } },
          ratingsGiven: { select: { matchId: true } },
          trainerProfile: { select: { isVerified: true, gymName: true, specializations: { select: { sportName: true, years: true } } } },
          venueProfile: { select: { isVerified: true, businessName: true, address: true, phone: true, website: true, logoUrl: true } },
          instagram: true,
          tiktok: true,
          facebook: true,
          twitterX: true,
          vk: true,
          _count: {
            select: {
              followers: true,
              following: true,
            }
          }
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
            take: 20,
          },
          match: {
            include: {
              user2: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
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
        take: 50,
      }),
      prisma.match.findMany({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
        include: {
          listing: { include: { sport: true, venue: true } },
          user1: { select: { id: true, name: true, avatarUrl: true } },
          user2: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
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
        take: 50,
      }),
      // Okunmamış bildirim sayısı
      prisma.notification.count({ where: { userId, read: false } }),
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
      // Kulüp üyelikleri
      prisma.userClubMembership.findMany({
        where: { userId },
        include: {
          club: {
            select: {
              id: true, name: true, description: true, website: true,
              sport: { select: { id: true, name: true, icon: true } },
              city: { select: { id: true, name: true } },
              _count: { select: { members: true } },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
        take: 50,
      }),
      // Grup üyelikleri
      prisma.groupMembership.findMany({
        where: { userId },
        include: {
          group: {
            select: {
              id: true, name: true, description: true, isPublic: true,
              sport: { select: { id: true, name: true, icon: true } },
              city: { select: { id: true, name: true } },
              _count: { select: { members: true } },
            },
          },
        },
        orderBy: { joinedAt: "desc" },
        take: 50,
      }),
    ]);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Kullanıcı bulunamadı" },
        { status: 404 }
      );
    }

    const avgRating = (user as any).ratingsReceived?.length > 0
      ? Math.round(((user as any).ratingsReceived.reduce((s: number, r: { score: number }) => s + r.score, 0) / (user as any).ratingsReceived.length) * 10) / 10
      : null;
    const ratedMatchIds = new Set(((user as any).ratingsGiven ?? []).map((r: { matchId: string }) => r.matchId));

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...user,
          _count: {
            ...(user as any)._count,
            followers: followersCount,
            following: followingCount,
          },
          avgRating,
          ratingCount: (user as any).ratingsReceived?.length ?? 0,
        },
        ratedMatchIds: Array.from(ratedMatchIds),
        myListings,
        myResponses,
        myMatches,
        myFavorites: myFavorites.map((f) => f.listing),
        myClubs,
        myGroups,
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
    const userBefore = await prisma.user.findUnique({ where: { id: userId } });

    if (parsed.data.name !== undefined) {
      updateData.name = parsed.data.name;
    }
    if (parsed.data.phone !== undefined) {
      updateData.phone = parsed.data.phone;
    }
    if ("bio" in parsed.data && parsed.data.bio !== undefined) {
      updateData.bio = parsed.data.bio;
    }
    if ("cityId" in parsed.data && parsed.data.cityId !== undefined) {
      updateData.cityId = parsed.data.cityId || null;
    }
    if ("districtId" in parsed.data && parsed.data.districtId !== undefined) {
      updateData.districtId = parsed.data.districtId || null;
    }
    if ("avatarUrl" in parsed.data && parsed.data.avatarUrl !== undefined) {
      updateData.avatarUrl = parsed.data.avatarUrl;
    }
    if ("coverUrl" in parsed.data && parsed.data.coverUrl !== undefined) {
      updateData.coverUrl = parsed.data.coverUrl;
    }
    if ("gender" in parsed.data && parsed.data.gender !== undefined) {
      updateData.gender = parsed.data.gender;
    }
    if ("birthDate" in parsed.data && parsed.data.birthDate !== undefined) {
      updateData.birthDate = parsed.data.birthDate ? new Date(parsed.data.birthDate) : null;
    }
    if ("preferredTime" in parsed.data && parsed.data.preferredTime !== undefined) {
      updateData.preferredTime = parsed.data.preferredTime;
    }
    if ("preferredStyle" in parsed.data && parsed.data.preferredStyle !== undefined) {
      updateData.preferredStyle = parsed.data.preferredStyle;
    }
    if ("onboardingDone" in parsed.data && parsed.data.onboardingDone !== undefined) {
      updateData.onboardingDone = parsed.data.onboardingDone;
    }
    // Sosyal Medya linkleri
    if ("instagram" in parsed.data) updateData.instagram = parsed.data.instagram ?? null;
    if ("tiktok" in parsed.data) updateData.tiktok = parsed.data.tiktok ?? null;
    if ("facebook" in parsed.data) updateData.facebook = parsed.data.facebook ?? null;
    if ("twitterX" in parsed.data) updateData.twitterX = parsed.data.twitterX ?? null;
    if ("vk" in parsed.data) updateData.vk = parsed.data.vk ?? null;

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
      const rateCheck = await checkRateLimit(userId, "auth");
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


    // Trust score update kaldırıldı (guvenPuani alanı mevcut değil)

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, name: true, email: true, phone: true,
        bio: true, avatarUrl: true, coverUrl: true,
        city: { select: { id: true, name: true } },
        sports: { select: { id: true, name: true, icon: true } },
      },
    });

    // Profil cache'ini temizle
    await cacheDel(cacheKey.profile(userId));

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
