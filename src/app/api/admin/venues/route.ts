import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("admin:venues");

// GET /api/admin/venues?status=PENDING|ALL&page=1&limit=20
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    // Admin kontrolü
    const caller = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
    if (!caller?.isAdmin) return NextResponse.json({ error: "Yetki gerekli" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const filterStatus = searchParams.get("status") ?? "PENDING";
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));

    const where = filterStatus === "ALL" ? {} : { isVerified: filterStatus === "APPROVED" };

    const [profiles, total] = await Promise.all([
      prisma.venueProfile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          businessName: true,
          address: true,
          phone: true,
          website: true,
          sports: true,
          isVerified: true,
          verifiedAt: true,
          createdAt: true,
          images: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      }),
      prisma.venueProfile.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: profiles,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    log.error("GET admin/venues error", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

const patchSchema = z.object({
  profileId: z.string().cuid(),
  action: z.enum(["approve", "reject"]),
});

// PATCH /api/admin/venues — Mekan profilini onayla veya reddet
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

    const profile = await prisma.venueProfile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true, businessName: true, isVerified: true },
    });
    if (!profile) return NextResponse.json({ error: "Profil bulunamadı" }, { status: 404 });

    const isApprove = action === "approve";

    const updated = await prisma.venueProfile.update({
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
      type: "VENUE_VERIFIED",
      title: isApprove ? "Mekan Profiliniz Onaylandı 🎉" : "Mekan Profili Güncellemesi",
      body: isApprove
        ? `"${profile.businessName}" mekan profiliniz onaylandı! Artık maçlara 'Kesin Kanıt' onayı verebilirsiniz.`
        : `"${profile.businessName}" mekan profiliniz değerlendirme sürecindedir. Lütfen profil bilgilerinizi eksiksiz doldurun.`,
      link: "/mekan-profil",
    }).catch(() => {});

    log.info(`Venue profile ${action}d`, { profileId, adminId: userId });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    log.error("PATCH admin/venues error", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
