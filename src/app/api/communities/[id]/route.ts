import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { getCommunity, updateCommunity, deleteCommunity } from "@/lib/community-service";

const logger = createLogger("community-detail");
type Params = { params: Promise<{ id: string }> };

// GET /api/communities/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const community = await getCommunity(id);
    if (!community) return NextResponse.json({ error: "Topluluk bulunamadı" }, { status: 404 });
    return NextResponse.json({ success: true, data: community });
  } catch (err) {
    logger.error("GET community error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

const updateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().url().or(z.literal("")).optional().nullable(),
  website: z.string().url().or(z.literal("")).optional().nullable(),
  isPrivate: z.boolean().optional(),
});

// PATCH /api/communities/[id] — Topluluk güncelle (sadece ADMIN)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });

    const result = await updateCommunity(id, parsed.data, userId);
    if (result === "notFound") return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    if (result === "forbidden") return NextResponse.json({ error: "Yetki gerekli" }, { status: 403 });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    logger.error("PATCH community error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/communities/[id] — Topluluğu sil (sadece kurucu)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { id } = await params;
    const result = await deleteCommunity(id, userId);
    if (result === "notFound") return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    if (result === "forbidden") return NextResponse.json({ error: "Sadece kurucu silebilir" }, { status: 403 });

    logger.info("Community deleted", { id, userId });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("DELETE community error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}


