import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/** POST /api/turnuvalar/[id]/katil — Turnuvaya katıl */
export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { id } = await params;

  const tournament = await (prisma as any).tournament.findUnique({
    where: { id },
    select: {
      status: true,
      maxParticipants: true,
      _count: { select: { participants: true } },
    },
  });

  if (!tournament) return NextResponse.json({ error: "Bulunamadı" }, { status: 404 });
  if (tournament.status !== "OPEN") {
    return NextResponse.json(
      { error: "Turnuva kayıt kabul etmiyor" },
      { status: 409 }
    );
  }
  if (tournament._count.participants >= tournament.maxParticipants) {
    return NextResponse.json({ error: "Turnuva dolu" }, { status: 409 });
  }

  const existing = await (prisma as any).tournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId: id, userId: session.user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Zaten katıldınız" }, { status: 409 });
  }

  const participant = await (prisma as any).tournamentParticipant.create({
    data: {
      tournamentId: id,
      userId: session.user.id,
      status: "PENDING",
    },
    select: { id: true, status: true, joinedAt: true },
  });

  return NextResponse.json(participant, { status: 201 });
}

/** DELETE /api/turnuvalar/[id]/katil — Turnuvadan çık */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const { id } = await params;

  await (prisma as any).tournamentParticipant
    .deleteMany({
      where: { tournamentId: id, userId: session.user.id },
    })
    .catch(() => null);

  return NextResponse.json({ ok: true });
}
