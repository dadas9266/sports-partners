import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";
import { z } from "zod";

const log = createLogger("api:posts:comments");

const commentSchema = z.object({
  content: z.string().min(1).max(500),
});

// GET /api/posts/[postId]/comments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;

  try {
    const comments = await prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
    return NextResponse.json(comments);
  } catch (err) {
    log.error("Yorumları getirme hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/posts/[postId]/comments
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
    const body = await req.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const comment = await prisma.postComment.create({
      data: { postId, userId, content: parsed.data.content },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Bildirim gönder
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });
    if (post && post.userId !== userId) {
      const commenter = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      await createNotification({
        userId: post.userId,
        type: "NEW_POST_COMMENT",
        title: "Gönderinize yorum yapıldı",
        body: `${commenter?.name ?? "Birisi"}: ${parsed.data.content.substring(0, 50)}`,
        link: `/profil/${post.userId}`,
      });
    }

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    log.error("Yorum oluşturma hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/posts/[postId]/comments?commentId=
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;
  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get("commentId");

  if (!commentId) {
    return NextResponse.json({ error: "commentId zorunlu" }, { status: 400 });
  }

  try {
    const comment = await prisma.postComment.findFirst({
      where: { id: commentId, postId, userId },
    });
    if (!comment) {
      return NextResponse.json({ error: "Yorum bulunamadı veya yetki yok" }, { status: 404 });
    }
    await prisma.postComment.delete({ where: { id: commentId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Yorum silme hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
