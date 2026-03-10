import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:stories");

type Params = { params: Promise<{ storyId: string }> };

// DELETE /api/stories/[storyId] — sadece hikaye sahibi silebilir
export async function DELETE(_req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Giriş gerekli" }, { status: 401 });

  const { storyId } = await params;

  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true },
    });

    if (!story) return NextResponse.json({ error: "Hikaye bulunamadı" }, { status: 404 });
    if (story.userId !== userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    await prisma.story.delete({ where: { id: storyId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("DELETE /api/stories/[storyId] error", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
