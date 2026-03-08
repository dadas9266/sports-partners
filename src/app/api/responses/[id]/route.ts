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

      if (!listing || (listing.status !== "OPEN" && listing.status !== "MATCHED")) {
        throw new Error("İlan artık aktif değil");
      }

      // Mevcut kabul edilmiş başvuru sayısı (bu dahil edilmeden önce) + 1
      const acceptedCount = listing._count.responses + 1;
      // Kapasite kontrolü: 
      // maxParticipants=2 (1v1) ise acceptedCount=1 olduğunda dolar (sahibi + 1 kişi)
      // maxParticipants=3 ise acceptedCount=2 olduğunda dolar (sahibi + 2 kişi)
      const isCapacityFull = acceptedCount >= (listing.maxParticipants - 1);
      
      // Eğer kapasite dolduysa MATCHED yap, dolmadıysa OPEN kalmaya devam etsin
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
      } else {
        // Kapasite dolmadıysa ilanın OPEN olduğundan emin ol (belki manuel kapatılmıştır vs)
        await tx.listing.update({
          where: { id: response.listingId },
          data: { status: "OPEN" },
        });
      }

      // Match kaydı oluştur (Sadece 1v1 durumunda veya ilk eşleşmede mi?)
      // Mevcut yapıda 1 listing -> 1 match (unique listingId). 
      // Grup maçları için Match modelinin bire-bir olması bir kısıt.
      // Eğer bir match kaydı zaten varsa (grup maçı devam ediyorsa) tekrar oluşturma.
      const existingMatch = await tx.match.findUnique({ where: { listingId: response.listingId } });
      
      let match = null;
      if (!existingMatch) {
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
      } else {
        match = existingMatch;
      }

      return { response: updatedResponse, match };
    });

    log.info("Karşılık kabul edildi", { responseId: id, matchId: result.match?.id });

    // Karşılığın bağlı olduğu ilanı spor bilgisiyle birlikte tekrar çekiyoruz (TypeScript hatasını önlemek için)
    const listingWithSport = await prisma.listing.findUnique({
      where: { id: response.listingId },
      include: { sport: true }
    });
    const sportName = listingWithSport?.sport?.name ?? "Etkinlik";

    // Karşılık verene bildirim gönder
    const notifications = [
      createNotification({
        userId: response.userId,
        // NotificationType'a uygun tipler kullanıyoruz (RESETPONSE_ACCEPTED veya NEW_MATCH)
        type: result.match ? "NEW_MATCH" : "RESPONSE_ACCEPTED", 
        title: result.match ? "🤝 Eşleşme Gerçekleşti!" : "✅ Katılım Onaylandı",
        body: result.match 
          ? `"${sportName}" ilanı için kadro tamamlandı ve eşleşme gerçekleşti!` 
          : `"${sportName}" etkinliğine katılımınız onaylandı. Kontenjan dolduğunda eşleşme tamamlanacak.`,
        link: `/ilan/${response.listingId}`
      })
    ];

    // Eğer eşleşme oluştuysa (Kadro dolduysa) ilan sahibine de "Yeni Maç" bildirimi
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
