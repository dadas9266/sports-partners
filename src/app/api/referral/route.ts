import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import crypto from "crypto";

const log = createLogger("api:referral");

function generateCode(): string {
  return crypto.randomBytes(4).toString("hex").toUpperCase(); // 8 char hex code
}

// GET /api/referral — kullanıcının referral kodu ve istatistikleri
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      referralCode: true,
      _count: { select: { referrals: true } },
    },
  });

  if (!user) return NextResponse.json({ success: false }, { status: 404 });

  // Otomatik kod oluştur (ilk istek)
  let code = user.referralCode;
  if (!code) {
    code = generateCode();
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
    } catch {
      // Unique constraint hit (çok nadir) — tekrar dene
      code = generateCode();
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
      });
    }
  }

  // Davet edilen kişilerin listesi
  const referrals = await prisma.user.findMany({
    where: { referredById: userId },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    success: true,
    data: {
      code,
      referralCount: user._count.referrals,
      referrals,
    },
  });
}

// POST /api/referral — referral kodu kullan (kayıt sonrası)
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ success: false }, { status: 401 });

  const body = await req.json();
  const { code } = body;

  if (!code || typeof code !== "string") {
    return NextResponse.json({ success: false, error: "Davet kodu gerekli" }, { status: 400 });
  }

  // Kullanıcının zaten referrer'ı var mı?
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredById: true },
  });

  if (currentUser?.referredById) {
    return NextResponse.json({ success: false, error: "Zaten bir davet kodu kullanılmış" }, { status: 400 });
  }

  // Kodu bul
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code.toUpperCase() },
    select: { id: true },
  });

  if (!referrer) {
    return NextResponse.json({ success: false, error: "Geçersiz davet kodu" }, { status: 404 });
  }

  if (referrer.id === userId) {
    return NextResponse.json({ success: false, error: "Kendi kodunuzu kullanamazsınız" }, { status: 400 });
  }

  // Referral uygula + her iki kullanıcıya +50 puan
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        referredById: referrer.id,
        totalPoints: { increment: 50 },
      },
    }),
    prisma.user.update({
      where: { id: referrer.id },
      data: { totalPoints: { increment: 50 } },
    }),
  ]);

  log.info("Referral uygulandı", { userId, referrerId: referrer.id });
  return NextResponse.json({ success: true, message: "Davet kodu uygulandı! +50 puan kazandınız." });
}
