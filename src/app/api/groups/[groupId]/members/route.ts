import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";

const logger = createLogger("group-members");

type Params = { params: Promise<{ groupId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { groupId } = await params;

    const members = await prisma.groupMembership.findMany({
      where: { groupId },
      select: {
        id: true,
        role: true,
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
    if (!group.isPublic) {
      return NextResponse.json({ error: "Bu gruba katılmak için davet gereklidir" }, { status: 403 });
    }

    await prisma.groupMembership.create({
      data: { userId, groupId, role: "MEMBER" },
    });

    // Notify group creator
    if (group.creatorId !== userId) {
      const joiner = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      await createNotification({
        userId: group.creatorId,
        type: "NEW_FOLLOWER", // group join notification
        title: "Yeni Grup Üyesi",
        body: `${joiner?.name} "${group.name}" grubuna katıldı.`,
        link: `/gruplar/${groupId}`,
      });
    }

    logger.info("User joined group", { userId, groupId });
    return NextResponse.json({ success: true, message: "Gruba katıldınız" }, { status: 201 });
  } catch (err: unknown) {
    const pErr = err as { code?: string };
    if (pErr.code === "P2002") {
      return NextResponse.json({ error: "Zaten bu grubun üyesisiniz" }, { status: 409 });
    }
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
      // Check if there are other members
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
