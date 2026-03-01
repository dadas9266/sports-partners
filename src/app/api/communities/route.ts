import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { listCommunities, attachMyStatus, createCommunity } from "@/lib/community-service";
import type { CommunityType } from "@prisma/client";

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

// GET /api/communities?type=GROUP|CLUB|TEAM&cityId=&sportId=&search=&page=&limit=&myMemberships=true
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as CommunityType | null;
    const cityId = searchParams.get("cityId") ?? undefined;
    const sportId = searchParams.get("sportId") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const myMemberships = searchParams.get("myMemberships") === "true";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(100, Number(searchParams.get("limit") ?? 20));

    if (myMemberships) {
      if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
      const result = await listCommunities({ myMembershipUserId: userId, limit });
      return NextResponse.json({ success: true, ...result });
    }

    const result = await listCommunities({ type, cityId, sportId, search, page, limit });
    const communities = (result as { communities: { id: string }[] }).communities;

    let data: unknown[] = communities;
    if (userId) data = await attachMyStatus(communities, userId);

    return NextResponse.json({ success: true, data, total: result.total, page, limit });
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

    const community = await createCommunity({
      type: type as CommunityType,
      name,
      description,
      avatarUrl,
      website,
      isPrivate,
      sportId,
      cityId,
      creatorId: userId,
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
