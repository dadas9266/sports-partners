import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createResponseSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { createNotification, NOTIF } from "@/lib/notifications";

const log = createLogger("responses");

// Karşılık ver
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createResponseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { listingId, message } = parsed.data;

    // Rate limit — check early before any DB lookups
    const rateCheck = await checkRateLimit(userId, "response");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Çok fazla karşılık gönderdiniz. Lütfen bekleyin." },
        { status: 429 }
      );
    }

    // Profil tamamlama kontrolü
    const profileUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, birthDate: true, userType: true, sports: { select: { id: true } } },
    });
    const { getRequiredProfileFields } = await import("@/lib/profile-utils");
    const missingFields = getRequiredProfileFields({
      name: profileUser?.name,
      birthDate: profileUser?.birthDate,
      userType: profileUser?.userType,
      sports: profileUser?.sports,
    });
    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Başvuru yapmak için profilinizi tamamlayın. Eksik: ${missingFields.join(", ")}`, code: "PROFILE_INCOMPLETE" },
        { status: 400 }
      );
    }

    // İlan kontrolü
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json(
        { success: false, error: "İlan bulunamadı" },
        { status: 404 }
      );
    }

    if (listing.status !== "OPEN") {
      return NextResponse.json(
        { success: false, error: "Bu ilan artık aktif değil" },
        { status: 400 }
      );
    }

    // Kapasite kontrolü: kabul edilen başvuru sayısı + ilan sahibi >= maxParticipants
    const acceptedCount = await prisma.response.count({
      where: { listingId, status: "ACCEPTED" },
    });
    if (acceptedCount >= listing.maxParticipants - 1) {
      return NextResponse.json(
        { success: false, error: "Bu ilanın kontenjanı dolmuştur" },
        { status: 400 }
      );
    }

    // Hızlı ilan süresi dolmuş mu?
    if (listing.expiresAt && listing.expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: "Bu hızlı ilan süresi dolmuş" },
        { status: 400 }
      );
    }

    if (listing.userId === userId) {
      return NextResponse.json(
        { success: false, error: "Kendi ilanınıza karşılık veremezsiniz" },
        { status: 400 }
      );
    }

    // Engel kontrolü
    const block = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: listing.userId, blockedId: userId },
          { blockerId: userId, blockedId: listing.userId },
        ],
      },
    });
    if (block) {
      return NextResponse.json(
        { success: false, error: "Bu ilana karşılık gönderemezsiniz" },
        { status: 403 }
      );
    }

    // KAPALI PROFİL MESAJ/TEKLİF ENGELİ
    const targetUser = await prisma.user.findUnique({
      where: { id: listing.userId },
      select: { isPrivateProfile: true }
    });
    
    if (targetUser?.isPrivateProfile) {
      const isFollowing = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: userId, followingId: listing.userId } }
      });
      if (!isFollowing || isFollowing.status !== "ACCEPTED") {
        return NextResponse.json(
          { success: false, error: "Bu kullanıcıya sadece takipçileri mesaj/teklif gönderebilir." },
          { status: 403 }
        );
      }
    }

    // İlan banned kullanıcı engeli + cinsiyet kısıtı + yaş kısıtı kontrolü
    const applicant = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBanned: true, gender: true, birthDate: true },
    });

    if (applicant?.isBanned) {
      return NextResponse.json(
        { success: false, error: "Hesabınız geçici olarak kısıtlandı" },
        { status: 403 }
      );
    }

    if (listing.allowedGender !== "ANY") {
      if (listing.allowedGender === "FEMALE_ONLY" && applicant?.gender !== "FEMALE") {
        return NextResponse.json(
          { success: false, error: "Bu ilan yalnızca kadınlara açıktır" },
          { status: 403 }
        );
      }
      if (listing.allowedGender === "MALE_ONLY" && applicant?.gender !== "MALE") {
        return NextResponse.json(
          { success: false, error: "Bu ilan yalnızca erkeklere açıktır" },
          { status: 403 }
        );
      }
    }

    // Yaş aralığı kontrolü
    const listingWithAge = listing as typeof listing & { minAge?: number | null; maxAge?: number | null };
    if ((listingWithAge.minAge || listingWithAge.maxAge) && applicant?.birthDate) {
      const age = Math.floor((Date.now() - new Date(applicant.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (listingWithAge.minAge && age < listingWithAge.minAge) {
        return NextResponse.json(
          { success: false, error: `Bu ilan için minimum yaş ${listingWithAge.minAge}'dir. Mevcut yaşınız: ${age}` },
          { status: 403 }
        );
      }
      if (listingWithAge.maxAge && age > listingWithAge.maxAge) {
        return NextResponse.json(
          { success: false, error: `Bu ilan için maksimum yaş ${listingWithAge.maxAge}'dir. Mevcut yaşınız: ${age}` },
          { status: 403 }
        );
      }
    }

    // Aynı kullanıcının aynı ilana ikinci karşılığı engelle
    const existing = await prisma.response.findUnique({
      where: { listingId_userId: { listingId, userId } },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Bu ilana zaten karşılık verdiniz" },
        { status: 400 }
      );
    }

    const response = await prisma.response.create({
      data: { listingId, userId, message },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    // İlan sahibine bildirim gönder
    await createNotification({
      userId: listing.userId,
      ...NOTIF.newResponse(listingId, response.user.name),
    });

    log.info("Karşılık gönderildi", { responseId: response.id, listingId, userId });

    return NextResponse.json(
      { success: true, data: response },
      { status: 201 }
    );
  } catch (error) {
    log.error("Karşılık gönderilirken hata", error);
    return NextResponse.json(
      { success: false, error: "Karşılık gönderilemedi" },
      { status: 500 }
    );
  }
}
