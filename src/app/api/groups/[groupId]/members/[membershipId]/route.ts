import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";

const logger = createLogger("group-membership-manage");

type Params = { params: Promise<{ groupId: string; membershipId: string }> };

const patchSchema = z.object({
  action: z.enum(["approve", "reject", "remove", "promote", "demote"]),
});

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { groupId, membershipId } = await params;

    // Verify caller is an APPROVED ADMIN of this group
    const adminMembership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
      select: { role: true, status: true },
    });

    if (!adminMembership || adminMembership.role !== "ADMIN" || adminMembership.status !== "APPROVED") {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gereklidir" }, { status: 403 });
    }

    // Fetch the target membership
    const target = await prisma.groupMembership.findUnique({
      where: { id: membershipId },
      select: { id: true, userId: true, groupId: true, role: true, status: true },
    });

    if (!target || target.groupId !== groupId) {
      return NextResponse.json({ error: "Üyelik bulunamadı" }, { status: 404 });
    }

    // Prevent self-management for destructive actions
    if (target.userId === userId) {
      return NextResponse.json({ error: "Kendi üyeliğinizi bu işlemle değiştiremezsiniz" }, { status: 400 });
    }

    const body = await req.json();
    const parse = patchSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: "Geçersiz işlem", details: parse.error.flatten() }, { status: 400 });
    }

    const { action } = parse.data;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true },
    });
    const groupName = group?.name ?? "Grup";

    switch (action) {
      case "approve": {
        if (target.status !== "PENDING") {
          return NextResponse.json({ error: "Bu talep beklemede değil" }, { status: 400 });
        }
        await prisma.groupMembership.update({
          where: { id: membershipId },
          data: { status: "APPROVED" },
        });
        await createNotification({
          userId: target.userId,
          type: "MATCH_STATUS_CHANGED",
          title: "Üyelik Talebiniz Onaylandı",
          body: `"${groupName}" grubuna üyeliğiniz kabul edildi.`,
          link: `/gruplar/${groupId}`,
        });
        logger.info("Group membership approved", { membershipId, groupId, approvedBy: userId });
        return NextResponse.json({ success: true, message: "Üyelik onaylandı" });
      }

      case "reject": {
        if (target.status !== "PENDING") {
          return NextResponse.json({ error: "Bu talep beklemede değil" }, { status: 400 });
        }
        await prisma.groupMembership.delete({ where: { id: membershipId } });
        await createNotification({
          userId: target.userId,
          type: "MATCH_STATUS_CHANGED",
          title: "Üyelik Talebiniz Reddedildi",
          body: `"${groupName}" grubuna üyelik talebiniz reddedildi.`,
          link: `/gruplar`,
        });
        logger.info("Group membership rejected", { membershipId, groupId, rejectedBy: userId });
        return NextResponse.json({ success: true, message: "Talep reddedildi" });
      }

      case "remove": {
        if (target.status !== "APPROVED") {
          return NextResponse.json({ error: "Yalnızca onaylı üyeler çıkarılabilir" }, { status: 400 });
        }
        if (target.role === "ADMIN") {
          return NextResponse.json({ error: "Yönetici önce üyeliğe düşürülmelidir" }, { status: 400 });
        }
        await prisma.groupMembership.delete({ where: { id: membershipId } });
        await createNotification({
          userId: target.userId,
          type: "MATCH_STATUS_CHANGED",
          title: "Gruptan Çıkarıldınız",
          body: `"${groupName}" grubundan çıkarıldınız.`,
          link: `/gruplar`,
        });
        logger.info("Group member removed", { membershipId, groupId, removedBy: userId });
        return NextResponse.json({ success: true, message: "Üye gruptan çıkarıldı" });
      }

      case "promote": {
        if (target.status !== "APPROVED" || target.role !== "MEMBER") {
          return NextResponse.json({ error: "Yalnızca onaylı üyeler yönetici yapılabilir" }, { status: 400 });
        }
        await prisma.groupMembership.update({
          where: { id: membershipId },
          data: { role: "ADMIN" },
        });
        await createNotification({
          userId: target.userId,
          type: "STREAK_MILESTONE",
          title: "Yönetici Yapıldınız",
          body: `"${groupName}" grubunda yönetici oldunuz.`,
          link: `/gruplar/${groupId}`,
        });
        logger.info("Group member promoted", { membershipId, groupId, promotedBy: userId });
        return NextResponse.json({ success: true, message: "Üye yönetici yapıldı" });
      }

      case "demote": {
        if (target.role !== "ADMIN") {
          return NextResponse.json({ error: "Bu üye zaten yönetici değil" }, { status: 400 });
        }
        await prisma.groupMembership.update({
          where: { id: membershipId },
          data: { role: "MEMBER" },
        });
        await createNotification({
          userId: target.userId,
          type: "MATCH_STATUS_CHANGED",
          title: "Yöneticilik Kaldırıldı",
          body: `"${groupName}" grubundaki yöneticiliğiniz kaldırıldı.`,
          link: `/gruplar/${groupId}`,
        });
        logger.info("Group admin demoted", { membershipId, groupId, demotedBy: userId });
        return NextResponse.json({ success: true, message: "Yönetici üyeliğe düşürüldü" });
      }

      default:
        return NextResponse.json({ error: "Bilinmeyen işlem" }, { status: 400 });
    }
  } catch (err) {
    logger.error("PATCH group membership error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
