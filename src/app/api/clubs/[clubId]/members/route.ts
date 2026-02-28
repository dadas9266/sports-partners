import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";

const log = createLogger("club-members");

type Params = { params: Promise<{ clubId: string }> };

// POST /api/clubs/[clubId]/members — Kulübe katılma talebi gönder
export async function POST(
  _request: Request,
  { params }: Params
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { clubId } = await params;

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, name: true, isPrivate: true, creatorId: true },
    });

    if (!club) {
      return NextResponse.json({ success: false, error: "Kulüp bulunamadı" }, { status: 404 });
    }

    // Zaten üye mi / bekleyen talep var mı?
    const existing = await prisma.userClubMembership.findUnique({
      where: { userId_clubId: { userId, clubId } },
    });
    if (existing) {
      const msg =
        existing.status === "PENDING"
          ? "Zaten bir katılma talebiniz bekliyor"
          : "Bu kulübe zaten üyesiniz";
      return NextResponse.json({ success: false, error: msg }, { status: 409 });
    }

    // Özel kulüp → PENDING, herkese açık → APPROVED
    const status = club.isPrivate ? "PENDING" : "APPROVED";

    const membership = await prisma.userClubMembership.create({
      data: { userId, clubId, role: "MEMBER", status },
    });

    if (status === "PENDING") {
      // Kaptana bildirim gönder
      const captain = await prisma.userClubMembership.findFirst({
        where: { clubId, role: "CAPTAIN", status: "APPROVED" },
        select: { userId: true },
      });
      const requester = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      if (captain) {
        await createNotification({
          userId: captain.userId,
          type: "NEW_FOLLOWER",
          title: "Yeni Üyelik Talebi",
          body: `${requester?.name} "${club.name}" kulübüne katılmak istiyor.`,
          link: `/kulup-yonet/${clubId}`,
        });
      }
      log.info("Kulüp katılma talebi oluşturuldu", { clubId, userId });
      return NextResponse.json({
        success: true,
        pending: true,
        message: "Katılma talebiniz gönderildi. Kaptan onayı bekleniyor.",
        data: membership,
      }, { status: 201 });
    }

    log.info("Kulübe katılındı", { clubId, userId });
    return NextResponse.json({ success: true, pending: false, data: membership }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, error: "Bu kulübe zaten üyesiniz" }, { status: 409 });
    }
    log.error("Kulübe katılma hatası", error);
    return NextResponse.json({ success: false, error: "Kulübe katılınamadı" }, { status: 500 });
  }
}

// DELETE /api/clubs/[clubId]/members — Kulüpten ayrıl
export async function DELETE(
  _request: Request,
  { params }: Params
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { clubId } = await params;

    const membership = await prisma.userClubMembership.findUnique({
      where: { userId_clubId: { userId, clubId } },
    });

    if (!membership) {
      return NextResponse.json({ success: false, error: "Bu kulübün üyesi değilsiniz" }, { status: 404 });
    }

    if (membership.role === "CAPTAIN") {
      const otherCaptain = await prisma.userClubMembership.findFirst({
        where: { clubId, role: "CAPTAIN", status: "APPROVED", userId: { not: userId } },
      });
      if (!otherCaptain) {
        return NextResponse.json(
          { success: false, error: "Kulüpten ayrılmadan önce başka bir üyeyi kaptan yapın." },
          { status: 400 }
        );
      }
    }

    await prisma.userClubMembership.delete({
      where: { userId_clubId: { userId, clubId } },
    });

    log.info("Kulüpten ayrılındı", { clubId, userId });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Kulüpten ayrılma hatası", error);
    return NextResponse.json({ success: false, error: "Kulüpten ayrılınamadı" }, { status: 500 });
  }
}

// GET /api/clubs/[clubId]/members
// ?status=APPROVED (default) | PENDING | ALL — captain sees pending requests
export async function GET(
  req: Request,
  { params }: Params
) {
  try {
    const { clubId } = await params;
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") ?? "APPROVED";

    const currentUserId = await getCurrentUserId();

    let whereStatus: string | undefined = "APPROVED";
    if (statusFilter !== "APPROVED" && currentUserId) {
      const myMembership = await prisma.userClubMembership.findUnique({
        where: { userId_clubId: { userId: currentUserId, clubId } },
        select: { role: true },
      });
      if (myMembership?.role === "CAPTAIN") {
        whereStatus = statusFilter === "ALL" ? undefined : statusFilter;
      }
    }

    const members = await prisma.userClubMembership.findMany({
      where: {
        clubId,
        ...(whereStatus ? { status: whereStatus } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            userLevel: true,
            city: { select: { name: true } },
          },
        },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    log.error("Üyeler yüklenirken hata", error);
    return NextResponse.json({ success: false, error: "Üyeler yüklenemedi" }, { status: 500 });
  }
}
