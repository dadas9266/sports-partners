import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("api:posts");

const createPostSchema = z.object({
  content: z.string().max(1000).optional(),
  images: z.array(z.string().url()).max(5).default([]),
});

// GET /api/posts?userId=&cursor=&limit=
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10"), 20);

  try {
    // userId belirtilmişse o kullanıcının gönderileri, yoksa feed (takip edilenlerin)
    let userIdFilter: string | { in: string[] } | undefined;

    if (targetUserId) {
      userIdFilter = targetUserId;
    } else {
      // Feed: kendi gönderileri + takip edilenlerin gönderileri
      const following = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true },
      });
      const followingIds = [userId, ...following.map((f) => f.followingId)];
      userIdFilter = { in: followingIds };
    }

    const cursorFilter = cursor ? { id: { lt: cursor } } : {};

    const posts = await prisma.post.findMany({
      where: { userId: userIdFilter, ...cursorFilter },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: { select: { likes: true, comments: true } },
        likes: {
          where: { userId },
          select: { id: true },
          take: 1,
        },
      },
    });

    const postsWithLiked = posts.map((p) => ({
      ...p,
      liked: p.likes.length > 0,
      likes: undefined,
    }));

    return NextResponse.json({
      posts: postsWithLiked,
      nextCursor: posts.length === limit ? posts[posts.length - 1].id : null,
    });
  } catch (err) {
    log.error("Posts getirme hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/posts
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { content, images } = parsed.data;
    if (!content && images.length === 0) {
      return NextResponse.json({ error: "İçerik veya görsel zorunlu" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: { userId, content, images },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    log.error("Post oluşturma hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
