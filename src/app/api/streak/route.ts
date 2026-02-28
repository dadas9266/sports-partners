import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

const log = createLogger("streak");

// Seviye hesapla
function calcLevel(totalMatches: number) {
  if (totalMatches >= 50) return "PRO";
  if (totalMatches >= 20) return "SEMI_PRO";
  if (totalMatches >= 5) return "AMATEUR";
  return "BEGINNER";
}

// Günlük Check-in — POST /api/streak
// Uygulamayı açtığında çağrılır, günde 1 kez seri artırır
export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId)
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { currentStreak: true, longestStreak: true, lastActiveDate: true, totalMatches: true, userLevel: true },
    });
    if (!user)
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStreak = user.currentStreak;
    const last = user.lastActiveDate ? new Date(user.lastActiveDate) : null;
    let updated = false;

    if (last) {
      last.setHours(0, 0, 0, 0);
      const diff = (today.getTime() - last.getTime()) / 86400000;
      if (diff === 0) {
        // Bugün zaten check-in yapıldı
        return NextResponse.json({
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          alreadyCheckedIn: true,
        });
      }
      if (diff === 1) { newStreak += 1; updated = true; }
      else { newStreak = 1; updated = true; }
    } else {
      newStreak = 1; updated = true;
    }

    if (!updated)
      return NextResponse.json({ currentStreak: user.currentStreak, longestStreak: user.longestStreak });

    const newLongest = Math.max(newStreak, user.longestStreak);
    await prisma.user.update({
      where: { id: userId },
      data: { currentStreak: newStreak, longestStreak: newLongest, lastActiveDate: new Date() },
    });

    // Milestone
    if ([7, 14, 30, 60, 100].includes(newStreak)) {
      await createNotification({
        userId,
        type: "STREAK_MILESTONE",
        title: `${newStreak} Günlük Seri! 🔥`,
        body: `Harika! ${newStreak} gün üst üste aktif kaldın.`,
        link: "/profil",
      });
    }

    log.info("Streak güncellendi", { userId, newStreak });
    return NextResponse.json({ currentStreak: newStreak, longestStreak: newLongest, alreadyCheckedIn: false });
  } catch (err) {
    log.error("Streak hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// Streak bilgisi al — GET /api/streak
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId)
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastActiveDate: true,
        totalMatches: true,
        totalPoints: true,
        userLevel: true,
        userType: true,
      },
    });
    if (!user)
      return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });

    const calcedLevel = calcLevel(user.totalMatches);
    // Seviye değişmiş mi?
    if (calcedLevel !== user.userLevel) {
      await prisma.user.update({
        where: { id: userId },
        data: { userLevel: calcedLevel as "BEGINNER" | "AMATEUR" | "SEMI_PRO" | "PRO" },
      });
    }

    return NextResponse.json({ ...user, userLevel: calcedLevel });
  } catch (err) {
    log.error("Streak GET hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
