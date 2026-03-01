import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { z } from "zod";

const reportSchema = z.object({
  reason: z.enum(["SPAM", "HARASSMENT", "FAKE_PROFILE", "INAPPROPRIATE_CONTENT", "SCAM", "OTHER"]),
  description: z.string().max(500).optional(),
});

// POST /api/users/[id]/report — Kullanıcıyı şikayet et
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  if (userId === id) return NextResponse.json({ error: "Kendinizi şikayet edemezsiniz" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  // Aynı kullanıcıya aynı nedenden zaten şikayet var mı?
  const existing = await prisma.userReport.findFirst({
    where: { reporterId: userId, reportedId: id, resolved: false },
  });
  if (existing) {
    return NextResponse.json({ success: true, message: "Bu kullanıcıyı zaten şikayet ettiniz, inceleme süreci devam ediyor." });
  }

  await prisma.userReport.create({
    data: {
      reporterId: userId,
      reportedId: id,
      reason: parsed.data.reason,
      description: parsed.data.description,
    },
  });

  // Admin'e bildirim gönder (eğer admin varsa)
  const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } });
  if (admins.length > 0) {
    const reported = await prisma.user.findUnique({ where: { id }, select: { name: true } });
    await prisma.notification.createMany({
      data: admins.map((a) => ({
        userId: a.id,
        type: "USER_REPORT" as const,
        title: "Yeni Şikayet",
        body: `Bir kullanıcı ${reported?.name ?? "birisini"} şikayet etti. Neden: ${parsed.data.reason}`,
        link: `/admin/users`,
      })),
    });
  }

  return NextResponse.json({ success: true, message: "Şikayetiniz alındı, incelenecektir." });
}
