import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";

type Params = { params: Promise<{ storyId: string }> };

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
    console.error("POST /api/stories/[storyId]/view error", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
