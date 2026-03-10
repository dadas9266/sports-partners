import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withErrorHandler } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:turnuvalar");

const TOURNAMENT_SELECT = {
  id: true,
  title: true,
  description: true,
  format: true,
  status: true,
  maxParticipants: true,
  prizeInfo: true,
  startsAt: true,
  endsAt: true,
  location: true,
  coverImage: true,
  isPublic: true,
  createdAt: true,
  creator: { select: { id: true, name: true, avatarUrl: true } },
  sport: { select: { id: true, name: true, icon: true } },
  _count: { select: { participants: true } },
};

/** GET /api/turnuvalar — Turnuva listesi */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const sportId = searchParams.get("sportId");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(20, Number(searchParams.get("limit") ?? 12));

  const where: Record<string, unknown> = { isPublic: true };
  if (status) where.status = status;
  if (sportId) where.sportId = sportId;

  const [total, tournaments] = await Promise.all([
    (prisma as any).tournament.count({ where }),
    (prisma as any).tournament.findMany({
      where,
      select: TOURNAMENT_SELECT,
      orderBy: { startsAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return NextResponse.json({ tournaments, total, page, limit });
}

/** POST /api/turnuvalar — Turnuva oluştur */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const body = await req.json();
  const {
    title,
    description,
    sportId,
    format,
    maxParticipants,
    prizeInfo,
    startsAt,
    endsAt,
    location,
    isPublic = true,
  } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Başlık gerekli" }, { status: 400 });
  }

  try {
    const tournament = await (prisma as any).tournament.create({
      data: {
        creatorId: session.user.id,
        title: title.trim(),
        description: description ?? null,
        sportId: sportId || null,
        format: format ?? "SINGLE_ELIMINATION",
        maxParticipants: Number(maxParticipants ?? 16),
        prizeInfo: prizeInfo ?? null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt: endsAt ? new Date(endsAt) : null,
        location: location ?? null,
        isPublic,
        status: "DRAFT",
      },
      select: TOURNAMENT_SELECT,
    });
    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    log.error("Turnuva oluşturma hatası", error);
    return NextResponse.json({ error: "Turnuva oluşturulamadı" }, { status: 500 });
  }
}
