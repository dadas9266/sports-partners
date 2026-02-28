import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

const log = createLogger("match-approve");

// Üçüncü Taraf Onayı — POST /api/matches/[matchId]/approve
// Sadece TRAINER veya VENUE userType onaylayabilir
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId)
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    const { matchId } = await params;

    // Onaylayan kullanıcı TRAINER veya VENUE mi?
    const approver = await prisma.user.findUnique({
      where: { id: userId },
      select: { userType: true, name: true },
    });

    if (!approver || (approver.userType !== "TRAINER" && approver.userType !== "VENUE"))
      return NextResponse.json(
        { error: "Sadece Eğitmen veya Mekan hesapları maç onaylayabilir" },
        { status: 403 }
      );

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, status: true, approvedAt: true, user1Id: true, user2Id: true },
    });

    if (!match)
      return NextResponse.json({ error: "Maç bulunamadı" }, { status: 404 });

    if (match.approvedAt)
      return NextResponse.json({ error: "Bu maç zaten onaylandı" }, { status: 400 });

    // Onayı uygula + trust score +30 + COMPLETED yap
    await prisma.match.update({
      where: { id: matchId },
      data: {
        approvedById: userId,
        approvedAt: new Date(),
        trustScore: { increment: 30 },
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Her iki katılımcıya bildirim gönder
    for (const uid of [match.user1Id, match.user2Id]) {
      await createNotification({
        userId: uid,
        type: "MATCH_STATUS_CHANGED",
        title: "Maç Onaylandı ✓",
        body: `${approver.name} maçınızı onayladı. Puanlarınız güncellendi.`,
        link: `/mesajlar/${matchId}`,
      });
    }

    log.info("Maç üçüncü tarafça onaylandı", { matchId, approverId: userId });
    return NextResponse.json({ success: true, message: "Maç onaylandı ve tamamlandı" });
  } catch (err) {
    log.error("Onay hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
