import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";

const logger = createLogger("group-members");

type Params = { params: Promise<{ groupId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    const { groupId } = await params;
    const statusFilter = req.nextUrl.searchParams.get("status") ?? "APPROVED";

    // Only group ADMIN can see PENDING or ALL
    let effectiveStatus = "APPROVED";
    if (statusFilter !== "APPROVED" && userId) {
      const myMembership = await prisma.groupMembership.findUnique({
        where: { userId_groupId: { userId, groupId } },
        select: { role: true, status: true },
      });
      if (myMembership?.role === "ADMIN" && myMembership.status === "APPROVED") {
        effectiveStatus = statusFilter;
      }
    }

    const whereStatus =
      effectiveStatus === "ALL" ? {} : { status: effectiveStatus };

    const members = await prisma.groupMembership.findMany({
      where: { groupId, ...whereStatus },
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
            totalMatches: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    return NextResponse.json({ success: true, members });
  } catch (err) {
    logger.error("GET group members error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { groupId } = await params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { id: true, name: true, isPublic: true, creatorId: true },
    });

    if (!group) return NextResponse.json({ error: "Grup bulunamadı" }, { status: 404 });

    // Check for existing membership (any status)
    const existing = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
      select: { status: true },
    });
    if (existing) {
      if (existing.status === "PENDING") {
        return NextResponse.json({ error: "Üyelik talebiniz zaten beklemede" }, { status: 409 });
      }
      return NextResponse.json({ error: "Zaten bu grubun üyesisiniz" }, { status: 409 });
    }

    const isPending = !group.isPublic;
    const status = isPending ? "PENDING" : "APPROVED";

    await prisma.groupMembership.create({
      data: { userId, groupId, role: "MEMBER", status },
    });

    const joiner = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });

    if (isPending) {
      // Notify group ADMIN about new pending request
      const admin = await prisma.groupMembership.findFirst({
        where: { groupId, role: "ADMIN", status: "APPROVED" },
        select: { userId: true },
      });
      if (admin && admin.userId !== userId) {
        await createNotification({
          userId: admin.userId,
          type: "NEW_FOLLOWER",
          title: "Yeni Üyelik Talebi",
          body: `${joiner?.name} "${group.name}" grubuna katılmak istiyor.`,
          link: `/grup-yonet/${groupId}`,
        });
      }
      logger.info("Group join request pending", { userId, groupId });
      return NextResponse.json({ success: true, message: "Üyelik talebiniz gönderildi. Yönetici onayı bekleniyor." }, { status: 201 });
    }

    // Public group — notify admin of new member
    if (group.creatorId !== userId) {
      await createNotification({
        userId: group.creatorId,
        type: "NEW_FOLLOWER",
        title: "Yeni Grup Üyesi",
        body: `${joiner?.name} "${group.name}" grubuna katıldı.`,
        link: `/gruplar/${groupId}`,
      });
    }

    logger.info("User joined group", { userId, groupId });
    return NextResponse.json({ success: true, message: "Gruba katıldınız" }, { status: 201 });
  } catch (err) {
    logger.error("POST group join error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { groupId } = await params;

    const membership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership) return NextResponse.json({ error: "Bu grubun üyesi değilsiniz" }, { status: 404 });

    if (membership.role === "ADMIN") {
      // Must have another ADMIN before leaving
      const otherAdmin = await prisma.groupMembership.findFirst({
        where: { groupId, role: "ADMIN", status: "APPROVED", userId: { not: userId } },
      });
      if (!otherAdmin) {
        const otherMember = await prisma.groupMembership.findFirst({
          where: { groupId, userId: { not: userId } },
        });
        if (otherMember) {
          return NextResponse.json(
            { error: "Gruptan ayrılmadan önce başka bir üyeyi yönetici yapın veya grubu silin" },
            { status: 400 }
          );
        }
        // Last member = delete group entirely
        await prisma.group.delete({ where: { id: groupId } });
        return NextResponse.json({ success: true, message: "Grup silindi (son üyeydiniz)" });
      }
    }

    await prisma.groupMembership.delete({
      where: { userId_groupId: { userId, groupId } },
    });

    logger.info("User left group", { userId, groupId });
    return NextResponse.json({ success: true, message: "Gruptan ayrıldınız" });
  } catch (err) {
    logger.error("DELETE group leave error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
