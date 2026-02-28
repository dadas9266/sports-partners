import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("admin:trainers");

// GET /api/admin/trainers?status=PENDING|ALL&page=1&limit=20
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const caller = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
    if (!caller?.isAdmin) return NextResponse.json({ error: "Yetki gerekli" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const filterStatus = searchParams.get("status") ?? "PENDING";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));

    // PENDING = not yet verified, APPROVED = verified, ALL = both
    const where =
      filterStatus === "ALL" ? {} :
      filterStatus === "APPROVED" ? { isVerified: true } :
      { isVerified: false }; // PENDING

    const [profiles, total] = await Promise.all([
      prisma.trainerProfile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          gymName: true,
          gymAddress: true,
          certificates: true,
          isVerified: true,
          verifiedAt: true,
          createdAt: true,
          specializations: { select: { sportName: true, years: true } },
          user: { select: { id: true, name: true, email: true, avatarUrl: true, city: { select: { name: true } } } },
        },
      }),
      prisma.trainerProfile.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: profiles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    log.error("GET admin/trainers error", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

const patchSchema = z.object({
  profileId: z.string().cuid(),
  action: z.enum(["approve", "reject"]),
});

// PATCH /api/admin/trainers — Antrenör profilini onayla veya reddet
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const caller = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
    if (!caller?.isAdmin) return NextResponse.json({ error: "Yetki gerekli" }, { status: 403 });

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });

    const { profileId, action } = parsed.data;

    const profile = await prisma.trainerProfile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true, gymName: true, isVerified: true },
    });
    if (!profile) return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 });

    const isApprove = action === "approve";

    const updated = await prisma.trainerProfile.update({
      where: { id: profileId },
      data: {
        isVerified: isApprove,
        verifiedAt: isApprove ? new Date() : null,
      },
      select: { id: true, isVerified: true, verifiedAt: true },
    });

    // Kullanıcıya bildirim gönder
    await createNotification({
      userId: profile.userId,
      type: "TRAINER_VERIFIED",
      title: isApprove ? "Antrenör Profiliniz Onaylandı 🎉" : "Antrenör Profili Güncellemesi",
      body: isApprove
        ? `Antrenör profiliniz onaylandı! Artık platformda onaylı antrenör olarak görüneceksiniz.`
        : `Antrenör profiliniz değerlendirme sürecindedir. Lütfen profil bilgilerinizi eksiksiz doldurun.`,
      link: "/ayarlar/profesyonel",
    }).catch(() => {});

    log.info(`Trainer profile ${action}d`, { profileId, adminId: userId });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    log.error("PATCH admin/trainers error", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
