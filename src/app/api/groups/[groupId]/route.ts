import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger("group-detail");

type Params = { params: Promise<{ groupId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { groupId } = await params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        avatarUrl: true,
        createdAt: true,
        sport: { select: { id: true, name: true, icon: true } },
        city: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    });

    if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 });

    return NextResponse.json({ success: true, data: group });
  } catch (err) {
    logger.error("GET group error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

const updateGroupSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { groupId } = await params;

    // Must be ADMIN with APPROVED status
    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
      select: { role: true, status: true },
    });

    if (!membership || membership.role !== "ADMIN" || membership.status !== "APPROVED") {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gereklidir" }, { status: 403 });
    }

    const body = await req.json();
    const parse = updateGroupSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Geçersiz veri", details: parse.error.flatten() }, { status: 400 });
    }

    const data = parse.data;
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Değiştirilecek alan belirtilmedi" }, { status: 400 });
    }

    const updated = await prisma.group.update({
      where: { id: groupId },
      data: updateData,
      select: { id: true, name: true, isPublic: true },
    });

    logger.info("Group updated", { groupId, updatedBy: userId });
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const pErr = err as { code?: string };
    if (pErr.code === "P2002") {
      return NextResponse.json({ error: "Bu isimde bir grup zaten mevcut" }, { status: 409 });
    }
    logger.error("PATCH group error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
