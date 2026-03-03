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

    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, name: true } });
    if (!target) return notFound("Kullanıcı bulunamadı");

    const existing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId: userId, followingId: targetId } },
    });

    if (existing) {
      await prisma.follow.delete({ where: { id: existing.id } });
      log.info("Takip bırakıldı", { userId, targetId });
      return NextResponse.json({ success: true, following: false });
    } else {
      await prisma.follow.create({ data: { followerId: userId, followingId: targetId } });
      // Takip bildirimini gönder
      const follower = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      await createNotification(NOTIF.newFollower(targetId, follower?.name ?? "Biri", userId));
      log.info("Kullanıcı takip edildi", { userId, targetId });
      return NextResponse.json({ success: true, following: true });
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

    const [followerCount, followingCount, isFollowing, followsMe] = await Promise.all([
      prisma.follow.count({ where: { followingId: targetId } }),
      prisma.follow.count({ where: { followerId: targetId } }),
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
        isFollowing: !!isFollowing,
        followsMe: !!followsMe,
      },
    });
  } catch (error) {
    log.error("Follow GET hatası", error);
    return NextResponse.json({ success: false, error: "Bilgi alınamadı" }, { status: 500 });
  }
}
