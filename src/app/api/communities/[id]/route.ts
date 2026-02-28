import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger("community-detail");
type Params = { params: Promise<{ id: string }> };

const communitySelect = {
  id: true,
  type: true,
  name: true,
  description: true,
  avatarUrl: true,
  website: true,
  isPrivate: true,
  createdAt: true,
  sport: { select: { id: true, name: true, icon: true } },
  city: { select: { id: true, name: true } },
  creator: { select: { id: true, name: true, avatarUrl: true } },
  _count: { select: { members: true } },
} as const;

// GET /api/communities/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const community = await (prisma as any).community.findUnique({
      where: { id },
      select: communitySelect,
    });
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

    const membership = await (prisma as any).communityMembership.findUnique({
      where: { userId_communityId: { userId, communityId: id } },
      select: { role: true, status: true },
    });
    if (!membership || membership.role !== "ADMIN" || membership.status !== "APPROVED") {
      return NextResponse.json({ error: "Yetki gerekli" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });

    const { name, description, avatarUrl, website, isPrivate } = parsed.data;
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description ?? null;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null;
    if (website !== undefined) data.website = website || null;
    if (isPrivate !== undefined) data.isPrivate = isPrivate;

    const community = await (prisma as any).community.update({
      where: { id },
      data,
      select: communitySelect,
    });

    return NextResponse.json({ success: true, data: community });
  } catch (err) {
    logger.error("PATCH community error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/communities/[id] — Topluluğu sil (sadece kurucu/ADMIN)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { id } = await params;

    const community = await (prisma as any).community.findUnique({
      where: { id },
      select: { creatorId: true },
    });
    if (!community) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
    if (community.creatorId !== userId) {
      return NextResponse.json({ error: "Sadece kurucu silebilir" }, { status: 403 });
    }

    await (prisma as any).community.delete({ where: { id } });
    logger.info("Community deleted", { id, userId });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("DELETE community error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
