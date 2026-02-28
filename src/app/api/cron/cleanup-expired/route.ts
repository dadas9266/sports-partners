import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/cron/cleanup-expired
 *
 * Vercel Cron Job — her gece 03:00 UTC çalışır.
 * Süresi dolmuş ilanları kapatır.
 * Güvenlik: CRON_SECRET header kontrolü.
 */
export async function GET(req: NextRequest) {
  // Vercel Cron Security
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // 30 günden eski açık ilanları EXPIRED olarak işaretle
  const expiredListings = await prisma.listing.updateMany({
    where: {
      status: "OPEN",
      createdAt: { lt: thirtyDaysAgo },
    },
    data: { status: "EXPIRED" },
  });

  // 90 günden eski okunmuş bildirimleri temizle
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const deletedNotifs = await prisma.notification.deleteMany({
    where: {
      read: true,
      createdAt: { lt: ninetyDaysAgo },
    },
  });

  // Süresi dolmuş şifre sıfırlama tokenlarını temizle
  const deletedTokens = await prisma.passwordResetToken.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  return NextResponse.json({
    ok: true,
    summary: {
      expiredListings: expiredListings.count,
      deletedNotifications: deletedNotifs.count,
      deletedPasswordTokens: deletedTokens.count,
    },
    timestamp: now.toISOString(),
  });
}
