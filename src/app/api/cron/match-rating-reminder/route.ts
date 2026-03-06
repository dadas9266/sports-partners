import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron-match-rating");

/**
 * GET /api/cron/match-rating-reminder
 *
 * Vercel Cron tarafından her 30 dakikada çalıştırılır.
 * 1. Tarihi 1 saat geçmiş, bekleyen (SCHEDULED/ONGOING) maçlar için "Maçı Onayla" bildirimi gönderir.
 * 2. Tamamlanan (COMPLETED) ama henüz her iki taraf tarafından puanlanmamış maçlar için "Puan Ver" bildirimi gönderir.
 */
export async function GET(request: Request) {
  try {
    // Güvenlik: fail-closed — CRON_SECRET zorunlu
    const authHeader = request.headers.get("Authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const sentRemindersThreshold = new Date(now.getTime() - 23 * 60 * 60 * 1000); // 23 saat — tekrar bildirim gönderme

    let confirmSent = 0;
    let rateSent = 0;

    // ─── 1. "Maçı Onayla" hatırlatıcısı ──────────────────────────────────────
    // Tarihi 1 saat geçmiş, hâlâ SCHEDULED veya ONGOING olan maçlar
    const pendingMatches = await prisma.match.findMany({
      where: {
        status: { in: ["SCHEDULED", "ONGOING"] },
        scheduledAt: { lt: oneHourAgo },
      },
      select: {
        id: true,
        user1Id: true,
        user2Id: true,
        u1Approved: true,
        u2Approved: true,
        u1Reported: true,
        u2Reported: true,
        scheduledAt: true,
        listing: {
          select: {
            sport: { select: { name: true, icon: true } },
          },
        },
      },
    });

    for (const match of pendingMatches) {
      const sportName = match.listing?.sport?.name ?? "Spor";
      const sportIcon = match.listing?.sport?.icon ?? "⚽";

      // Her katılımcı için — henüz onaylamamış veya raporlamamış olanları bilgilendir
      for (const uid of [match.user1Id, match.user2Id]) {
        const isU1 = uid === match.user1Id;
        const myApproved = isU1 ? match.u1Approved : match.u2Approved;
        const myReported = isU1 ? match.u1Reported : match.u2Reported;

        // Bu kişi zaten onayladıysa veya raporladıysa atla
        if (myApproved || myReported) continue;

        // Son 23 saatte aynı maç için zaten bildirim gönderildiyse atla
        const recentNotif = await prisma.notification.findFirst({
          where: {
            userId: uid,
            link: `/eslesmeler/${match.id}`,
            type: "MATCH_STATUS_CHANGED",
            createdAt: { gte: sentRemindersThreshold },
          },
        });
        if (recentNotif) continue;

        await createNotification({
          userId: uid,
          type: "MATCH_STATUS_CHANGED",
          title: `${sportIcon} Maçını Onayladın mı?`,
          body: `${sportName} maçının tarihi geçti. Maç gerçekleştiyse onaylayabilir, aksi halde bildirebilirsiniz.`,
          link: `/eslesmeler/${match.id}`,
        });
        confirmSent++;
      }
    }

    // ─── 2. "Puan Ver" hatırlatıcısı ─────────────────────────────────────────
    // Tamamlanan maçlar, son 48 saat içinde tamamlanmış
    const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const completedMatches = await prisma.match.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { gte: cutoff48h, lt: now },
      },
      select: {
        id: true,
        user1Id: true,
        user2Id: true,
        completedAt: true,
        ratings: { select: { ratedById: true } },
        listing: {
          select: {
            sport: { select: { name: true, icon: true } },
          },
        },
      },
    });

    for (const match of completedMatches) {
      const ratedUserIds = new Set(match.ratings.map((r) => r.ratedById));
      const sportName = match.listing?.sport?.name ?? "Spor";
      const sportIcon = match.listing?.sport?.icon ?? "⚽";

      for (const uid of [match.user1Id, match.user2Id]) {
        // Bu kişi zaten puan verdiyse atla
        if (ratedUserIds.has(uid)) continue;

        // Son 23 saatte zaten puan bildirimi gönderildiyse atla
        const recentNotif = await prisma.notification.findFirst({
          where: {
            userId: uid,
            link: `/eslesmeler/${match.id}`,
            type: "NEW_RATING",
            createdAt: { gte: sentRemindersThreshold },
          },
        });
        if (recentNotif) continue;

        await createNotification({
          userId: uid,
          type: "NEW_RATING",
          title: `${sportIcon} Maçını Değerlendir!`,
          body: `${sportName} maçın tamamlandı. Rakibine puan vermeyi unutma! 🌟`,
          link: `/eslesmeler/${match.id}`,
        });
        rateSent++;
      }
    }

    log.info("Match rating reminder cron tamamlandı", { confirmSent, rateSent });
    return NextResponse.json({ success: true, confirmSent, rateSent });
  } catch (err) {
    log.error("Match rating reminder cron hatası", err);
    return NextResponse.json({ error: "Cron hatası" }, { status: 500 });
  }
}
