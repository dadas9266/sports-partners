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

// PATCH /api/matches/[matchId] — Maçı onayla veya raporla
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId)
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    const { matchId } = await params;
    const { action } = await request.json();

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        listing: true,
      },
    });

    if (!match)
      return NextResponse.json({ error: "Maç bulunamadı" }, { status: 404 });

    const isU1 = match.user1Id === userId;
    const isU2 = match.user2Id === userId;

    if (!isU1 && !isU2)
      return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 });

    if (action === "approve" || action === "complete") {
      const updateData: any = isU1 ? { u1Approved: true } : { u2Approved: true };
      
      const otherApproved = isU1 ? match.u2Approved : match.u1Approved;
      if (otherApproved || action === "complete") {
        updateData.status = "COMPLETED";
        updateData.completedAt = new Date();
      }

      const updated = await prisma.match.update({
        where: { id: matchId },
        data: updateData,
      });

      return NextResponse.json({ success: true, data: updated });
    } 

    if (action === "report_no_show" || action === "no-show") {
      const updateData: any = isU1 ? { u1Reported: true } : { u2Reported: true };
      
      const updated = await prisma.match.update({
        where: { id: matchId },
        data: updateData,
      });

      // NoShowReport kaydı ekle
      await prisma.noShowReport.upsert({
        where: { matchId_reporterId: { matchId, reporterId: userId } },
        create: {
          matchId,
          reporterId: userId,
          reportedId: isU1 ? match.user2Id : match.user1Id,
          listingId: match.listingId,
        },
        update: {},
      });

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (err) {
    log.error("Match PATCH hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
