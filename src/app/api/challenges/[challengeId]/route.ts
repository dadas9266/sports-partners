import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const log = createLogger("challenge-respond");

const respondSchema = z.object({
  action: z.enum(["ACCEPTED", "REJECTED"]),
});

// PATCH /api/challenges/[challengeId] — Teklifi kabul et veya reddet
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { challengeId } = await params;

    const body = await request.json();
    const parsed = respondSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const challenge = await prisma.directChallenge.findUnique({
      where: { id: challengeId },
      include: {
        challenger: { select: { id: true, name: true, cityId: true, districtId: true } },
        sport: { select: { id: true, name: true, icon: true } },
      },
    });

    if (!challenge) {
      return NextResponse.json({ success: false, error: "Teklif bulunamadı" }, { status: 404 });
    }

    if (challenge.targetId !== userId) {
      return NextResponse.json({ success: false, error: "Bu teklif size ait değil" }, { status: 403 });
    }

    if (challenge.status !== "PENDING") {
      return NextResponse.json(
        { success: false, error: "Bu teklif zaten yanıtlanmış veya süresi dolmuş" },
        { status: 400 }
      );
    }

    if (challenge.expiresAt < new Date()) {
      await prisma.directChallenge.update({ where: { id: challengeId }, data: { status: "EXPIRED" } });
      return NextResponse.json({ success: false, error: "Bu teklifin süresi dolmuş" }, { status: 400 });
    }

    const { action } = parsed.data;

    // Teklifi güncelle
    await prisma.directChallenge.update({
      where: { id: challengeId },
      data: { status: action },
    });

    if (action === "ACCEPTED") {
      // Teklif kabul edilince otomatik ilan + eşleşme oluştur
      const districtId = challenge.districtId ?? challenge.challenger.districtId;
      if (!districtId) {
        // District yoksa sadece teklifi kabul et, ilanı manuel oluştursun
        await createNotification({
          userId: challenge.challengerId,
          type: "DIRECT_CHALLENGE",
          title: "✅ Teklif Kabul Edildi!",
          body: `${(await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name} teklifinizi kabul etti! Şimdi bir ilan oluşturarak eşleşin.`,
          link: "/ilan/olustur",
        });
        return NextResponse.json({ success: true, action, matchCreated: false });
      }

      // İlan + Response + Match zinciri oluştur
      const proposedDate = challenge.proposedDateTime ?? new Date(Date.now() + 24 * 60 * 60 * 1000);

      const listing = await prisma.listing.create({
        data: {
          type: challenge.challengeType as "RIVAL" | "PARTNER",
          sportId: challenge.sportId,
          districtId,
          userId: challenge.challengerId,
          dateTime: proposedDate,
          level: "BEGINNER",
          description: challenge.message ?? `${challenge.challengeType === "RIVAL" ? "Rakip" : "Partner"} teklifi üzerinden oluşturuldu`,
          status: "MATCHED",
        },
      });

      const response = await prisma.response.create({
        data: {
          listingId: listing.id,
          userId,
          message: "Teklif kabul edildi ✅",
          status: "ACCEPTED",
        },
      });

      const match = await prisma.match.create({
        data: {
          listingId: listing.id,
          responseId: response.id,
          user1Id: challenge.challengerId,
          user2Id: userId,
          scheduledAt: proposedDate,
        },
      });

      // Teklif sahibine bildirim
      const accepterName = (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name;
      await createNotification({
        userId: challenge.challengerId,
        type: "NEW_MATCH",
        title: "🎮 Eşleşme Sağlandı!",
        body: `${accepterName} ${challenge.sport.icon ?? ""} ${challenge.sport.name} teklifinizi kabul etti! Mesajlaşmaya başlayabilirsiniz.`,
        link: `/mesajlar/${match.id}`,
      });

      log.info("Teklif kabul edildi, eşleşme oluşturuldu", { challengeId, matchId: match.id });
      return NextResponse.json({ success: true, action, matchCreated: true, matchId: match.id });
    }

    // Reddedildi
    const rejecterName = (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name;
    await createNotification({
      userId: challenge.challengerId,
      type: "DIRECT_CHALLENGE",
      title: "❌ Teklif Reddedildi",
      body: `${rejecterName} ${challenge.sport.name} teklifinizi reddetti.`,
      link: `/profil/${userId}`,
    });

    log.info("Teklif reddedildi", { challengeId, by: userId });
    return NextResponse.json({ success: true, action });
  } catch (error) {
    log.error("Teklif yanıtlama hatası", error);
    return NextResponse.json({ success: false, error: "İşlem başarısız" }, { status: 500 });
  }
}
