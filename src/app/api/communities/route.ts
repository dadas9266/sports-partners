import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger("communities");

const createSchema = z.object({
  type: z.enum(["GROUP", "CLUB", "TEAM"]).default("GROUP"),
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  website: z.string().url().optional().nullable(),
  isPrivate: z.boolean().default(false),
  sportId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
});

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

// GET /api/communities?type=GROUP|CLUB|TEAM&cityId=&sportId=&search=&page=&limit=&myMemberships=true
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as "GROUP" | "CLUB" | "TEAM" | null;
    const cityId = searchParams.get("cityId") ?? undefined;
    const sportId = searchParams.get("sportId") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const myMemberships = searchParams.get("myMemberships") === "true";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));

    // When myMemberships=true — return communities the current user belongs to
    if (myMemberships) {
      if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
      const memberships = await prisma.communityMembership.findMany({
        where: { userId },
        select: {
          role: true,
          status: true,
          community: { select: communitySelect },
        },
        orderBy: { joinedAt: "desc" },
      });

      const data = memberships.map(m => ({
        ...m.community,
        role: m.role,
        myStatus: m.status as "APPROVED" | "PENDING" | "REJECTED",
      }));

      return NextResponse.json({ success: true, data, total: data.length, page: 1, limit });
    }

    const where = {
      ...(type && { type }),
      ...(cityId && { cityId }),
      ...(sportId && { sportId }),
      ...(search && { name: { contains: search, mode: "insensitive" as const } }),
    };

    const [communities, total] = await Promise.all([
      prisma.community.findMany({
        where,
        select: communitySelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.community.count({ where }),
    ]);

    // Attach myStatus for authenticated users
    let data: Array<typeof communities[0] & { myStatus?: string | null }> = communities;
    if (userId) {
      const myMems = await prisma.communityMembership.findMany({
        where: { userId, communityId: { in: communities.map(c => c.id) } },
        select: { communityId: true, status: true },
      });
      const statusMap = Object.fromEntries(myMems.map(m => [m.communityId, m.status]));
      data = communities.map(c => ({ ...c, myStatus: statusMap[c.id] ?? null }));
    }

    return NextResponse.json({ success: true, data, total, page, limit });
  } catch (err) {
    logger.error("GET /api/communities error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/communities — Yeni topluluk oluştur
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz veri", details: parsed.error.flatten() }, { status: 400 });
    }

    const { type, name, description, avatarUrl, website, isPrivate, sportId, cityId } = parsed.data;

    const community = await prisma.community.create({
      data: {
        type,
        name,
        description: description ?? null,
        avatarUrl: avatarUrl ?? null,
        website: website ?? null,
        isPrivate,
        sportId: sportId ?? null,
        cityId: cityId ?? null,
        creatorId: userId,
        members: {
          create: { userId, role: "ADMIN" },
        },
      },
      select: communitySelect,
    });

    logger.info("Community created", { communityId: community.id, type, userId });
    return NextResponse.json({ success: true, community }, { status: 201 });
  } catch (err: unknown) {
    const pErr = err as { code?: string };
    if (pErr?.code === "P2002") {
      return NextResponse.json({ error: "Bu şehirde aynı isimde bir topluluk zaten mevcut" }, { status: 409 });
    }
    logger.error("POST /api/communities error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
