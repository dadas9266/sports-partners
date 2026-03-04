import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimitResponse, getClientIP } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:report");

const VALID_REASONS = [
  "SPAM",
  "HARASSMENT",
  "FAKE_PROFILE",
  "INAPPROPRIATE_CONTENT",
  "SCAM",
  "OTHER",
] as const;

type ReportReason = (typeof VALID_REASONS)[number];

/**
 * POST /api/report
 * Body: { reportedId: string; reason: ReportReason; description?: string }
 *
 * Moderasyon: Kullanıcı şikayeti oluştur.
 * Admin, /api/admin/reports üzerinden inceleyebilir ve çözümleyebilir.
 */
export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Oturum açmanız gerekiyor" }, { status: 401 });
  }

  // Rate limit: günde 10 şikayet
  const ip = getClientIP(req);
  const rl = await checkRateLimit(`${userId}:${ip}`, "report");
  if (!rl.allowed) return rateLimitResponse(rl.remaining);

  let body: { reportedId?: string; reason?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }

  const { reportedId, reason, description } = body;

  if (!reportedId || !reason) {
    return NextResponse.json({ error: "reportedId ve reason zorunlu" }, { status: 400 });
  }

  if (!VALID_REASONS.includes(reason as ReportReason)) {
    return NextResponse.json(
      { error: `Geçersiz sebep. Geçerli değerler: ${VALID_REASONS.join(", ")}` },
      { status: 400 }
    );
  }

  // Kendi kendini şikayet edemezsin
  if (reportedId === userId) {
    return NextResponse.json({ error: "Kendinizi şikayet edemezsiniz" }, { status: 400 });
  }

  // Şikayet edilen kullanıcı mevcut mu?
  const reportedUser = await prisma.user.findUnique({
    where: { id: reportedId },
    select: { id: true, name: true },
  });
  if (!reportedUser) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı" }, { status: 404 });
  }

  // Aynı kişiyi daha önce şikayet ettiyse (çift şikayet önle)
  const existing = await prisma.userReport.findFirst({
    where: { reporterId: userId, reportedId, resolved: false },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Bu kullanıcıyı zaten şikayet ettiniz. Şikayetiniz inceleniyor." },
      { status: 409 }
    );
  }

  const report = await prisma.userReport.create({
    data: {
      reporterId: userId,
      reportedId,
      reason: reason as ReportReason,
      description: description?.trim().slice(0, 500) ?? null,
    },
  });

  // Admin'e bildirim gönder
  try {
    const admins = await prisma.user.findMany({
      where: { isAdmin: true },
      select: { id: true },
    });
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type: "USER_REPORT" as const,
        title: "🚨 Yeni kullanıcı şikayeti",
        body: `"${reportedUser.name}" için yeni bir şikayet: ${reason}`,
        link: `/admin`,
      })),
      skipDuplicates: true,
    });
  } catch {
    // Bildirim hatası kritik değil
  }

  log.info("Kullanıcı şikayeti oluşturuldu", {
    reportId: report.id,
    reporterId: userId,
    reportedId,
    reason,
  });

  return NextResponse.json({ success: true, reportId: report.id }, { status: 201 });
}
