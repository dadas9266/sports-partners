import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, isValidId, notFound, unauthorized } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification, NOTIF } from "@/lib/notifications";

const log = createLogger("follow-requests");

// GET /api/follow-requests — bekleyen takip isteklerini listele
export async function GET(_req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    const requests = await prisma.follow.findMany({
      where: { followingId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            bio: true,
            city: { select: { name: true } },
            sports: { select: { id: true, name: true, icon: true } },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: requests.map((r) => ({
        followId: r.id,
        createdAt: r.createdAt,
        user: r.follower,
      })),
    });
  } catch (error) {
    log.error("Follow requests GET hatası", error);
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/follow-requests — isteği kabul et veya reddet
// Body: { followId: string, action: "ACCEPT" | "REJECT" }
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    const body = await req.json();
    const { followId, action } = body as { followId: string; action: "ACCEPT" | "REJECT" };

    if (!followId || !["ACCEPT", "REJECT"].includes(action)) {
      return NextResponse.json({ success: false, error: "Geçersiz istek" }, { status: 400 });
    }

    // Yalnızca kendi gelen isteğini onaylayabilir
    const follow = await prisma.follow.findUnique({
      where: { id: followId },
      include: { follower: { select: { name: true, id: true } } },
    });

    if (!follow || follow.followingId !== userId) {
      return notFound("Takip isteği bulunamadı");
    }

    if (follow.status !== "PENDING") {
      return NextResponse.json({ success: false, error: "Bu istek zaten işlendi" }, { status: 400 });
    }

    if (action === "ACCEPT") {
      await prisma.follow.update({
        where: { id: followId },
        data: { status: "ACCEPTED" },
      });
      // Kabul bildirimini isteği gönderene at
      const acceptor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      await createNotification(
        NOTIF.followAccepted(follow.followerId, acceptor?.name ?? "Biri", userId)
      );
      log.info("Takip isteği kabul edildi", { userId, followerId: follow.followerId });
      return NextResponse.json({ success: true, action: "ACCEPTED" });
    } else {
      // Reddet: kaydı sil
      await prisma.follow.delete({ where: { id: followId } });
      log.info("Takip isteği reddedildi", { userId, followerId: follow.followerId });
      return NextResponse.json({ success: true, action: "REJECTED" });
    }
  } catch (error) {
    log.error("Follow requests POST hatası", error);
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
