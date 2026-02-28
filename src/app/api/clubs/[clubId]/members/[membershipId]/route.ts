import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createNotification } from "@/lib/notifications";
import { createLogger } from "@/lib/logger";

const log = createLogger("club-member-manage");

type Params = { params: Promise<{ clubId: string; membershipId: string }> };

const actionSchema = z.object({
  action: z.enum(["approve", "reject", "remove", "promote", "demote"]),
});

/**
 * PATCH /api/clubs/[clubId]/members/[membershipId]
 * Captain only actions:
 *   approve  — PENDING → APPROVED (üyeye bildir)
 *   reject   — PENDING → REJECTED, kaydı sil (üyeye bildir)
 *   remove   — APPROVED üyeyi kulüpten çıkar
 *   promote  — MEMBER → CAPTAIN
 *   demote   — CAPTAIN → MEMBER
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { clubId, membershipId } = await params;

    // İşlemi yapan kişinin CAPTAIN olup olmadığını doğrula
    const myMembership = await prisma.userClubMembership.findUnique({
      where: { userId_clubId: { userId: currentUserId, clubId } },
      select: { role: true, status: true },
    });
    if (!myMembership || myMembership.role !== "CAPTAIN" || myMembership.status !== "APPROVED") {
      return NextResponse.json({ success: false, error: "Bu işlem için kaptan yetkisi gerekiyor" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
    }
    const { action } = parsed.data;

    // Hedef üyeliği getir
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

    // Kaptanın kendi kendine işlem yapmasını engelle (promote/demote hariç özel durum)
    if (target.userId === currentUserId && ["remove", "demote"].includes(action)) {
      return NextResponse.json({ success: false, error: "Kendinizi bu şekilde düzenleyemezsiniz" }, { status: 400 });
    }

    switch (action) {
      case "approve": {
        if (target.status !== "PENDING") {
          return NextResponse.json({ success: false, error: "Bu üyelik zaten işlendi" }, { status: 400 });
        }
        await prisma.userClubMembership.update({
          where: { id: membershipId },
          data: { status: "APPROVED" },
        });
        await createNotification({
          userId: target.userId,
          type: "MATCH_STATUS_CHANGED",
          title: "Üyelik Talebiniz Onaylandı",
          body: `"${target.club.name}" kulübüne üyeliğiniz onaylandı!`,
          link: `/kulupler`,
        });
        log.info("Kulüp üyelik talebi onaylandı", { membershipId, clubId });
        return NextResponse.json({ success: true, message: "Üyelik onaylandı" });
      }

      case "reject": {
        if (target.status !== "PENDING") {
          return NextResponse.json({ success: false, error: "Bu üyelik zaten işlendi" }, { status: 400 });
        }
        await prisma.userClubMembership.delete({ where: { id: membershipId } });
        await createNotification({
          userId: target.userId,
          type: "MATCH_STATUS_CHANGED",
          title: "Üyelik Talebiniz Reddedildi",
          body: `"${target.club.name}" kulübüne üyelik talebiniz kaptan tarafından reddedildi.`,
          link: `/kulupler`,
        });
        log.info("Kulüp üyelik talebi reddedildi", { membershipId, clubId });
        return NextResponse.json({ success: true, message: "Üyelik reddedildi" });
      }

      case "remove": {
        if (target.role === "CAPTAIN") {
          return NextResponse.json({ success: false, error: "Bir kaptanı doğrudan çıkaramazsınız. Önce derecesini düşürün." }, { status: 400 });
        }
        await prisma.userClubMembership.delete({ where: { id: membershipId } });
        await createNotification({
          userId: target.userId,
          type: "MATCH_STATUS_CHANGED",
          title: "Kulüpten Çıkarıldınız",
          body: `"${target.club.name}" kulübünden kaptan tarafından çıkarıldınız.`,
          link: `/kulupler`,
        });
        log.info("Üye kulüpten çıkarıldı", { membershipId, clubId });
        return NextResponse.json({ success: true, message: "Üye çıkarıldı" });
      }

      case "promote": {
        await prisma.userClubMembership.update({
          where: { id: membershipId },
          data: { role: "CAPTAIN" },
        });
        await createNotification({
          userId: target.userId,
          type: "STREAK_MILESTONE",
          title: "Kaptan Oldunuz! 🎖️",
          body: `"${target.club.name}" kulübünde kaptan olarak atandınız.`,
          link: `/kulup-yonet/${clubId}`,
        });
        log.info("Üye kaptana terfi ettirildi", { membershipId, clubId });
        return NextResponse.json({ success: true, message: `${target.user.name} kaptan yapıldı` });
      }

      case "demote": {
        if (target.role !== "CAPTAIN") {
          return NextResponse.json({ success: false, error: "Bu üye zaten kaptan değil" }, { status: 400 });
        }
        await prisma.userClubMembership.update({
          where: { id: membershipId },
          data: { role: "MEMBER" },
        });
        await createNotification({
          userId: target.userId,
          type: "MATCH_STATUS_CHANGED",
          title: "Kaptan Rolünüz Değiştirildi",
          body: `"${target.club.name}" kulübündeki kaptan rolünüz kaldırıldı.`,
          link: `/kulupler`,
        });
        log.info("Kaptan üyeye indirildi", { membershipId, clubId });
        return NextResponse.json({ success: true, message: `${target.user.name} üye yapıldı` });
      }

      default:
        return NextResponse.json({ success: false, error: "Geçersiz işlem" }, { status: 400 });
    }
  } catch (error) {
    log.error("Üye yönetimi hatası", error);
    return NextResponse.json({ success: false, error: "İşlem gerçekleştirilemedi" }, { status: 500 });
  }
}
