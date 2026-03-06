import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: commentId } = await params;

  try {
    const existing = await (prisma as any).commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId,
        },
      },
    });

    if (existing) {
      await (prisma as any).commentLike.delete({
        where: { id: existing.id },
      });
      const count = await (prisma as any).commentLike.count({ where: { commentId } });
      return NextResponse.json({ liked: false, likeCount: count });
    } else {
      await (prisma as any).commentLike.create({
        data: {
          commentId,
          userId,
        },
      });
      const count = await (prisma as any).commentLike.count({ where: { commentId } });

      // Yorum sahibine bildirim gönder
      const comment = await (prisma as any).postComment.findUnique({
        where: { id: commentId },
        select: { userId: true, postId: true },
      });
      if (comment && comment.userId !== userId) {
        const liker = await prisma.user.findUnique({
          where: { id: userId },
          select: { name: true },
        });
        const { createNotification } = await import("@/lib/notifications");
        await createNotification({
          userId: comment.userId,
          type: "NEW_POST_LIKE",
          title: "Yorumun Beğenildi",
          body: `${liker?.name ?? "Birisi"} yorumunu beğendi ❤️`,
          link: `/posts/${comment.postId}?commentId=${commentId}`,
        });
      }

      return NextResponse.json({ liked: true, likeCount: count });
    }
  } catch (error) {
    console.error("Comment like error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
