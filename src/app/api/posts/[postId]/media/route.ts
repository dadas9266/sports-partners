import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized, notFound } from "@/lib/api-utils";

// POST /api/posts/[postId]/media — medya ekle (fotoğraf/video url)
export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();
  if (!postId) return notFound("Post ID gerekli");
  const body = await req.json();
  const url = (body?.url ?? "").trim();
  if (!url) return NextResponse.json({ success: false, error: "Medya URL gerekli" }, { status: 400 });
  // Postun sahibi mi?
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.userId !== userId) return NextResponse.json({ success: false, error: "Yetkiniz yok" }, { status: 403 });
  await prisma.post.update({
    where: { id: postId },
    data: { images: { push: url } },
  });
  return NextResponse.json({ success: true });
}
