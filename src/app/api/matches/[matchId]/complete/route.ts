import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

const log = createLogger("match-complete");

// Seviye hesapla
function calcLevel(totalMatches: number): string {
  if (totalMatches >= 50) return "PRO";
  if (totalMatches >= 20) return "SEMI_PRO";
  if (totalMatches >= 5) return "AMATEUR";
  return "BEGINNER";
}

// Streak güncelle — son aktif tarih bugün mü yoksa dün mü?
async function updateStreak(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, longestStreak: true, lastActiveDate: true },
  });
  if (!user) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let newStreak = user.currentStreak;
  const last = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
  if (last) {
    last.setHours(0, 0, 0, 0);
    const diff = (today.getTime() - last.getTime()) / 86400000;
    if (diff === 1) newStreak += 1; // Dün aktifti → seri devam
    else if (diff > 1) newStreak = 1; // Ayrı kaldı → sıfırla
    // diff === 0: Bugün zaten aktif, sayma
  } else {
    newStreak = 1;
  }

  const newLongest = Math.max(newStreak, user.longestStreak);
  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      longestStreak: newLongest,
      lastActiveDate: new Date(),
      totalMatches: { increment: 1 },
      totalPoints: { increment: 10 }, // Maç başına 10 puan
    },
  });

  // Milestone bildirimleri
  if ([7, 14, 30, 60, 100].includes(newStreak)) {
    await createNotification({
      userId,
      type: "STREAK_MILESTONE",
      title: `${newStreak} Günlük Seri! 🔥`,
      body: `Harika! ${newStreak} gün üst üste aktif kaldın. Böyle devam et!`,
      link: "/profil",
    });
  }

  return { newStreak, newLongest };
}

// Maçı Tamamla — POST /api/matches/[matchId]/complete
// Çağırabilecekler: maç katılımcıları (trustScore ≥ 40 gerekli, aksi hâlde sadece ONGOING)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId)
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    const { matchId } = await params;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match)
      return NextResponse.json({ error: "Maç bulunamadı" }, { status: 404 });

    const isParticipant = match.user1Id === userId || match.user2Id === userId;
    if (!isParticipant)
      return NextResponse.json({ error: "Bu maça ait değilsiniz" }, { status: 403 });

    if (match.status === "COMPLETED")
      return NextResponse.json({ error: "Maç zaten tamamlandı" }, { status: 400 });

    const otherUserId = match.user1Id === userId ? match.user2Id : match.user1Id;

    // trustScore >= 40: Doğrulanmış maç → direkt tamamla
    // trustScore < 40: Her iki tarafın onayı gerekir (mutual confirmation)
    if (match.trustScore < 40) {
      // İlk onaylayan mı?
      if (!match.approvedById) {
        // Birinci onay → ONGOING'e geç, onaylayanı kaydet
        await prisma.match.update({
          where: { id: matchId },
          data: { status: "ONGOING", approvedById: userId },
        });
        // Diğer kullanıcıya onay beklendiğini bildir
        await createNotification({
          userId: otherUserId,
          type: "MATCH_STATUS_CHANGED",
          title: "Maç Tamamlama İsteği ⏳",
          body: "Rakibiniz maçın tamamlandığını bildirdi. Siz de onaylayın!",
          link: `/mesajlar/${matchId}`,
        });
        log.info("Maç tamamlama isteği (1/2)", { matchId, requestedBy: userId });
        return NextResponse.json({
          success: true,
          pendingConfirmation: true,
          message: "İsteğiniz alındı. Rakibinizin de onaylaması bekleniyor.",
        });
      }

      // İkinci onay: approvedById dolu ve başka biri çağırıyorsa
      if (match.approvedById === userId) {
        // Aynı kişi tekrar çağırdı
        return NextResponse.json({
          success: false,
          error: "Zaten onayladınız. Rakibinizin onayı bekleniyor.",
          pendingConfirmation: true,
        }, { status: 400 });
      }

      // Karşı taraf onayladı → tamamla
    }

    await prisma.match.update({
      where: { id: matchId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    // Her iki kullanıcı için streak + puan güncelle
    await updateStreak(match.user1Id);
    await updateStreak(match.user2Id);

    // Seviye atlaması kontrol et
    for (const uid of [match.user1Id, match.user2Id]) {
      const u = await prisma.user.findUnique({
        where: { id: uid },
        select: { totalMatches: true, userLevel: true, name: true },
      });
      if (!u) continue;
      const calcedLevel = calcLevel(u.totalMatches);
      if (calcedLevel !== u.userLevel) {
        await prisma.user.update({
          where: { id: uid },
          data: { userLevel: calcedLevel as "BEGINNER" | "AMATEUR" | "SEMI_PRO" | "PRO" },
        });
        await createNotification({
          userId: uid,
          type: "LEVEL_UP",
          title: "Seviye Atladın! 🏆",
          body: `Tebrikler! Artık "${calcedLevel}" seviyesindesin.`,
          link: "/profil",
        });
      }
    }

    // Katılımcılara tamamlandı bildirimi
    for (const uid of [match.user1Id, match.user2Id]) {
      await createNotification({
        userId: uid,
        type: "MATCH_STATUS_CHANGED",
        title: "Maç Tamamlandı ✓",
        body: "Maçınız başarıyla tamamlandı. Rakibinizi değerlendirmeyi unutmayın!",
        link: `/mesajlar/${matchId}`,
      });
    }

    log.info("Maç tamamlandı", { matchId, trustScore: match.trustScore });
    return NextResponse.json({ success: true, pendingConfirmation: false, trustScore: match.trustScore });
  } catch (err) {
    log.error("Complete hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
