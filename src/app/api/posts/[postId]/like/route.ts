import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

const log = createLogger("api:posts:like");

// POST /api/posts/[postId]/like  → beğen / beğeniyi geri al (toggle)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;

  try {
    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existing) {
      // Beğeniyi geri al
      await prisma.postLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false });
    } else {
      // Beğen
      await prisma.postLike.create({ data: { postId, userId } });

      // Bildirim gönder (kendi gönderine beğeni atarsa bildirim gitmesin)
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { userId: true },
      });
      if (post && post.userId !== userId) {
        const liker = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        await createNotification({
          userId: post.userId,
          type: "NEW_POST_LIKE",
          title: "Gönderiniz beğenildi",
          body: `${liker?.name ?? "Birisi"} gönderinizi beğendi`,
          link: `/profil/${post.userId}`,
        });
      }

      return NextResponse.json({ liked: true });
    }
  } catch (err) {
    log.error("Like toggle hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
