import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";
import { membershipActionSchema, handleMemberAction } from "@/lib/membership-utils";
import type { GroupMemberRole } from "@prisma/client";

const logger = createLogger("group-membership-manage");
type Params = { params: Promise<{ groupId: string; membershipId: string }> };

/** PATCH /api/groups/[groupId]/members/[membershipId] — Admin-only actions */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { groupId, membershipId } = await params;

    const adminMembership = await prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
      select: { role: true, status: true },
    });
    if (!adminMembership || adminMembership.role !== "ADMIN" || adminMembership.status !== "APPROVED") {
      return NextResponse.json({ error: "Bu işlem için yönetici yetkisi gereklidir" }, { status: 403 });
    }

    const target = await prisma.groupMembership.findUnique({
      where: { id: membershipId },
      select: { id: true, userId: true, groupId: true, role: true, status: true },
    });
    if (!target || target.groupId !== groupId) {
      return NextResponse.json({ error: "Üyelik bulunamadı" }, { status: 404 });
    }
    if (target.userId === userId) {
      return NextResponse.json({ error: "Kendi üyliğinizi bu işlemle değiştiremezsiniz" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = membershipActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Geçersiz işlem", details: parsed.error.flatten() }, { status: 400 });
    }
    const { action } = parsed.data;

    // Extra group guard: can't directly remove an ADMIN — demote first
    if (action === "remove" && target.role === "ADMIN") {
      return NextResponse.json({ error: "Yönetici önce üyeliğe düşürülmelidir" }, { status: 400 });
    }

    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
    const groupName = group?.name ?? "Grup";

    const result = await handleMemberAction({
      target,
      callerUserId: userId,
      action,
      adminRole: "ADMIN",
      entityName: groupName,
      entityLink: `/gruplar/${groupId}`,
      onUpdate: async (id, data) => {
        await prisma.groupMembership.update({
          where: { id },
          data: {
            ...(data.status !== undefined && { status: data.status }),
            ...(data.role !== undefined && { role: data.role as GroupMemberRole }),
          },
        });
      },
      onDelete: async (id) => { await prisma.groupMembership.delete({ where: { id } }); },
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    if (action === "promote") {
      await createNotification({
        userId: target.userId,
        type: "STREAK_MILESTONE",
        title: "Yönetici Yapıldınız",
        body: `"${groupName}" grubunda yönetici oldunuz.`,
        link: `/gruplar/${groupId}`,
      }).catch(() => {});
    }

    logger.info("Group member action", { action, membershipId, groupId, by: userId });
    return NextResponse.json({ success: true, message: result.message });
  } catch (err) {
    logger.error("PATCH group membership error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

