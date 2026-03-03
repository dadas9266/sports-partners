import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const log = createLogger("challenges");

const challengeSchema = z.object({
  targetId: z.string().min(1, "Hedef kullanıcı gerekli"),
  sportId: z.string().min(1, "Spor dalı gerekli"),
  challengeType: z.enum(["RIVAL", "PARTNER"]).default("RIVAL"),
  message: z.string().max(300).optional(),
  proposedDateTime: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
});

// GET /api/challenges — Gelen ve gönderilen teklifleri listele
export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const direction = searchParams.get("direction") ?? "received"; // "received" | "sent"

    const challenges = await prisma.directChallenge.findMany({
      where: {
        ...(direction === "received" ? { targetId: userId } : { challengerId: userId }),
        status: "PENDING",
        expiresAt: { gt: new Date() }, // Süresi dolmamışlar
      },
      include: {
        challenger: { select: { id: true, name: true, avatarUrl: true, userLevel: true } },
        target: { select: { id: true, name: true, avatarUrl: true, userLevel: true } },
        sport: { select: { id: true, name: true, icon: true } },
        district: { select: { id: true, name: true, city: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: challenges });
  } catch (error) {
    log.error("Talepler yüklenirken hata", error);
    return NextResponse.json({ success: false, error: "Talepler yüklenemedi" }, { status: 500 });
  }
}

// POST /api/challenges — Yeni maç/partner teklifi gönder
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = challengeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { targetId, sportId, challengeType, message, proposedDateTime, districtId } = parsed.data;

    if (targetId === userId) {
      return NextResponse.json({ success: false, error: "Kendinize teklif gönderemezsiniz" }, { status: 400 });
    }

    // Hedef kullanıcı var mı?
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, name: true, isBanned: true, whoCanChallenge: true },
    });
    if (!target) {
      return NextResponse.json({ success: false, error: "Kullanıcı bulunamadı" }, { status: 404 });
    }
    if (target.isBanned) {
      return NextResponse.json({ success: false, error: "Bu kullanıcıya teklif gönderemezsiniz" }, { status: 403 });
    }

    // Gizlilik kontrolü: bu kullanıcıya teklif gönderebilir miyiz?
    if (target.whoCanChallenge === "NOBODY") {
      return NextResponse.json({ success: false, error: "Bu kullanıcı teklif kabul etmiyor" }, { status: 403 });
    }
    if (target.whoCanChallenge === "FOLLOWERS") {
      const isFollowing = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: userId, followingId: targetId } },
      });
      if (!isFollowing) {
        return NextResponse.json({ success: false, error: "Bu kullanıcı yalnızca takipçilerinden teklif kabul ediyor" }, { status: 403 });
      }
    }

    // Aynı spor dalı için zaten bekleyen bir teklif var mı?
    const existingPending = await prisma.directChallenge.findFirst({
      where: {
        challengerId: userId,
        targetId,
        sportId,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });
    if (existingPending) {
      return NextResponse.json(
        { success: false, error: "Bu kullanıcıya aynı spor dalı için zaten bekleyen bir teklifiniz var" },
        { status: 409 }
      );
    }

    const challenger = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    const sport = await prisma.sport.findUnique({
      where: { id: sportId },
      select: { name: true, icon: true },
    });

    // 48 saat geçerli
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const challenge = await prisma.directChallenge.create({
      data: {
        challengerId: userId,
        targetId,
        sportId,
        challengeType,
        message: message || null,
        proposedDateTime: proposedDateTime ? new Date(proposedDateTime) : null,
        districtId: districtId || null,
        expiresAt,
      },
      include: {
        sport: { select: { id: true, name: true, icon: true } },
        district: { select: { id: true, name: true } },
      },
    });

    // Hedef kullanıcıya bildirim gönder
    await createNotification({
      userId: targetId,
      type: "DIRECT_CHALLENGE",
      title: `${challengeType === "RIVAL" ? "⚔️ Rakip" : "🤝 Partner"} Teklifi!`,
      body: `${challenger?.name} sana ${sport?.icon ?? ""} ${sport?.name} için ${challengeType === "RIVAL" ? "rakip" : "partner"} teklifi gönderdi.`,
      link: `/teklifler`,
    });

    log.info("Teklif gönderildi", { challengeId: challenge.id, from: userId, to: targetId, sport: sportId });
    return NextResponse.json({ success: true, data: challenge }, { status: 201 });
  } catch (error) {
    log.error("Teklif gönderme hatası", error);
    return NextResponse.json({ success: false, error: "Teklif gönderilemedi" }, { status: 500 });
  }
}
