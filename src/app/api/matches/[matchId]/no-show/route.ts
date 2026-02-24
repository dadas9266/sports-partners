import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

const log = createLogger("no-show");

// Gelmedi bildirimi — POST /api/matches/[matchId]/no-show
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const { matchId } = await params;

    // Maç var mı ve bu kullanıcı bu maçın tarafı mı?
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { listing: { select: { id: true } } },
    });

    if (!match) {
      return NextResponse.json(
        { success: false, error: "Maç bulunamadı" },
        { status: 404 }
      );
    }

    const isParticipant = match.user1Id === userId || match.user2Id === userId;
    if (!isParticipant) {
      return NextResponse.json(
        { success: false, error: "Bu maça ait değilsiniz" },
        { status: 403 }
      );
    }

    // Şikayet edilen kişi — karşı taraf
    const reportedId = match.user1Id === userId ? match.user2Id : match.user1Id;

    // Aynı maç için ikinci kez rapor engellensin
    const existing = await prisma.noShowReport.findUnique({
      where: { matchId_reporterId: { matchId, reporterId: userId } },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Bu maç için zaten gelmedi bildirimi yaptınız" },
        { status: 400 }
      );
    }

    // Raporu oluştur
    await prisma.noShowReport.create({
      data: {
        matchId,
        reporterId: userId,
        reportedId,
        listingId: match.listingId,
      },
    });

    // Şikayet edilen kullanıcının noShowCount'unu arttır
    const updated = await prisma.user.update({
      where: { id: reportedId },
      data: { noShowCount: { increment: 1 } },
      select: { noShowCount: true, name: true },
    });

    log.info("No-show bildirimi yapıldı", { matchId, reporterId: userId, reportedId });

    const noShowCount = updated.noShowCount;

    // Ceza zinciri
    if (noShowCount >= 3) {
      // 3. kez — geçici kısıtlama
      await prisma.user.update({
        where: { id: reportedId },
        data: { isBanned: true, warnCount: { increment: 1 } },
      });

      await createNotification({
        userId: reportedId,
        type: "NO_SHOW_WARNING",
        title: "⛔ Hesabınız Kısıtlandı",
        body: "3 kez etkinliklere gelmediğiniz bildirildi. Hesabınız geçici olarak kısıtlandı.",
        link: "/profil",
      });
    } else if (noShowCount === 2) {
      // 2. kez — son uyarı
      await createNotification({
        userId: reportedId,
        type: "NO_SHOW_WARNING",
        title: "⚠️ Son Uyarı",
        body: "İkinci kez bir etkinliğe gelmediğiniz bildirildi. Bir kez daha tekrarlanırsa hesabınız kısıtlanabilir.",
        link: "/profil",
      });
    } else {
      // 1. kez — ilk uyarı
      await createNotification({
        userId: reportedId,
        type: "NO_SHOW_WARNING",
        title: "⚠️ Gelmedi Bildirimi",
        body: "Bir etkinliğe gelmediğiniz bildirildi. Bu davranış tekrarlanırsa hesabınız kısıtlanabilir.",
        link: "/profil",
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Gelmedi bildirimi alındı",
        noShowCount,
      },
      { status: 200 }
    );
  } catch (error) {
    log.error("No-show bildirimi yapılırken hata", error);
    return NextResponse.json(
      { success: false, error: "Bildirim gönderilemedi" },
      { status: 500 }
    );
  }
}
