import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";

const logger = createLogger("community-members");
type Params = { params: Promise<{ id: string }> };

// GET /api/communities/[id]/members
// Admins see PENDING requests; others see only APPROVED members
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    const { id: communityId } = await params;
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "APPROVED";

    let isAdmin = false;
    if (userId) {
      const m = await (prisma as any).communityMembership.findUnique({
        where: { userId_communityId: { userId, communityId } },
        select: { role: true, status: true },
      });
      isAdmin = m?.role === "ADMIN" && m?.status === "APPROVED";
    }

    const where = isAdmin ? { communityId, status } : { communityId, status: "APPROVED" };

    const members = await (prisma as any).communityMembership.findMany({
      where,
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      select: {
        id: true,
        role: true,
        status: true,
        joinedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: members });
  } catch (err) {
    logger.error("GET members error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/communities/[id]/members — Join (veya üyelik talebi oluştur)
export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { id: communityId } = await params;

    const community = await (prisma as any).community.findUnique({
      where: { id: communityId },
      select: { isPrivate: true, creatorId: true, name: true },
    });
    if (!community) return NextResponse.json({ error: "Topluluk bulunamadı" }, { status: 404 });

    const existing = await (prisma as any).communityMembership.findUnique({
      where: { userId_communityId: { userId, communityId } },
    });
    if (existing) {
      if (existing.status === "APPROVED") {
        return NextResponse.json({ error: "Zaten üyesiniz" }, { status: 400 });
      }
      if (existing.status === "PENDING") {
        return NextResponse.json({ error: "Talebiniz inceleniyor" }, { status: 400 });
      }
      // REJECTED — re-apply
      const updated = await (prisma as any).communityMembership.update({
        where: { userId_communityId: { userId, communityId } },
        data: { status: community.isPrivate ? "PENDING" : "APPROVED" },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    const membership = await (prisma as any).communityMembership.create({
      data: {
        userId,
        communityId,
        role: "MEMBER",
        status: community.isPrivate ? "PENDING" : "APPROVED",
      },
    });

    if (community.isPrivate) {
      await createNotification({
        userId: community.creatorId,
        type: "COMMUNITY_JOIN_REQUEST" as any,
        title: "Yeni Üyelik Talebi",
        body: `Topluluk "${community.name}" için yeni üyelik talebi var.`,
        link: `/topluluklar/${communityId}`,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: membership }, { status: 201 });
  } catch (err) {
    logger.error("POST member join error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/communities/[id]/members — Leave community
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { id: communityId } = await params;

    const membership = await (prisma as any).communityMembership.findUnique({
      where: { userId_communityId: { userId, communityId } },
    });
    if (!membership) return NextResponse.json({ error: "Üye değilsiniz" }, { status: 400 });

    if (membership.role === "ADMIN") {
      const adminCount = await (prisma as any).communityMembership.count({
        where: { communityId, role: "ADMIN", status: "APPROVED" },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Ayrılmadan önce başka bir üyeyi admin yapın" },
          { status: 400 }
        );
      }
    }

    await (prisma as any).communityMembership.delete({
      where: { userId_communityId: { userId, communityId } },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("DELETE member leave error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
