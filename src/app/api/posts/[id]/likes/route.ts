import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("post-likes-list");

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const userId = await getCurrentUserId();

    const likes = await prisma.postLike.findMany({
      where: { postId },
      select: {
        reaction: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            city: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({
      success: true,
      data: likes.map(l => ({
        reaction: l.reaction,
        user: l.user,
        isFollowing: false // İlerde takip durumu eklenebilir
      }))
    });
  } catch (err) {
    log.error("Post beğenenler listesi hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
