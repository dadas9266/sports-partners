import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, isValidId, notFound } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification, NOTIF } from "@/lib/notifications";

const log = createLogger("responses:action");

// Karşılığı kabul veya reddet
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!isValidId(id)) return notFound("Geçersiz karşılık ID");
    const body = await request.json();
    const { action } = body; // "accept" or "reject"

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Geçersiz işlem" },
        { status: 400 }
      );
    }

    // Karşılığı bul
    const response = await prisma.response.findUnique({
      where: { id },
      include: { listing: true },
    });

    if (!response) {
      return NextResponse.json(
        { success: false, error: "Karşılık bulunamadı" },
        { status: 404 }
      );
    }

    // Sadece ilan sahibi kabul/red yapabilir
    if (response.listing.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    if (response.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Bu karşılık zaten işlenmiş" },
        { status: 400 }
      );
    }

    if (action === "reject") {
      const updated = await prisma.response.update({
        where: { id },
        data: { status: "REJECTED" },
      });
      // Karşılık verenin bildirimı
      await createNotification({
        userId: response.userId,
        ...NOTIF.rejected(response.listingId),
      });
      log.info("Karşılık reddedildi", { responseId: id, userId });
      return NextResponse.json({ success: true, data: updated });
    }

    // KABUL ET: Transaction ile match oluştur
    const result = await prisma.$transaction(async (tx) => {
      // Karşılığı kabul et
      const updatedResponse = await tx.response.update({
        where: { id },
        data: { status: "ACCEPTED" },
      });

      // İlanı bul (kapasite kontrolü için)
      const listing = await tx.listing.findUnique({
        where: { id: response.listingId },
        include: { _count: { select: { responses: { where: { status: "ACCEPTED" } } } } }
      });

      if (!listing || listing.status !== "OPEN") {
        throw new Error("İlan artık aktif değil");
      }

      // Mevcut kabul edilmiş başvuru sayısı (bu dahil edilmeden önce) + 1
      const acceptedCount = listing._count.responses + 1;
      const isCapacityFull = acceptedCount >= listing.maxParticipants - 1; // maxParticipants kendisi dahil (2 kişilik maçta 1 başvuru yetmeli)
      
      // Eğer tekil eşleşme ise (maxParticipants=2) veya kapasite dolduysa MATCHED yap
      if (isCapacityFull) {
        await tx.listing.update({
          where: { id: response.listingId },
          data: { status: "MATCHED" },
        });

        // Diğer bekleyen karşılıkları reddet (sadece kapasite dolunca)
        await tx.response.updateMany({
          where: {
            listingId: response.listingId,
            id: { not: id },
            status: "PENDING",
          },
          data: { status: "REJECTED" },
        });
      }

      // Match kaydı oluştur (her kabulde bir match record mu yoksa grup maçı mı?)
      // Mevcut yapı 1 listing -> 1 match (unique listingId). 
      // Grup maçları için Match modelinin değişmesi gerekebilir ama şimdilik mevcut yapıyı koruyalım
      // ve sadece 1v1 (max=2) durumunda MATCHED/Match record mantığını işletelim.
      
      let match = null;
      if (listing.maxParticipants <= 2) {
        match = await tx.match.create({
          data: {
            listingId: response.listingId,
            responseId: id,
            user1Id: response.listing.userId,
            user2Id: response.userId,
          },
          include: {
            user1: { select: { id: true, name: true, avatarUrl: true } },
            user2: { select: { id: true, name: true, avatarUrl: true } },
          },
        });
      }

      return { response: updatedResponse, match };
    });

    log.info("Karşılık kabul edildi", { responseId: id, matchId: result.match?.id });

    // Karşılık verene bildirim gönder
    const notifications = [
      createNotification({
        userId: response.userId,
        ...NOTIF.accepted(response.listingId),
      })
    ];

    // Eğer eşleşme oluştuysa ilan sahibine de "Yeni Maç" bildirimi
    if (result.match) {
      notifications.push(
        createNotification({
          userId: response.listing.userId,
          ...NOTIF.newMatch(response.listingId),
        })
      );
    }
    
    await Promise.all(notifications);

    // Otomatik aktivite paylaşımı oluştur (Sadece gerçek eşleşme/match oluştuğunda)
    if (result.match) {
      try {
        const listingDetail = await prisma.listing.findUnique({
          where: { id: response.listingId },
          include: { sport: true },
        });
        if (listingDetail) {
          const sportName = listingDetail.sport?.name ?? "spor";
          const u1Name = result.match.user1.name;
          const u2Name = result.match.user2.name;
          const activityText = `🤝 ${u1Name} ve ${u2Name} ${sportName} için eşleşti!`;
          await prisma.post.create({
            data: {
              userId: response.listing.userId,
              content: activityText,
              images: [],
            },
          });
        }
      } catch (e) {
        log.error("Aktivite paylaşımı oluşturulamadı", e);
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    log.error("İşlem gerçekleştirilirken hata", error);
    return NextResponse.json(
      { success: false, error: "İşlem gerçekleştirilemedi" },
      { status: 500 }
    );
  }
}
