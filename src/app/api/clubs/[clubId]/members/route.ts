import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("club-members");

// POST /api/clubs/[clubId]/members — Kulübe katıl
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { clubId } = await params;

    const club = await prisma.club.findUnique({
      where: { id: clubId },
      select: { id: true, name: true },
    });

    if (!club) {
      return NextResponse.json({ success: false, error: "Kulüp bulunamadı" }, { status: 404 });
    }

    const membership = await prisma.userClubMembership.create({
      data: { userId, clubId, role: "MEMBER" },
    });

    log.info("Kulübe katılındı", { clubId, userId });
    return NextResponse.json({ success: true, data: membership }, { status: 201 });
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
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { clubId } = await params;

    // Captain ayrılamaz (en az 1 üye kalmalı)
    const membership = await prisma.userClubMembership.findUnique({
      where: { userId_clubId: { userId, clubId } },
    });

    if (!membership) {
      return NextResponse.json({ success: false, error: "Bu kulübün üyesi değilsiniz" }, { status: 404 });
    }

    if (membership.role === "CAPTAIN") {
      return NextResponse.json(
        { success: false, error: "Kaptan olarak kulüpten ayrılamazsınız. Önce başka bir üyeyi kaptan yapın." },
        { status: 400 }
      );
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

// GET /api/clubs/[clubId]/members — Kulüp üyelerini getir
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ clubId: string }> }
) {
  try {
    const { clubId } = await params;

    const members = await prisma.userClubMembership.findMany({
      where: { clubId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, userLevel: true } },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    });

    return NextResponse.json({ success: true, data: members });
  } catch (error) {
    log.error("Üyeler yüklenirken hata", error);
    return NextResponse.json({ success: false, error: "Üyeler yüklenemedi" }, { status: 500 });
  }
}
