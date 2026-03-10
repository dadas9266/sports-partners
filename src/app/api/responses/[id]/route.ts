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

    // KABUL ET: Transaction ile kapasite kontrolü ve eşleşme mantığı
    const result = await prisma.$transaction(async (tx) => {
      // Karşılığı kabul et
      const updatedResponse = await tx.response.update({
        where: { id },
        data: { status: "ACCEPTED" },
      });

      // Bu kabul DAHİL toplam kabul edilen karşılık sayısını doğrudan say
      const acceptedCount = await tx.response.count({
        where: { listingId: response.listingId, status: "ACCEPTED" },
      });

      // İlanı bul
      const listing = await tx.listing.findUnique({
        where: { id: response.listingId },
      });

      // Sadece OPEN ilanlar kabul işlemi yapabilir
      if (!listing || listing.status !== "OPEN") {
        throw new Error("İlan artık yeni başvuru kabul etmiyor");
      }

      // Sahibi hariç gereken slot sayısı (maxParticipants sahibi dahil toplam)
      const slotsNeeded = listing.maxParticipants - 1;
      const isCapacityFull = acceptedCount >= slotsNeeded;
      const remaining = slotsNeeded - acceptedCount; // 0 veya daha fazla

      if (isCapacityFull) {
        // ── Tüm kontenjan doldu → MATCHED ──────────────────────────────────
        await tx.listing.update({
          where: { id: response.listingId },
          data: { status: "MATCHED" },
        });

        // Bekleyen diğer başvuruları otomatik reddet
        await tx.response.updateMany({
          where: {
            listingId: response.listingId,
            id: { not: id },
            status: "PENDING",
          },
          data: { status: "REJECTED" },
        });

        // 1v1 için Match kaydı oluştur (sadece maxParticipants=2 durumunda)
        let match = null;
        if (listing.maxParticipants === 2) {
          const existingMatch = await tx.match.findUnique({ where: { listingId: response.listingId } });
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
        }

        // Kontenjan dolunca tüm kabul edilmiş kullanıcıların ID'lerini al
        const acceptedResponses = await tx.response.findMany({
          where: { listingId: response.listingId, status: "ACCEPTED" },
          select: { userId: true },
        });

        return {
          response: updatedResponse,
          match,
          acceptedUserIds: acceptedResponses.map((r) => r.userId),
          isCapacityFull: true,
          remaining: 0,
        };
      } else {
        // ── Kontenjan dolmadı → ilan OPEN kalmaya devam eder ──────────────
        return {
          response: updatedResponse,
          match: null,
          acceptedUserIds: [],
          isCapacityFull: false,
          remaining,
        };
      }
    });

    log.info("Karşılık kabul edildi", { responseId: id, isCapacityFull: result.isCapacityFull });

    const listingWithSport = await prisma.listing.findUnique({
      where: { id: response.listingId },
      include: { sport: true },
    });
    const sportName = listingWithSport?.sport?.name ?? "Etkinlik";

    const notificationPromises: Promise<any>[] = [];

    if (result.isCapacityFull) {
      // Kontenjan doldu — tüm kabul edilmiş kullanıcılara "Eşleşme gerçekleşti!" bildirimi
      for (const acceptedUserId of result.acceptedUserIds) {
        notificationPromises.push(
          createNotification({
            userId: acceptedUserId,
            type: "NEW_MATCH",
            title: "🎉 Eşleşme Gerçekleşti!",
            body: `"${sportName}" ilanı için kadro tamamlandı! Eşleşme gerçekleşti.`,
            link: `/ilan/${response.listingId}`,
          })
        );
      }
      // İlan sahibine de bildirim
      notificationPromises.push(
        createNotification({
          userId: response.listing.userId,
          type: "NEW_MATCH",
          title: "🎉 Kadronuz Tamamlandı!",
          body: `"${sportName}" ilanınız için tüm katılımcılar tamamlandı. Eşleşme gerçekleşti!`,
          link: `/ilan/${response.listingId}`,
        })
      );
    } else {
      // Kontenjan dolmadı — kabul edilen kişiye "X kişi daha gerekiyor" bildirimi
      notificationPromises.push(
        createNotification({
          userId: response.userId,
          type: "RESPONSE_ACCEPTED",
          title: "✅ Katılımınız Onaylandı!",
          body: `"${sportName}" etkinliğine katılımınız onaylandı. Eşleşme için ${result.remaining} kişi daha gerekiyor.`,
          link: `/ilan/${response.listingId}`,
        })
      );
    }

    await Promise.all(notificationPromises);

    // Otomatik aktivite paylaşımı kaldırıldı — eşleşme duyurusu artık sosyal akışta gösterilmiyor
    // Kullanıcılar isterse eşleşmeyi kendileri paylaşabilir

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    log.error("İşlem gerçekleştirilirken hata", error);
    return NextResponse.json(
      { success: false, error: "İşlem gerçekleştirilemedi" },
      { status: 500 }
    );
  }
}

// DELETE /api/responses/[id] — Başvuruyu geri çek (sadece PENDING durumunda)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { id } = await params;
    if (!isValidId(id)) return notFound("Geçersiz karşılık ID");

    const response = await prisma.response.findUnique({
      where: { id },
      include: { listing: { select: { userId: true, sport: { select: { name: true } } } } },
    });

    if (!response) {
      return NextResponse.json({ success: false, error: "Başvuru bulunamadı" }, { status: 404 });
    }

    // Sadece başvuruyu yapan kişi geri çekebilir
    if (response.userId !== userId) {
      return NextResponse.json({ success: false, error: "Bu başvuru size ait değil" }, { status: 403 });
    }

    // Sadece PENDING başvurular geri çekilebilir
    if (response.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "Sadece bekleyen başvurular geri çekilebilir" }, { status: 400 });
    }

    await prisma.response.delete({ where: { id } });

    // İlan sahibine bildirim
    await createNotification({
      userId: response.listing.userId,
      ...NOTIF.rejected(response.listingId),
      title: "↩️ Başvuru Geri Çekildi",
      body: `"${response.listing.sport?.name ?? "Etkinlik"}" ilanınıza yapılan bir başvuru geri çekildi.`,
    });

    log.info("Başvuru geri çekildi", { responseId: id, userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Başvuru geri çekilirken hata", error);
    return NextResponse.json({ success: false, error: "İşlem gerçekleştirilemedi" }, { status: 500 });
  }
}
