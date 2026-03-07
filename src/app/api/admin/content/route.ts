import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:admin:content");

async function requireAdmin() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  return user?.isAdmin ? userId : null;
}

// Son paylaşılan post ve yorumları listele
export async function GET(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "posts"; // posts | comments
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;

  if (type === "comments") {
    const [items, total] = await Promise.all([
      prisma.postComment.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true } },
          post: { select: { id: true, content: true } },
        },
      }),
      prisma.postComment.count(),
    ]);

    return NextResponse.json({ data: items, total, page, totalPages: Math.ceil(total / limit) });
  }

  // Default: posts
  const [items, total] = await Promise.all([
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.post.count(),
  ]);

  return NextResponse.json({ data: items, total, page, totalPages: Math.ceil(total / limit) });
}

// Post / Yorum sil
export async function DELETE(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const { id, type } = body as { id: string; type: "post" | "comment" };

  if (!id || !type) {
    return NextResponse.json({ error: "id ve type zorunlu" }, { status: 400 });
  }

  try {
    if (type === "post") {
      // Cascade: likes, comments, etc. should be handled by onDelete or manual
      await prisma.postLike.deleteMany({ where: { postId: id } });
      await prisma.commentLike.deleteMany({ where: { comment: { postId: id } } });
      await prisma.postComment.deleteMany({ where: { postId: id } });
      await prisma.post.delete({ where: { id } });
      log.info("Admin post sildi", { adminId, postId: id });
    } else {
      await prisma.commentLike.deleteMany({ where: { commentId: id } });
      // Alt yorumları da sil
      await prisma.postComment.deleteMany({ where: { parentId: id } });
      await prisma.postComment.delete({ where: { id } });
      log.info("Admin yorum sildi", { adminId, commentId: id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("İçerik silinirken hata", error);
    return NextResponse.json({ error: "Silinemedi" }, { status: 500 });
  }
}
