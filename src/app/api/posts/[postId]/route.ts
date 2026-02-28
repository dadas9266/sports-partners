import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";

// DELETE /api/posts/[postId]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { postId } = await params;

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
  if (!post) return NextResponse.json({ error: "Gönderi bulunamadı" }, { status: 404 });
  if (post.userId !== userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  await prisma.post.delete({ where: { id: postId } });
  return NextResponse.json({ success: true });
}
