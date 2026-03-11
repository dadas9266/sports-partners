import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:stories:view");

type Params = { params: Promise<{ storyId: string }> };

// GET /api/stories/[storyId]/view — hikaye görüntüleyenleri listele (sadece hikaye sahibi)
export async function GET(_req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false }, { status: 401 });

  const { storyId } = await params;

  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { userId: true },
    });

    if (!story) {
      return NextResponse.json({ success: false, error: "Hikaye bulunamadı" }, { status: 404 });
    }

    if (story.userId !== userId) {
      return NextResponse.json({ success: false, error: "Yetkiniz yok" }, { status: 403 });
    }

    const viewers = await prisma.storyView.findMany({
      where: { storyId },
      orderBy: { viewedAt: "desc" },
      select: {
        viewedAt: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({
      success: true,
      viewers: viewers.map((v) => ({
        id: v.user.id,
        name: v.user.name,
        avatarUrl: v.user.avatarUrl,
        viewedAt: v.viewedAt,
      })),
    });
  } catch (err) {
    log.error("GET /api/stories/[storyId]/view error", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/stories/[storyId]/view — hikaye görüntülendi olarak işaretle
export async function POST(_req: NextRequest, { params }: Params) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false }, { status: 401 });

  const { storyId } = await params;

  try {
    // Upsert — aynı kullanıcı aynı hikayeyi birden fazla kez "view" ekleyemesin
    await prisma.storyView.upsert({
      where: { storyId_userId: { storyId, userId } },
      update: { viewedAt: new Date() },
      create: { storyId, userId },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    // Hikaye silinmiş veya bulunamıyorsa sessizce geç
    const code = (err as { code?: string }).code;
    if (code === "P2003" || code === "P2025") {
      return NextResponse.json({ success: false, error: "Hikaye bulunamadı" }, { status: 404 });
    }
    log.error("POST /api/stories/[storyId]/view error", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
