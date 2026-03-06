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
      return NextResponse.json({ liked: true, likeCount: count });
    }
  } catch (error) {
    console.error("Comment like error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
