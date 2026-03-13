import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, sanitizeText } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { containsProfanity } from "@/lib/content-filter";
import { z } from "zod";

const log = createLogger("api:posts");

const createPostSchema = z.object({
  content: z.string().max(1000).optional(),
  images: z.array(z.string().url()).max(5).default([]),
  groupId: z.string().optional(),
  clubId: z.string().optional(),
});

// GET /api/posts?userId=&cursor=&limit=
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");
  const groupId = searchParams.get("groupId");
  const clubId = searchParams.get("clubId");
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10) || 10, 20);

  try {
    const cursorFilter = cursor ? { id: { lt: cursor } } : {};

    let whereFilter: Record<string, unknown> = cursorFilter;

    if (groupId) {
      // Grup gönderileri
      whereFilter = { groupId, ...cursorFilter };
    } else if (clubId) {
      // Kulüp gönderileri
      whereFilter = { clubId, ...cursorFilter };
    } else if (targetUserId) {
      // Belirli kullanıcının gönderileri (grup/kulüp/topluluk postlarını hariç tut)
      whereFilter = { userId: targetUserId, groupId: null, clubId: null, communityId: null, ...cursorFilter };
    } else {
      // Feed: herkese açık tüm gönderiler (grup/kulüp/topluluk postlarını hariç tut)
      whereFilter = { groupId: null, clubId: null, communityId: null, ...cursorFilter };
    }

    const posts = await prisma.post.findMany({
      where: whereFilter as any,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: { select: { likes: true, comments: true } },
        likes: {
          where: { userId },
          select: { id: true, reaction: true },
          take: 1,
        },
      },
    });

    // Her post için reaction dağılımını hesapla
    const postIds = posts.map((p: (typeof posts)[number]) => p.id);
    const reactionCounts = postIds.length > 0
      ? await prisma.postLike.groupBy({
          by: ["postId", "reaction"],
          where: { postId: { in: postIds } },
          _count: { id: true },
        })
      : [];

    const reactionMap: Record<string, Record<string, number>> = {};
    for (const rc of reactionCounts) {
      if (!reactionMap[rc.postId]) reactionMap[rc.postId] = {};
      reactionMap[rc.postId][rc.reaction] = rc._count.id;
    }

    const postsWithLiked = posts.map((p: (typeof posts)[number]) => ({
      ...p,
      liked: p.likes.length > 0,
      userReaction: p.likes.length > 0 ? (p.likes[0] as any).reaction ?? "like" : null,
      reactions: reactionMap[p.id] ?? {},
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

  const rl = await checkRateLimit(userId, "post");
  if (!rl.allowed) return rateLimitResponse(rl.remaining);

  try {
    const body = await req.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const rawContent = parsed.data.content;
    const content = rawContent ? sanitizeText(rawContent) : undefined;
    const { images, groupId, clubId } = parsed.data;
    if (!content && images.length === 0) {
      return NextResponse.json({ error: "İçerik veya görsel zorunlu" }, { status: 400 });
    }

    if (content && containsProfanity(content)) {
      return NextResponse.json({ error: "İçeriğiniz uygunsuz ifadeler içeriyor. Lütfen düzenleyin." }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        userId, content, images,
        ...(groupId ? { groupId } : {}),
        ...(clubId ? { clubId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    // Group/club post notifications (non-blocking)
    try {
      if (groupId) {
        const [group, members] = await Promise.all([
          prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
          prisma.groupMembership.findMany({
            where: { groupId, status: "APPROVED", userId: { not: userId } },
            select: { userId: true },
          }),
        ]);

        if (members.length > 0) {
          const actor = post.user.name || "Bir kullanıcı";
          const preview = content ? `: \"${content.slice(0, 80)}${content.length > 80 ? "..." : ""}\"` : ".";
          await prisma.notification.createMany({
            data: members.map((m) => ({
              userId: m.userId,
              type: "COMMUNITY_UPDATE",
              title: "Yeni Grup Gönderisi",
              body: `${actor}, ${group?.name ?? "grup"} içinde yeni bir gönderi paylaştı${preview}`,
              link: `/gruplar/${groupId}`,
            })),
          });
        }
      } else if (clubId) {
        const [club, members] = await Promise.all([
          prisma.club.findUnique({ where: { id: clubId }, select: { name: true } }),
          prisma.userClubMembership.findMany({
            where: { clubId, status: "APPROVED", userId: { not: userId } },
            select: { userId: true },
          }),
        ]);

        if (members.length > 0) {
          const actor = post.user.name || "Bir kullanıcı";
          const preview = content ? `: \"${content.slice(0, 80)}${content.length > 80 ? "..." : ""}\"` : ".";
          await prisma.notification.createMany({
            data: members.map((m) => ({
              userId: m.userId,
              type: "COMMUNITY_UPDATE",
              title: "Yeni Kulüp Gönderisi",
              body: `${actor}, ${club?.name ?? "kulüp"} içinde yeni bir gönderi paylaştı${preview}`,
              link: `/kulupler/${clubId}`,
            })),
          });
        }
      }
    } catch (notifyErr) {
      log.error("Post notification create error", notifyErr);
    }

    return NextResponse.json(post, { status: 201 });
  } catch (err) {
    log.error("Post oluşturma hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
