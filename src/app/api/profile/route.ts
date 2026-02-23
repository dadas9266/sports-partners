import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { updateProfileSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import bcrypt from "bcryptjs";

const log = createLogger("profile");

// Mevcut kullanıcının profil bilgileri
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const [user, myListings, myResponses, myMatches] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, phone: true, createdAt: true },
      }),
      prisma.listing.findMany({
        where: { userId },
        include: {
          sport: true,
          district: { include: { city: true } },
          venue: true,
          responses: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: "desc" },
          },
          match: {
            include: {
              user2: { select: { id: true, name: true, phone: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.response.findMany({
        where: { userId },
        include: {
          listing: {
            include: {
              sport: true,
              user: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.match.findMany({
        where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
        include: {
          listing: { include: { sport: true, venue: true } },
          user1: { select: { id: true, name: true, phone: true, email: true } },
          user2: { select: { id: true, name: true, phone: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { user, myListings, myResponses, myMatches },
    });
  } catch (error) {
    log.error("Profil yüklenirken hata", error);
    return NextResponse.json(
      { success: false, error: "Profil yüklenemedi" },
      { status: 500 }
    );
  }
}

// Profil güncelle
export async function PUT(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;

    // Şifre değiştirme
    if (parsed.data.newPassword && parsed.data.currentPassword) {
      // Rate limit for password change attempts
      const rateCheck = checkRateLimit(userId, "auth");
      if (!rateCheck.allowed) {
        return NextResponse.json(
          { success: false, error: "Çok fazla deneme. Lütfen bekleyin." },
          { status: 429 }
        );
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json(
          { success: false, error: "Kullanıcı bulunamadı" },
          { status: 404 }
        );
      }

      const isValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Mevcut şifre hatalı" },
          { status: 400 }
        );
      }

      updateData.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: "Güncellenecek bir alan bulunamadı" },
        { status: 400 }
      );
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true },
    });

    log.info("Profil güncellendi", { userId });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    log.error("Profil güncellenirken hata", error);
    return NextResponse.json(
      { success: false, error: "Profil güncellenemedi" },
      { status: 500 }
    );
  }
}
