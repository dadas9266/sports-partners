import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("ratings");

const ratingSchema = z.object({
  matchId: z.string().min(1, "Match ID gerekli"),
  score: z.number().int().min(1).max(5, "Puan 1-5 arasında olmalı"),
  comment: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ratingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { matchId, score, comment } = parsed.data;

    // Match'in var olduğunu ve kullanıcının katılımcı olduğunu doğrula
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { user1Id: true, user2Id: true },
    });

    if (!match) {
      return NextResponse.json({ success: false, error: "Eşleşme bulunamadı" }, { status: 404 });
    }

    if (match.user1Id !== userId && match.user2Id !== userId) {
      return NextResponse.json({ success: false, error: "Bu eşleşmenin katılımcısı değilsiniz" }, { status: 403 });
    }

    // Daha önce puan verilmiş mi?
    const existing = await prisma.rating.findUnique({
      where: { matchId_ratedById: { matchId, ratedById: userId } },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Bu eşleşme için zaten puan verdiniz" }, { status: 400 });
    }

    // Karşı tarafın ID'si
    const ratedUserId = match.user1Id === userId ? match.user2Id : match.user1Id;

    const rating = await prisma.rating.create({
      data: { matchId, ratedById: userId, ratedUserId, score, comment },
    });

    // Değerlendirilen kullanıcıya bildirim gönder
    await prisma.notification.create({
      data: {
        userId: ratedUserId,
        type: "NEW_RATING",
        title: "Yeni Değerlendirme",
        body: `Bir eşleşme sonrası ${score} yıldız aldınız!`,
        link: `/profil`,
      },
    });

    log.info("Yeni puan verildi", { matchId, ratedById: userId, ratedUserId, score });

    return NextResponse.json({ success: true, data: rating }, { status: 201 });
  } catch (error) {
    log.error("Puan verme hatası", error);
    return NextResponse.json({ success: false, error: "Puan verilemedi" }, { status: 500 });
  }
}

// Bir kullanıcının aldığı puanları getir
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ success: false, error: "userId gerekli" }, { status: 400 });
    }

    const ratings = await prisma.rating.findMany({
      where: { ratedUserId: userId },
      include: {
        ratedBy: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const avg =
      ratings.length > 0
        ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length
        : null;

    return NextResponse.json({
      success: true,
      data: ratings,
      avgRating: avg ? Math.round(avg * 10) / 10 : null,
    });
  } catch (error) {
    log.error("Puanlar yüklenirken hata", error);
    return NextResponse.json({ success: false, error: "Puanlar yüklenemedi" }, { status: 500 });
  }
}
