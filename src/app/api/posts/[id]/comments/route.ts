import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, sanitizeText } from "@/lib/api-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  const postId = params.id;

  try {
    const comments = await (prisma.postComment as any).findMany({
      where: { postId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: {
          select: { likes: true },
        },
        likes: userId ? {
          where: { userId },
          take: 1
        } : false,
      },
    });

    const formattedComments = (comments as any[]).map(c => ({
      ...c,
      likedByMe: Array.isArray(c.likes) && c.likes.length > 0,
      likes: undefined
    }));

    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error("Fetch comments error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const postId = params.id;
  const { content } = await req.json();

  if (!content || !content.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  try {
    const comment = await (prisma.postComment as any).create({
      data: {
        postId,
        userId,
        content: sanitizeText(content),
      },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
        _count: {
          select: { likes: true },
        }
      },
    });

    return NextResponse.json({ comment });
  } catch (error) {
    console.error("Create comment error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
