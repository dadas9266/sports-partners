import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("match-detail");

// GET /api/matches/[matchId] — Maç detayını getir
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId)
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    const { matchId } = await params;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        listing: {
          select: {
            id: true,
            type: true,
            description: true,
            dateTime: true,
            sport: { select: { id: true, name: true, icon: true } },
            district: { select: { name: true, city: { select: { name: true } } } },
          },
        },
        user1: { select: { id: true, name: true, avatarUrl: true, userLevel: true } },
        user2: { select: { id: true, name: true, avatarUrl: true, userLevel: true } },
        ratings: {
          select: { ratedById: true, score: true, comment: true, createdAt: true },
        },
      },
    });

    if (!match)
      return NextResponse.json({ error: "Maç bulunamadı" }, { status: 404 });

    const isParticipant = match.user1Id === userId || match.user2Id === userId;
    if (!isParticipant)
      return NextResponse.json({ error: "Bu maça erişim yetkiniz yok" }, { status: 403 });

    const myRating = match.ratings.find((r) => r.ratedById === userId);
    const iHaveConfirmed =
      match.approvedById === userId || match.status === "COMPLETED";

    return NextResponse.json({
      success: true,
      data: {
        ...match,
        iHaveConfirmed,
        myRating: myRating ?? null,
      },
    });
  } catch (err) {
    log.error("Match GET hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
