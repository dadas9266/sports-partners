import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron:bot-tasks");

/**
 * GET /api/cron/bot-tasks
 *
 * Vercel Cron Job — her gün 08:00 ve 16:00 UTC çalışır.
 * PENDING durumundaki BotTask'ları otomatik yürütür:
 * 1. İlan oluştur (listing bot adına)
 * 2. Yanıt gönder (responder bot adına)
 * 3. Eşleştir (Match kaydı oluştur)
 */
export async function GET() {
  try {
    const pendingTasks = await prisma.botTask.findMany({
      where: {
        status: "PENDING",
        scheduledAt: { lte: new Date() },
      },
      include: {
        listingBot: { include: { sports: true } },
        responderBot: true,
        sport: true,
      },
      take: 20, // Vercel timeout güvenliği: her seferde max 20
    });

    if (pendingTasks.length === 0) {
      return NextResponse.json({ success: true, message: "Bekleyen görev yok", executed: 0 });
    }

    let successCount = 0;
    let failCount = 0;

    for (const task of pendingTasks) {
      try {
        const sportId = task.sportId ?? task.listingBot.sports[0]?.id;
        if (!sportId) throw new Error("Bot'un sporu yok");

        // 1. İlan oluştur
        const listing = await prisma.listing.create({
          data: {
            userId: task.listingBotId,
            sportId,
            cityId: task.cityId ?? task.listingBot.cityId,
            type: "RIVAL",
            level: (task.listingBot.userLevel as "BEGINNER" | "INTERMEDIATE" | "ADVANCED") ?? "BEGINNER",
            status: "OPEN",
            description: `Spor yapmak istiyorum, birlikte antrenman yapacak birini arıyorum.`,
            dateTime: task.listingDateTime ?? new Date(Date.now() + 86400000),
            maxParticipants: 2,
          },
        });

        await prisma.botTask.update({
          where: { id: task.id },
          data: { status: "LISTING_CREATED", listingId: listing.id },
        });

        // 2. Yanıt oluştur
        const response = await prisma.response.create({
          data: {
            listingId: listing.id,
            userId: task.responderBotId,
            message: "Merhaba, katılmak isterim!",
          },
        });

        await prisma.botTask.update({
          where: { id: task.id },
          data: { status: "RESPONSE_SENT", responseId: response.id },
        });

        // 3. Eşleştir
        const match = await prisma.match.create({
          data: {
            listingId: listing.id,
            responseId: response.id,
            user1Id: task.listingBotId,
            user2Id: task.responderBotId,
            status: "SCHEDULED",
            scheduledAt: task.listingDateTime ?? new Date(Date.now() + 86400000),
          },
        });

        await prisma.listing.update({ where: { id: listing.id }, data: { status: "MATCHED" } });
        await prisma.response.update({ where: { id: response.id }, data: { status: "ACCEPTED" } });

        await prisma.botTask.update({
          where: { id: task.id },
          data: { status: "MATCH_DONE", matchId: match.id, executedAt: new Date() },
        });

        successCount++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await prisma.botTask.update({
          where: { id: task.id },
          data: { status: "FAILED", errorMessage: message, executedAt: new Date() },
        });
        failCount++;
      }
    }

    log.info(`Bot görevleri: ${successCount} başarılı, ${failCount} başarısız`);
    return NextResponse.json({
      success: true,
      message: `${successCount} başarılı, ${failCount} başarısız`,
      executed: successCount + failCount,
    });
  } catch (error) {
    log.error("Bot görev cron hatası", error);
    return NextResponse.json({ success: false, error: "Cron hatası" }, { status: 500 });
  }
}
