import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";

const logger = createLogger("community-membership");
type Params = { params: Promise<{ id: string; membershipId: string }> };

const patchSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]).optional(),
  role: z.enum(["MEMBER", "ADMIN"]).optional(),
});

// PATCH /api/communities/[id]/members/[membershipId]
// — Approve/reject join request or change role (admin only)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { id: communityId, membershipId } = await params;

    // Verify caller is an approved admin
    const caller = await (prisma as any).communityMembership.findUnique({
      where: { userId_communityId: { userId, communityId } },
      select: { role: true, status: true },
    });
    if (!caller || caller.role !== "ADMIN" || caller.status !== "APPROVED") {
      return NextResponse.json({ error: "Yetki gerekli" }, { status: 403 });
    }

    const target = await (prisma as any).communityMembership.findUnique({
      where: { id: membershipId, communityId },
      select: { id: true, userId: true, status: true, role: true },
    });
    if (!target) return NextResponse.json({ error: "Üyelik bulunamadı" }, { status: 404 });

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });

    const { status, role } = parsed.data;
    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (role !== undefined) data.role = role;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Güncelleme alanı yok" }, { status: 400 });
    }

    const updated = await (prisma as any).communityMembership.update({
      where: { id: membershipId },
      data,
      select: {
        id: true,
        role: true,
        status: true,
        userId: true,
        communityId: true,
      },
    });

    // Notify the affected user
    const community = await (prisma as any).community.findUnique({
      where: { id: communityId },
      select: { name: true },
    });

    if (community) {
      let bodyText = "";
      if (status === "APPROVED") bodyText = `"${community.name}" topluluğuna katılım isteğiniz onaylandı.`;
      else if (status === "REJECTED") bodyText = `"${community.name}" topluluğuna katılım isteğiniz reddedildi.`;
      else if (role === "ADMIN") bodyText = `"${community.name}" topluluğunda admin yapıldınız.`;
      else if (role === "MEMBER") bodyText = `"${community.name}" topluluğundaki admin rolünüz kaldırıldı.`;

      if (bodyText) {
        await createNotification({
          userId: target.userId,
          type: "COMMUNITY_UPDATE" as any,
          title: "Topluluk Güncellemesi",
          body: bodyText,
          link: `/topluluklar/${communityId}`,
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    logger.error("PATCH membership error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// DELETE /api/communities/[id]/members/[membershipId] — Remove a member (admin only)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const { id: communityId, membershipId } = await params;

    const caller = await (prisma as any).communityMembership.findUnique({
      where: { userId_communityId: { userId, communityId } },
      select: { role: true, status: true },
    });
    if (!caller || caller.role !== "ADMIN" || caller.status !== "APPROVED") {
      return NextResponse.json({ error: "Yetki gerekli" }, { status: 403 });
    }

    const target = await (prisma as any).communityMembership.findUnique({
      where: { id: membershipId, communityId },
      select: { id: true, userId: true },
    });
    if (!target) return NextResponse.json({ error: "Üyelik bulunamadı" }, { status: 404 });

    // Admin cannot remove themselves via this endpoint (use DELETE /members for self-leave)
    if (target.userId === userId) {
      return NextResponse.json({ error: "Kendinizi bu yoldan çıkaramazsınız" }, { status: 400 });
    }

    await (prisma as any).communityMembership.delete({ where: { id: membershipId } });

    const community = await (prisma as any).community.findUnique({
      where: { id: communityId },
      select: { name: true },
    });
    if (community) {
      await createNotification({
        userId: target.userId,
        type: "COMMUNITY_UPDATE" as any,
        title: "Topluluk Güncellemesi",
        body: `"${community.name}" topluluğundan çıkarıldınız.`,
        link: `/topluluklar/${communityId}`,
      }).catch(() => {});
    }

    logger.info("Member removed", { membershipId, communityId, byUserId: userId });
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("DELETE membership error", { err });
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
