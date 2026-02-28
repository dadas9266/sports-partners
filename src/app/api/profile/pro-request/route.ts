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

      // Antrenör profil stub oluştur (varsa güncelle)
      await prisma.trainerProfile.upsert({
        where: { userId },
        create: {
          userId,
          gymName: gymName || null,
          isVerified: false,
        },
        update: {
          gymName: gymName || null,
        },
      });

      // Kullanıcıya bildirim
      await createNotification({
        userId,
        type: "TRAINER_VERIFIED",
        title: "Antrenör Başvurusu Alındı",
        body: "Antrenör başvurunuz incelemeye alındı. 1-3 iş günü içinde size bildirim gönderilecek.",
      });

      // Admin kullanıcılara bildirim
      const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } });
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: "TRAINER_VERIFIED",
          title: "Yeni Antrenör Başvurusu",
          body: `${user.name} antrenör başvurusunda bulundu. Branşlar: ${(branches || []).join(", ")}`,
        });
      }

      log.info("Antrenör başvurusu alındı", { userId, branches });
    } else {
      // VENUE
      const { businessName, businessAddress, businessPhone, businessWebsite, capacity, facilityNote } = details;

      if (!businessName?.trim() || !businessAddress?.trim()) {
        return NextResponse.json({ success: false, error: "Tesis adı ve adresi zorunludur" }, { status: 400 });
      }

      // VenueProfile stub oluştur
      await prisma.venueProfile.upsert({
        where: { userId },
        create: {
          userId,
          businessName,
          address: businessAddress || null,
          phone: businessPhone || null,
          website: businessWebsite || null,
          capacity: capacity ? parseInt(capacity) : null,
        },
        update: {
          businessName,
          address: businessAddress || null,
          phone: businessPhone || null,
          website: businessWebsite || null,
          capacity: capacity ? parseInt(capacity) : null,
        },
      });

      await createNotification({
        userId,
        type: "VENUE_VERIFIED",
        title: "Tesis Başvurusu Alındı",
        body: "Tesis başvurunuz incelemeye alındı. 1-3 iş günü içinde size bildirim gönderilecek.",
      });

      const admins = await prisma.user.findMany({ where: { isAdmin: true }, select: { id: true } });
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          type: "VENUE_VERIFIED",
          title: "Yeni Tesis Başvurusu",
          body: `${user.name} — ${businessName} tesis başvurusunda bulundu.`,
        });
      }

      log.info("Tesis başvurusu alındı", { userId, businessName });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Pro başvuru hatası", error);
    return NextResponse.json({ success: false, error: "Bir hata oluştu" }, { status: 500 });
  }
}
