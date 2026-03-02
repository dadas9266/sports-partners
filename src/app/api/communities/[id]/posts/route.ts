import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, sanitizeText } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("community-posts");
type Params = { params: Promise<{ id: string }> };

const createPostSchema = z.object({
  content: z.string().max(1000).optional(),
  images: z.array(z.string().url()).max(5).default([]),
});

/**
 * GET /api/communities/[id]/posts
 * Topluluğun üye kullanıcılarının gönderilerini döner.
 * (Post modeline communityId migration olmadan çalışan alternatif)
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { id: communityId } = await params;
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "15"), 30);

    // Topluluk üyelerini al
    const memberships = await (prisma as any).communityMembership.findMany({
      where: { communityId, status: "APPROVED" },
      select: { userId: true },
    });
    const memberIds = memberships.map((m: { userId: string }) => m.userId);

    if (memberIds.length === 0) {
      return NextResponse.json({ success: true, data: [], nextCursor: null });
    }

    const cursorFilter = cursor ? { id: { lt: cursor } } : {};

    const posts = await prisma.post.findMany({
      where: {
        userId: { in: memberIds },
        groupId: null,
        clubId: null,
        ...cursorFilter,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            userType: true,
          },
        },
        _count: { select: { likes: true, comments: true } },
        likes: userId ? { where: { userId }, select: { id: true } } : false,
      },
    });

    const nextCursor = posts.length === limit ? posts[posts.length - 1].id : null;

    return NextResponse.json({ success: true, data: posts, nextCursor });
  } catch (err) {
    log.error("GET community posts error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

/**
 * POST /api/communities/[id]/posts
 * Topluluğa onaylı üye ise gönderi oluştur.
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { id: communityId } = await params;

    // Üyelik kontrolü
    const membership = await (prisma as any).communityMembership.findUnique({
      where: { userId_communityId: { userId, communityId } },
      select: { status: true, role: true },
    });
    if (!membership || membership.status !== "APPROVED") {
      return NextResponse.json({ error: "Bu topluluğun üyesi değilsiniz" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
    }

    const { content, images } = parsed.data;
    if (!content?.trim() && images.length === 0) {
      return NextResponse.json({ error: "Gönderi içeriği veya görsel gereklidir" }, { status: 400 });
    }

    const post = await prisma.post.create({
      data: {
        userId,
        content: content ? sanitizeText(content) : null,
        images,
        // communityId yok (migration olmadan workaround)
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    log.info("Community post created", { postId: post.id, communityId, userId });
    return NextResponse.json({ success: true, data: post }, { status: 201 });
  } catch (err) {
    log.error("POST community post error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
