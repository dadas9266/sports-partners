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

    // Engelleme kontrolü: Hedef kullanıcı bizi engellemiş mi?
    let isBlockedByThem = false;
    if (currentUserId && currentUserId !== id) {
      const block = await prisma.userBlock.findFirst({
        where: { blockerId: id, blockedId: currentUserId },
      });
      if (block) {
        return NextResponse.json(
          { success: false, error: "Bu profili görüntüleme yetkiniz yok", code: "BLOCKED" },
          { status: 403 }
        );
      }
      // Biz mi onları engelledik?
      const iBlockedThem = await prisma.userBlock.findFirst({
        where: { blockerId: currentUserId, blockedId: id, type: "BLOCK" },
      });
      isBlockedByThem = !!iBlockedThem;
    }

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
        // @ts-ignore
        currentStreak: true,
        // @ts-ignore
        longestStreak: true,
        city: { select: { name: true, country: { select: { name: true } } } },
        sports: { select: { id: true, name: true, icon: true } },
        ratingsReceived: {
          select: { score: true },
        },
        trainerProfile: {
          select: {
            isVerified: true,
            hourlyRate: true,
            gymName: true,
            university: true,
            department: true,
            experienceYears: true,
            lessonTypes: true,
            providesEquipment: true,
            certNote: true,
            trainerBadgeVisible: true,
            specializations: { select: { sportName: true, years: true } },
          },
        },
        coverUrl: true,
        instagram: true,
        tiktok: true,
        facebook: true,
        twitterX: true,
        vk: true,
        telegram: true,
        whatsapp: true,
        socialLinksVisibility: true,
        profileVisibility: true,
        whoCanMessage: true,
        whoCanChallenge: true,
        isPrivateProfile: true,
        clubMemberships: {
          select: {
            role: true,
            club: {
              select: {
                id: true, name: true,
                sport: { select: { id: true, name: true, icon: true } },
              },
            },
          },
        },
        _count: {
          select: {
            listings: true,
            matches1: true,
            matches2: true,
            ratingsReceived: true,
            followers: true,
            following: true,
          },
        } as any,
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

    // Gizlilik kontrolü (Profil bazlı)
    const isOwnProfile = currentUserId === id;
    const existingFollow = (currentUserId && !isOwnProfile)
      ? await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: currentUserId, followingId: id } },
        })
      : null;

    const isFollowing = existingFollow?.status === "ACCEPTED";
    const pendingFollow = existingFollow?.status === "PENDING";

    // Instagram Mantığı: Profil her zaman yüklenir, içerik maskelenir.
    const isRestricted = !isOwnProfile && (
      user.profileVisibility === "NOBODY" ||
      ((user.profileVisibility === "FOLLOWERS" || user.isPrivateProfile) && !isFollowing)
    );

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

    const [followersCount, followingCount] = await Promise.all([
      prisma.follow.count({ where: { followingId: id, status: "ACCEPTED" } }),
      prisma.follow.count({ where: { followerId: id, status: "ACCEPTED" } }),
    ]);

    log.info("Kullanıcı profili görüntülendi", { targetId: id, viewerId: currentUserId });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        // Gizli profillerde kişisel bilgileri maskele
        bio: isRestricted ? null : user.bio,
        createdAt: user.createdAt,
        birthDate: isRestricted ? null : user.birthDate,
        gender: isRestricted ? null : user.gender,
        city: isRestricted ? null : user.city,
        sports: isRestricted ? [] : user.sports,
        avgRating: isRestricted ? null : (avgRating ? Math.round(avgRating * 10) / 10 : null),
        ratingCount: isRestricted ? 0 : (count.ratingsReceived || 0),
        totalListings: isRestricted ? 0 : (count.listings || 0),
        totalMatches: isRestricted ? 0 : totalMatches,
        activeListings: isRestricted ? [] : (user.listings || []),
        isOwnProfile,
        trainerProfile: isRestricted ? null : (user.trainerProfile ?? null),
        coverUrl: isRestricted ? null : (user.coverUrl ?? null),
        ...(() => {
          const slv = user.socialLinksVisibility ?? "EVERYONE";
          const hideSocial = isRestricted || (!isOwnProfile && (slv === "NOBODY" || (slv === "FOLLOWERS" && !isFollowing)));
          return {
            instagram: hideSocial ? null : (user.instagram ?? null),
            tiktok: hideSocial ? null : (user.tiktok ?? null),
            facebook: hideSocial ? null : (user.facebook ?? null),
            twitterX: hideSocial ? null : (user.twitterX ?? null),
            vk: hideSocial ? null : (user.vk ?? null),
            telegram: hideSocial ? null : (user.telegram ?? null),
            whatsapp: hideSocial ? null : (user.whatsapp ?? null),
          };
        })(),
        clubs: isRestricted ? [] : (user.clubMemberships ?? []).map((m: any) => ({ ...m.club, role: m.role })),
        followersCount,
        followingCount,
        currentStreak: isRestricted ? 0 : (user.currentStreak ?? 0),
        longestStreak: isRestricted ? 0 : (user.longestStreak ?? 0),
        whoCanMessage: isOwnProfile ? undefined : (user.whoCanMessage ?? "EVERYONE"),
        whoCanChallenge: isOwnProfile ? undefined : (user.whoCanChallenge ?? "EVERYONE"),
        isBlockedByThem,
        isPrivateProfile: user.isPrivateProfile ?? false,
        isRestricted, // Frontend kilit ekranı için
        pendingFollow,
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
