import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";
import { membershipActionSchema, handleMemberAction } from "@/lib/membership-utils";

const log = createLogger("club-member-manage");
type Params = { params: Promise<{ clubId: string; membershipId: string }> };

/**
 * PATCH /api/clubs/[clubId]/members/[membershipId]
 * Captain-only: approve | reject | remove | promote | demote
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { clubId, membershipId } = await params;

    const myMembership = await prisma.userClubMembership.findUnique({
      where: { userId_clubId: { userId: currentUserId, clubId } },
      select: { role: true, status: true },
    });
    if (!myMembership || myMembership.role !== "CAPTAIN" || myMembership.status !== "APPROVED") {
      return NextResponse.json({ success: false, error: "Bu işlem için kaptan yetkisi gerekiyor" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = membershipActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
    }
    const { action } = parsed.data;

    const target = await prisma.userClubMembership.findUnique({
      where: { id: membershipId },
      include: {
        user: { select: { id: true, name: true } },
        club: { select: { name: true } },
      },
    });
    if (!target || target.clubId !== clubId) {
      return NextResponse.json({ success: false, error: "Üyelik bulunamadı" }, { status: 404 });
    }

    // Extra club guard: can't directly remove a captain — demote first
    if (action === "remove" && target.role === "CAPTAIN") {
      return NextResponse.json(
        { success: false, error: "Bir kaptanı doğrudan çıkaramazsınız. Önce derecesini düşürün." },
        { status: 400 },
      );
    }

    const result = await handleMemberAction({
      target: { id: target.id, userId: target.userId, role: target.role, status: target.status },
      callerUserId: currentUserId,
      action,
      adminRole: "CAPTAIN",
      entityName: target.club.name,
      entityLink: `/kulupler`,
      onUpdate: async (id, data) => { await prisma.userClubMembership.update({ where: { id }, data }); },
      onDelete: async (id) => { await prisma.userClubMembership.delete({ where: { id } }); },
    });

    if ("error" in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    // Extra promotion notification (capacity change deserves a distinct message)
    if (action === "promote") {
      await createNotification({
        userId: target.userId,
        type: "STREAK_MILESTONE",
        title: "Kaptan Oldunuz! 🎖️",
        body: `"${target.club.name}" kulübünde kaptan olarak atandınız.`,
        link: `/kulup-yonet/${clubId}`,
      }).catch(() => {});
    }

    log.info("Club member action", { action, membershipId, clubId });
    return NextResponse.json({ success: true, message: result.message });
  } catch (error) {
    log.error("Üye yönetimi hatası", error);
    return NextResponse.json({ success: false, error: "İşlem gerçekleştirilemedi" }, { status: 500 });
  }
}

