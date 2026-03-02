import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

const log = createLogger("profile:pro-request");

export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const body = await request.json();
    const { type, ...details } = body;

    if (!["TRAINER", "VENUE"].includes(type)) {
      return NextResponse.json({ success: false, error: "Geçersiz başvuru tipi" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, userType: true } });
    if (!user) {
      return NextResponse.json({ success: false, error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    if (type === "TRAINER") {
      const { branches, gymName, hourlyRate, experience, certNote } = details;

      // Antrenör profil oluştur — hemen onayla (test modunda admin onayı beklemeden)
      await prisma.trainerProfile.upsert({
        where: { userId },
        create: {
          userId,
          gymName: gymName || null,
          isVerified: true,
        },
        update: {
          gymName: gymName || null,
          isVerified: true,
        },
      });

      // Kullanıcı tipini güncelle — zaten VENUE ise değiştirme (dual rol)
      if (user.userType === "INDIVIDUAL") {
        await prisma.user.update({
          where: { id: userId },
          data: { userType: "TRAINER" },
        });
      }

      // Kullanıcıya başarı bildirimi
      await createNotification({
        userId,
        type: "TRAINER_VERIFIED",
        title: "✅ Antrenör Hesabınız Aktif!",
        body: "Tebrikler! Antrenör profiliniz onaylandı ve hesabınız aktif edildi.",
      });

      log.info("Antrenör başvurusu otomatik onaylandı", { userId, branches });
    } else {
      // VENUE
      const { businessName, businessAddress, businessPhone, businessWebsite, capacity, facilityNote } = details;

      if (!businessName?.trim() || !businessAddress?.trim()) {
        return NextResponse.json({ success: false, error: "Tesis adı ve adresi zorunludur" }, { status: 400 });
      }

      // VenueProfile oluştur — hemen onayla
      await prisma.venueProfile.upsert({
        where: { userId },
        create: {
          userId,
          businessName,
          address: businessAddress || null,
          phone: businessPhone || null,
          website: businessWebsite || null,
          capacity: capacity ? parseInt(capacity) : null,
          isVerified: true,
        },
        update: {
          businessName,
          address: businessAddress || null,
          phone: businessPhone || null,
          website: businessWebsite || null,
          capacity: capacity ? parseInt(capacity) : null,
          isVerified: true,
        },
      });

      // Kullanıcı tipini güncelle — zaten TRAINER ise değiştirme (dual rol)
      if (user.userType === "INDIVIDUAL") {
        await prisma.user.update({
          where: { id: userId },
          data: { userType: "VENUE" },
        });
      }

      await createNotification({
        userId,
        type: "VENUE_VERIFIED",
        title: "✅ Tesis Hesabınız Aktif!",
        body: "Tebrikler! Tesis profiliniz onaylandı ve hesabınız aktif edildi.",
      });

      log.info("Tesis başvurusu otomatik onaylandı", { userId, businessName });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Pro başvuru hatası", error);
    return NextResponse.json({ success: false, error: "Bir hata oluştu" }, { status: 500 });
  }
}
