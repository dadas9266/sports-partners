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
    const rateCheck = checkRateLimit(userId, "response");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Çok fazla karşılık gönderdiniz. Lütfen bekleyin." },
        { status: 429 }
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

    // İlan banned kullanıcı engeli + cinsiyet kısıtı kontrolü
    const applicant = await prisma.user.findUnique({
      where: { id: userId },
      select: { isBanned: true, gender: true },
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
