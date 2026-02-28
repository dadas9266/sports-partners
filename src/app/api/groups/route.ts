import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger("groups");

const createGroupSchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(500).optional(),
  sportId: z.string().optional(),
  cityId: z.string().optional(),
  isPublic: z.boolean().default(true),
  avatarUrl: z.string().url().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get("cityId") ?? undefined;
    const sportId = searchParams.get("sportId") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));

    const groups = await prisma.group.findMany({
      where: {
        isPublic: true,
        ...(cityId && { cityId }),
        ...(sportId && { sportId }),
        ...(search && { name: { contains: search, mode: "insensitive" } }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        isPublic: true,
        avatarUrl: true,
        createdAt: true,
        sport: { select: { id: true, name: true, icon: true } },
        city: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true, avatarUrl: true } },
        _count: { select: { members: true, listings: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return NextResponse.json({ success: true, groups });
  } catch (err) {
    logger.error("GET /api/groups error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const body = await req.json();
    const parsed = createGroupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, description, sportId, cityId, isPublic, avatarUrl } = parsed.data;

    const group = await prisma.group.create({
      data: {
        name,
        description,
        sportId: sportId ?? null,
        cityId: cityId ?? null,
        creatorId: userId,
        isPublic,
        avatarUrl: avatarUrl ?? null,
        members: {
          create: { userId, role: "ADMIN" },
        },
      },
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

    logger.info("Group created", { groupId: group.id, userId });
    return NextResponse.json({ success: true, group }, { status: 201 });
  } catch (err: unknown) {
    const pErr = err as { code?: string };
    if (pErr.code === "P2002") {
      return NextResponse.json({ error: "Bu isimde bir grup bu şehirde zaten var" }, { status: 409 });
    }
    logger.error("POST /api/groups error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
