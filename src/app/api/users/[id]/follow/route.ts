import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, isValidId, notFound, unauthorized } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification, NOTIF } from "@/lib/notifications";

const log = createLogger("follow");

// POST /api/users/[id]/follow — takip et/bırak toggle
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();
    if (!isValidId(targetId)) return notFound("Kullanıcı bulunamadı");
    if (targetId === userId) {
      return NextResponse.json({ success: false, error: "Kendinizi takip edemezsiniz" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, name: true, isPrivateProfile: true } as any });
    if (!target) return notFound("Kullanıcı bulunamadı");

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
    });

    if (existing) {
      // Eğer PENDING ise isteği iptal et / geri çek, eğer ACCEPTED ise takibi bırak
      const wasPending = existing.status === "PENDING";
      await prisma.follow.delete({ where: { id: existing.id } });
      log.info(wasPending ? "Takip isteği geri çekildi" : "Takip bırakıldı", { userId, targetId });
      return NextResponse.json({ success: true, following: false, pending: false, message: wasPending ? "İstek geri çekildi" : "Takipten çıkıldı" });
    } else {
      // Kapalı profil: PENDING olarak oluştur, bildirim gönder
      const isPrivate = (target as any).isPrivateProfile ?? false;
      await prisma.follow.create({
        data: {
          followerId: userId,
          followingId: targetId,
          status: isPrivate ? "PENDING" : "ACCEPTED",
        },
      });
      const follower = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      if (isPrivate) {
        // Takip isteği bildirimi (FOLLOW_REQUEST)
        await createNotification(NOTIF.followRequest(targetId, follower?.name ?? "Biri", userId));
        log.info("Takip isteği gönderildi (kapalı profil)", { userId, targetId });
        return NextResponse.json({ success: true, following: false, pending: true });
      } else {
        await createNotification(NOTIF.newFollower(targetId, follower?.name ?? "Biri", userId));
        log.info("Kullanıcı takip edildi", { userId, targetId });
        return NextResponse.json({ success: true, following: true, pending: false });
      }
    }
  } catch (error) {
    log.error("Follow hatası", error);
    return NextResponse.json({ success: false, error: "İşlem başarısız" }, { status: 500 });
  }
}

// DELETE /api/users/[id]/follow — bu kullanıcıyı takipçilerimden çıkar
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: followerId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();
    if (!isValidId(followerId)) return notFound("Kullanıcı bulunamadı");

    // followerId beni takip ediyorsa, o kaydı sil
    await prisma.follow.deleteMany({
      where: { followerId, followingId: userId },
    });

    log.info("Takipçi çıkarıldı", { userId, followerId });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Remove follower hatası", error);
    return NextResponse.json({ success: false, error: "İşlem başarısız" }, { status: 500 });
  }
}

// GET /api/users/[id]/follow — takip durumu + takipçi/takip sayıları
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: targetId } = await params;
    const userId = await getCurrentUserId();

    const [followerCount, followingCount, followRecord, followsMe] = await Promise.all([
      prisma.follow.count({ where: { followingId: targetId, status: "ACCEPTED" } }),
      prisma.follow.count({ where: { followerId: targetId, status: "ACCEPTED" } }),
      userId
        ? prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: userId, followingId: targetId } },
          })
        : null,
      userId
        ? prisma.follow.findUnique({
            where: { followerId_followingId: { followerId: targetId, followingId: userId } },
          })
        : null,
    ]);

    return NextResponse.json({
      success: true,
      data: {
        followerCount,
        followingCount,
        isFollowing: followRecord?.status === "ACCEPTED",
        pending: followRecord?.status === "PENDING",
        followsMe: followsMe?.status === "ACCEPTED",
      },
    });
  } catch (error) {
    log.error("Follow GET hatası", error);
    return NextResponse.json({ success: false, error: "Bilgi alınamadı" }, { status: 500 });
  }
}
