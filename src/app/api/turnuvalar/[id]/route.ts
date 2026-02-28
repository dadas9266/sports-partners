import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const DETAIL_SELECT = {
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
  participants: {
    select: {
      id: true,
      status: true,
      rank: true,
      joinedAt: true,
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { joinedAt: "asc" as const },
  },
};

/** GET /api/turnuvalar/[id] */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const tournament = await (prisma as any).tournament.findUnique({
    where: { id },
    select: DETAIL_SELECT,
  });

  if (!tournament) {
    return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  }

  return NextResponse.json(tournament);
}

/** PATCH /api/turnuvalar/[id] — Durum güncelle (sadece creator veya admin) */
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { id } = await params;
  const tournament = await (prisma as any).tournament.findUnique({
    where: { id },
    select: { creatorId: true },
  });

  if (!tournament) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const isAdmin = (session.user as any).role === "ADMIN";
  if (tournament.creatorId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await req.json();
  const { status, ...rest } = body;

  const updated = await (prisma as any).tournament.update({
    where: { id },
    data: { ...(status && { status }), ...rest },
    select: DETAIL_SELECT,
  });

  return NextResponse.json(updated);
}

/** DELETE /api/turnuvalar/[id] */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { id } = await params;
  const tournament = await (prisma as any).tournament.findUnique({
    where: { id },
    select: { creatorId: true, status: true },
  });

  if (!tournament) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });

  const isAdmin = (session.user as any).role === "ADMIN";
  if (tournament.creatorId !== session.user.id && !isAdmin) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  if (tournament.status === "ONGOING") {
    return NextResponse.json(
      { error: "Devam eden turnuva silinemez" },
      { status: 409 }
    );
  }

  await (prisma as any).tournament.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
