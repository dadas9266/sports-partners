import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";
import { containsProfanity } from "@/lib/content-filter";
import { z } from "zod";

const log = createLogger("api:posts:comments");

const commentSchema = z.object({
  content: z.string().min(1).max(500),
  parentId: z.string().optional(),
});

// GET /api/posts/[postId]/comments
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;
  const currentUserId = await getCurrentUserId();

  try {
    // Tüm yorumları tek sorguda çek (flat), sonra ağaç yapısına dönüştür
    const allComments = await prisma.postComment.findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { likes: true, replies: true } },
        likes: {
          where: { userId: currentUserId || "" },
          select: { id: true },
        },
      },
    });

    // Flat → Tree dönüşümü (sınırsız derinlik)
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const c of allComments) {
      map.set(c.id, {
        ...c,
        likedByMe: c.likes.length > 0,
        likes: [],
        replies: [],
      });
    }

    for (const c of allComments) {
      const node = map.get(c.id);
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId).replies.push(node);
      } else {
        roots.push(node);
      }
    }

    return NextResponse.json({ success: true, comments: roots });
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

    if (containsProfanity(parsed.data.content)) {
      return NextResponse.json({ error: "Yorumunuz uygunsuz ifadeler içeriyor." }, { status: 400 });
    }

      const comment = await prisma.postComment.create({
        data: { 
          postId, 
          userId, 
          content: parsed.data.content,
          parentId: parsed.data.parentId || null 
        },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { likes: true, replies: true } },
        },
      });

      // BİLDİRİM GÖNDER
      // Eğer bir yoruma yanıt ise yorum sahibine, değilse post sahibine bildirim gitsin
      if (parsed.data.parentId) {
         const parentComment = await prisma.postComment.findUnique({
            where: { id: parsed.data.parentId },
            select: { userId: true }
         });
         
         if (parentComment && parentComment.userId !== userId) {
            const commenter = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
            await createNotification({
              userId: parentComment.userId,
              type: "NEW_POST_COMMENT",
              title: "Yorumuna yanıt geldi",
              body: `${commenter?.name ?? "Birisi"} yorumuna yanıt verdi: "${parsed.data.content.substring(0, 30)}..."`,
              link: `/posts/${postId}?commentId=${comment.id}`,
            });
         }
      } else {
          const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { userId: true, content: true },
          });

          if (post && post.userId !== userId) {
            const commenter = await prisma.user.findUnique({
              where: { id: userId },
              select: { name: true },
            });

            await createNotification({
              userId: post.userId,
              type: "NEW_POST_COMMENT",
              title: "Yeni Yorum",
              body: `${commenter?.name ?? "Birisi"} gönderine yorum yaptı: "${parsed.data.content.substring(0, 30)}..."`,
              link: `/posts/${postId}?commentId=${comment.id}`,
            });
          }
      }

      return NextResponse.json({ 
        comment: {
          ...comment,
          likedByMe: false,
          replies: []
        }
      }, { status: 201 });
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
