import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postId = params.id;
  const { reaction = "like" } = await req.json().catch(() => ({}));

  try {
    const existing = await prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existing) {
      if (existing.reaction === reaction) {
        // Same reaction, unlike
        await prisma.postLike.delete({
          where: { id: existing.id },
        });
        const count = await prisma.postLike.count({ where: { postId } });
        return NextResponse.json({ liked: false, likeCount: count });
      } else {
        // Update reaction
        await prisma.postLike.update({
          where: { id: existing.id },
          data: { reaction },
        });
        const count = await prisma.postLike.count({ where: { postId } });
        return NextResponse.json({ liked: true, reaction, likeCount: count });
      }
    } else {
      // New like
      await prisma.postLike.create({
        data: {
          postId,
          userId,
          reaction,
        },
      });
      const count = await prisma.postLike.count({ where: { postId } });
      return NextResponse.json({ liked: true, reaction, likeCount: count });
    }
  } catch (error) {
    console.error("Post like error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
