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

    if (type !== "TRAINER") {
      return NextResponse.json({ success: false, error: "Geçersiz başvuru tipi" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, userType: true } });
    if (!user) {
      return NextResponse.json({ success: false, error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const { branches, gymName, hourlyRate, experience, certNote, university, department, lessonTypes, providesEquipment } = details;

    // Antrenör profil oluştur — hemen onayla (test modunda admin onayı beklemeden)
    await prisma.trainerProfile.upsert({
      where: { userId },
      create: {
        userId,
        gymName: gymName || null,
        university: university || null,
        department: department || null,
        experienceYears: experience ? parseInt(experience) : null,
        lessonTypes: Array.isArray(lessonTypes) ? lessonTypes : [],
        providesEquipment: typeof providesEquipment === "boolean" ? providesEquipment : null,
        certNote: certNote || null,
        isVerified: true,
      },
      update: {
        gymName: gymName || null,
        university: university || null,
        department: department || null,
        experienceYears: experience ? parseInt(experience) : null,
        lessonTypes: Array.isArray(lessonTypes) ? lessonTypes : [],
        providesEquipment: typeof providesEquipment === "boolean" ? providesEquipment : null,
        certNote: certNote || null,
        isVerified: true,
      },
    });

    // Kullanıcı tipini güncelle
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

    log.info("Antrenör başvurusu otomatik onaylandı", { userId, branches, hourlyRate });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Pro başvuru hatası", error);
    return NextResponse.json({ success: false, error: "Bir hata oluştu" }, { status: 500 });
  }
}
