import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:admin:reports");

/**
 * GET /api/admin/reports?status=PENDING|ALL&page=1&limit=20
 * Tüm kullanıcı şikayetlerini listele (sadece admin).
 *
 * PATCH /api/admin/reports
 * Body: { reportId: string; action: "resolve" | "ban_user" | "dismiss" }
 * Şikayeti çözümle veya kullanıcıyı yasakla (sadece admin).
 */
async function assertAdmin(req: NextRequest): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  return user?.isAdmin ? userId : null;
}

export async function GET(req: NextRequest) {
  const adminId = await assertAdmin(req);
  if (!adminId) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "PENDING";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(50, parseInt(searchParams.get("limit") ?? "20"));
  const skip = (page - 1) * limit;

  const where = status === "PENDING" ? { resolved: false } : {};

  const [total, reports] = await Promise.all([
    prisma.userReport.count({ where }),
    prisma.userReport.findMany({
      where,
      include: {
        reporter: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reported: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            isBanned: true,
            reportsReceived: {
              where: { resolved: false },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: reports.map((r) => ({
      id: r.id,
      reason: r.reason,
      description: r.description,
      resolved: r.resolved,
      createdAt: r.createdAt,
      reporter: r.reporter,
      reported: {
        ...r.reported,
        totalActiveReports: r.reported.reportsReceived.length,
        reportsReceived: undefined,
      },
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const adminId = await assertAdmin(req);
  if (!adminId) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  let body: { reportId?: string; action?: "resolve" | "ban_user" | "dismiss" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi" }, { status: 400 });
  }

  const { reportId, action } = body;
  if (!reportId || !action) {
    return NextResponse.json({ error: "reportId ve action zorunlu" }, { status: 400 });
  }

  const report = await prisma.userReport.findUnique({
    where: { id: reportId },
    include: { reported: { select: { id: true, name: true } } },
  });
  if (!report) {
    return NextResponse.json({ error: "Şikayet bulunamadı" }, { status: 404 });
  }

  if (action === "ban_user") {
    // Kullanıcıyı yasakla + ilgili tüm bekleyen şikayetleri çözümle
    await Promise.all([
      prisma.user.update({
        where: { id: report.reportedId },
        data: { isBanned: true },
      }),
      prisma.userReport.updateMany({
        where: { reportedId: report.reportedId, resolved: false },
        data: { resolved: true },
      }),
    ]);

    // Şikayet eden kullanıcıya bildirim
    await prisma.notification.create({
      data: {
        userId: report.reporterId,
        type: "USER_REPORT" as const,
        title: "✅ Şikayetiniz incelendi",
        body: `Bildirdiğiniz kullanıcı hakkında gerekli işlem yapıldı. İşbirliğiniz için teşekkürler.`,
        link: "/",
      },
    });

    log.info("Admin kullanıcı yasakladı", { adminId, reportedId: report.reportedId, reportId });
    return NextResponse.json({ success: true, action: "banned" });
  }

  if (action === "resolve" || action === "dismiss") {
    await prisma.userReport.update({
      where: { id: reportId },
      data: { resolved: true },
    });

    log.info("Şikayet işaretlendi", { adminId, reportId, action });
    return NextResponse.json({ success: true, action });
  }

  return NextResponse.json({ error: "Geçersiz action" }, { status: 400 });
}
