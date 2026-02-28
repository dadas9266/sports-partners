import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger("club-detail");

type Params = { params: Promise<{ clubId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { clubId } = await params;

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: {
        id: true,
        name: true,
        description: true,
        website: true,
        logoUrl: true,
        isPrivate: true,
        createdAt: true,
        sport: { select: { id: true, name: true, icon: true } },
        city: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    });

    if (!club) return NextResponse.json({ error: "Kulüp bulunamadı" }, { status: 404 });

    return NextResponse.json({ success: true, data: club });
  } catch (err) {
    logger.error("GET club error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

const updateClubSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal("")),
  isPrivate: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { clubId } = await params;

    // Must be CAPTAIN with APPROVED status
    const membership = await prisma.userClubMembership.findUnique({
      where: { userId_clubId: { userId, clubId } },
      select: { role: true, status: true },
    });

    if (!membership || membership.role !== "CAPTAIN" || membership.status !== "APPROVED") {
      return NextResponse.json({ error: "Bu işlem için kaptan yetkisi gereklidir" }, { status: 403 });
    }

    const body = await req.json();
    const parse = updateClubSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Geçersiz veri", details: parse.error.flatten() }, { status: 400 });
    }

    const data = parse.data;
    // Remove undefined keys
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description || null;
    if (data.website !== undefined) updateData.website = data.website || null;
    if (data.isPrivate !== undefined) updateData.isPrivate = data.isPrivate;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Değiştirilecek alan belirtilmedi" }, { status: 400 });
    }

    const updated = await prisma.club.update({
      where: { id: clubId },
      data: updateData,
      select: { id: true, name: true, isPrivate: true },
    });

    logger.info("Club updated", { clubId, updatedBy: userId });
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const pErr = err as { code?: string };
    if (pErr.code === "P2002") {
      return NextResponse.json({ error: "Bu isimde bir kulüp zaten mevcut" }, { status: 409 });
    }
    logger.error("PATCH club error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
