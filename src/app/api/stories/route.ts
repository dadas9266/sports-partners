import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:stories");

// GET /api/stories?userId=xxx  → belirli kullanıcının aktif hikayeleri
// GET /api/stories?feed=true   → takip ettiklerinin + kendi hikayelerini getir
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  const feed = searchParams.get("feed") === "true";

  const now = new Date();

  try {
    if (userId) {
      // Belirli bir kullanıcının aktif hikayeleri
      const stories = await prisma.story.findMany({
        where: { userId, expiresAt: { gt: now } },
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { views: true } },
        },
      });

      // Mevcut oturumdaki kullanıcı için "viewedByMe" bayrağını ekle
      const currentUserId = await getCurrentUserId();
      let viewedIds = new Set<string>();
      if (currentUserId && stories.length > 0) {
        const views = await prisma.storyView.findMany({
          where: {
            userId: currentUserId,
            storyId: { in: stories.map((s) => s.id) },
          },
          select: { storyId: true },
        });
        viewedIds = new Set(views.map((v) => v.storyId));
      }

      return NextResponse.json({
        success: true,
        stories: stories.map((s) => ({
          ...s,
          viewedByMe: viewedIds.has(s.id),
        })),
      });
    }

    if (feed) {
      // Feed: takip ettiklerinin + kendi hikayeleri (profil için UserStoryGroup)
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });
      }

      const following = await prisma.follow.findMany({
        where: { followerId: currentUserId },
        select: { followingId: true },
      });
      const authorIds = [currentUserId, ...following.map((f) => f.followingId)];

      const stories = await prisma.story.findMany({
        where: { userId: { in: authorIds }, expiresAt: { gt: now } },
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          _count: { select: { views: true } },
        },
      });

      const views = await prisma.storyView.findMany({
        where: {
          userId: currentUserId,
          storyId: { in: stories.map((s) => s.id) },
        },
        select: { storyId: true },
      });
      const viewedIds = new Set(views.map((v) => v.storyId));

      // UserStoryGroup formatına çevir
      const groupMap = new Map<string, {
        userId: string;
        userName: string | null;
        userAvatar: string | null;
        stories: typeof stories;
        hasUnread: boolean;
      }>();

      for (const story of stories) {
        const uid = story.userId;
        if (!groupMap.has(uid)) {
          groupMap.set(uid, {
            userId: uid,
            userName: story.user.name,
            userAvatar: story.user.avatarUrl,
            stories: [],
            hasUnread: false,
          });
        }
        const group = groupMap.get(uid)!;
        const withViewed = { ...story, viewedByMe: viewedIds.has(story.id) };
        group.stories.push(withViewed as typeof stories[0]);
        if (!viewedIds.has(story.id)) group.hasUnread = true;
      }

      // Kendi hikayem her zaman başta, sonra okunmamışlar
      const groups = Array.from(groupMap.values()).sort((a, b) => {
        if (a.userId === currentUserId) return -1;
        if (b.userId === currentUserId) return 1;
        if (a.hasUnread && !b.hasUnread) return -1;
        if (!a.hasUnread && b.hasUnread) return 1;
        return 0;
      });

      return NextResponse.json({ success: true, groups });
    }

    return NextResponse.json({ error: "userId veya feed parametresi gerekli" }, { status: 400 });
  } catch (err) {
    log.error("GET /api/stories error", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/stories — yeni hikaye oluştur
const createStorySchema = z.object({
  type: z.enum(["MEDIA", "MATCH", "RESULT", "ACHIEVEMENT"]).default("MEDIA"),
  mediaUrl: z.string().url().optional().nullable(),
  mediaType: z.enum(["image", "video"]).optional().nullable(),
  caption: z.string().max(300).optional().nullable(),
  linkedListingId: z.string().optional().nullable(),
  linkedMatchId: z.string().optional().nullable(),
  linkedMatchResult: z.string().max(100).optional().nullable(),
  linkedBadgeKey: z.string().max(80).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });

  try {
    const body = await req.json();
    const parse = createStorySchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Geçersiz veri", details: parse.error.flatten() }, { status: 400 });
    }

    const data = parse.data;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 saat

    const story = await prisma.story.create({
      data: {
        userId,
        type: data.type,
        mediaUrl: data.mediaUrl ?? null,
        mediaType: data.mediaType ?? null,
        caption: data.caption ?? null,
        linkedListingId: data.linkedListingId ?? null,
        linkedMatchId: data.linkedMatchId ?? null,
        linkedMatchResult: data.linkedMatchResult ?? null,
        linkedBadgeKey: data.linkedBadgeKey ?? null,
        expiresAt,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { views: true } },
      },
    });

    return NextResponse.json({ success: true, story }, { status: 201 });
  } catch (err) {
    log.error("POST /api/stories error", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
