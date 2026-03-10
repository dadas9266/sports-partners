import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:post-likes");

// GET /api/posts/[postId]/likes
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params;

  try {
    const likes = await prisma.postLike.findMany({
      where: { postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            userType: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = likes.map(l => ({
      id: l.id,
      reaction: l.reaction,
      user: l.user,
      createdAt: l.createdAt,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err) {
    log.error("Likes fetch error", err);
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
