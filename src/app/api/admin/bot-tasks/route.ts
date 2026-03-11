import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";

async function requireAdmin(userId: string | null) {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  return user?.isAdmin === true;
}

// GET /api/admin/bot-tasks — Görev listesi
export async function GET(req: Request) {
  const userId = await getCurrentUserId();
  if (!(await requireAdmin(userId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const tasks = await prisma.botTask.findMany({
    where: status ? { status: status as never } : undefined,
    include: {
      listingBot: { select: { id: true, name: true, avatarUrl: true } },
      responderBot: { select: { id: true, name: true, avatarUrl: true } },
      city: { select: { name: true } },
      sport: { select: { name: true, icon: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ success: true, data: tasks });
}

// POST /api/admin/bot-tasks — Yeni görev(ler) oluştur + çalıştır
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!(await requireAdmin(userId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await req.json();
  const {
    listingBotId,
    responderBotId,
    cityId,           // tek şehir veya null (toplu mod için)
    countryId,
    sportId,
    delaySeconds = 30,
    bulk = false,     // true ise countryId içindeki tüm şehirlere görev yarat
    listingDateTime,  // Admin'in belirlediği ilan tarihi/saati (ISO string)
  } = body;

  if (!listingBotId || !responderBotId) {
    return NextResponse.json({ error: "listingBotId ve responderBotId zorunlu" }, { status: 400 });
  }

  let cityIds: string[] = [];

  if (bulk && countryId) {
    // Toplu mod: o ülkedeki tüm şehirler
    const cities = await prisma.city.findMany({
      where: { countryId },
      select: { id: true },
    });
    cityIds = cities.map(c => c.id);
  } else if (cityId) {
    cityIds = [cityId];
  } else {
    return NextResponse.json({ error: "cityId veya (bulk=true + countryId) gerekli" }, { status: 400 });
  }

  // Görevleri oluştur
  const tasks = await prisma.$transaction(
    cityIds.map(cid =>
      prisma.botTask.create({
        data: {
          listingBotId,
          responderBotId,
          cityId: cid,
          countryId: countryId ?? null,
          sportId: sportId ?? null,
          delaySeconds,
          listingDateTime: listingDateTime ? new Date(listingDateTime) : null,
          status: "PENDING",
        },
      })
    )
  );

  // Görevleri arka planda çalıştır (non-blocking)
  executeTasks(tasks.map(t => t.id)).catch(console.error);

  return NextResponse.json({
    success: true,
    message: `${tasks.length} görev oluşturuldu ve çalışmaya başladı`,
    taskIds: tasks.map(t => t.id),
  }, { status: 201 });
}

// DELETE /api/admin/bot-tasks — Görev(leri) sil
export async function DELETE(req: Request) {
  const userId = await getCurrentUserId();
  if (!(await requireAdmin(userId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const all = searchParams.get("all") === "true";

  if (all) {
    await prisma.botTask.deleteMany({});
    return NextResponse.json({ success: true, message: "Tüm görev geçmişi silindi" });
  }

  if (!id) {
    return NextResponse.json({ error: "ID veya all=true parametresi gerekli" }, { status: 400 });
  }

  await prisma.botTask.delete({ where: { id } });
  return NextResponse.json({ success: true, message: "Görev silindi" });
}

// Görev yürütücü — her task için ilan aç, başvur, eşleş
async function executeTasks(taskIds: string[]) {
  for (const taskId of taskIds) {
    const task = await prisma.botTask.findUnique({
      where: { id: taskId },
      include: {
        listingBot: { include: { sports: true, city: { include: { country: true } } } },
        responderBot: true,
        city: true,
        sport: true,
      },
    });
    if (!task) continue;

    try {
      // 1. İlan oluştur
      const sportId = task.sportId ?? task.listingBot.sports[0]?.id;
      if (!sportId) throw new Error("Bot'un sporu yok");

      const listing = await prisma.listing.create({
        data: {
          userId: task.listingBotId,
          sportId,
          cityId: task.cityId ?? task.listingBot.cityId,
          type: "RIVAL",
          level: (task.listingBot.userLevel as "BEGINNER" | "INTERMEDIATE" | "ADVANCED") ?? "BEGINNER",
          status: "OPEN",
          description: generateListingDesc(task.listingBot.name ?? "Sporcu", task.sport?.name ?? "spor"),
          // Admin'in belirlediği tarih/saat; yoksa 1 gün sonraya otomatik
          dateTime: task.listingDateTime ?? getFutureDate(1),
          maxParticipants: 2,
        },
      });

      await prisma.botTask.update({
        where: { id: taskId },
        data: { status: "LISTING_CREATED", listingId: listing.id },
      });

      // 2. Gecikme
      await sleep(Math.min(task.delaySeconds, 60) * 1000);

      // 3. Başvuru yap
      const response = await prisma.response.create({
        data: {
          listingId: listing.id,
          userId: task.responderBotId,
          message: generateResponseMsg(task.responderBot.name ?? "Sporcu"),
        },
      });

      await prisma.botTask.update({
        where: { id: taskId },
        data: { status: "RESPONSE_SENT", responseId: response.id },
      });

      // 4. Eşleşmeyi kabul et (ilan sahibi bot kabul ediyor)
      const match = await prisma.match.create({
        data: {
          listingId: listing.id,
          responseId: response.id,
          user1Id: task.listingBotId,
          user2Id: task.responderBotId,
          status: "SCHEDULED",
          scheduledAt: getFutureDate(1),
        },
      });

      // İlanı MATCHED yap
      await prisma.listing.update({ where: { id: listing.id }, data: { status: "MATCHED" } });
      await prisma.response.update({ where: { id: response.id }, data: { status: "ACCEPTED" } });

      await prisma.botTask.update({
        where: { id: taskId },
        data: {
          status: "MATCH_DONE",
          matchId: match.id,
          executedAt: new Date(),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.botTask.update({
        where: { id: taskId },
        data: { status: "FAILED", errorMessage: message, executedAt: new Date() },
      });
    }
  }
}

function generateListingDesc(name: string, sport: string): string {
  const templates = [
    `${sport} oynamak istiyorum, birlikte oynayacak biri arıyorum.`,
    `${sport} partneri arıyorum. Deneyimli olmak zorunda değil.`,
    `Hafta sonu ${sport} maçı için takım arkadaşı aranıyor.`,
    `${name} olarak ${sport} için eşleşme arıyorum.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateResponseMsg(name: string): string {
  const templates = [
    "Merhaba! İlgimi çekti, katılmak istiyorum.",
    "Selam, benimle oynamak ister misin?",
    "Müsaitim, buluşalım!",
    `${name} olarak başvuruyorum, uygun görürsen harika olur.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function getFutureDate(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0);
  return d;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
