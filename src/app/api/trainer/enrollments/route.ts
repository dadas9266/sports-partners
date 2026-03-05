import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("trainer:enrollments");

const createEnrollmentSchema = z.object({
  studentId: z.string().min(1),
  sportName: z.string().max(100).optional(),
  totalLessons: z.number().int().min(1).max(200).default(1),
  notes: z.string().max(2000).optional(),
});

// GET /api/trainer/enrollments — antrenörün tüm öğrencileri
export async function GET(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? "ACTIVE"; // ACTIVE | COMPLETED | CANCELLED | ALL

    const enrollments = await prisma.trainerEnrollment.findMany({
      where: {
        trainerId: userId,
        ...(status !== "ALL" ? { status: status as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            city: { select: { name: true } },
            sports: { select: { name: true, icon: true } },
          },
        },
        lessons: {
          orderBy: { createdAt: "desc" },
          take: 1, // Son ders için
          select: { scheduledAt: true, status: true },
        },
        _count: { select: { lessons: true } },
      },
    });

    return NextResponse.json({ success: true, data: enrollments });
  } catch (error) {
    log.error("Enrollments GET hatası", error);
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/trainer/enrollments — yeni öğrenci kaydı aç
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    // Trainer profili kontrol
    const trainerProfile = await prisma.trainerProfile.findUnique({ where: { userId } });
    if (!trainerProfile) {
      return NextResponse.json({ success: false, error: "Eğitmen profili bulunamadı" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = createEnrollmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { studentId, sportName, totalLessons, notes } = parsed.data;

    // Öğrencinin var olduğunu kontrol et
    const student = await prisma.user.findUnique({ where: { id: studentId }, select: { id: true, name: true } });
    if (!student) {
      return NextResponse.json({ success: false, error: "Öğrenci bulunamadı" }, { status: 404 });
    }

    // Zaten aktif kayıt var mı?
    const existing = await prisma.trainerEnrollment.findUnique({
      where: { trainerId_studentId: { trainerId: userId, studentId } },
    });
    if (existing) {
      if (existing.status === "ACTIVE") {
        return NextResponse.json({ success: false, error: "Bu öğrencinin zaten aktif kaydı var" }, { status: 400 });
      }
      // Tamamlanmış/iptal edilmiş kayıt varsa, yeni kayıt olarak yeniden oluştur
      await prisma.trainerEnrollment.delete({ where: { id: existing.id } });
    }

    const enrollment = await prisma.trainerEnrollment.create({
      data: {
        trainerId: userId,
        studentId,
        sportName: sportName ?? null,
        totalLessons,
        notes: notes ?? null,
      },
      include: {
        student: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    log.info("Enrollment oluşturuldu", { trainerId: userId, studentId });
    return NextResponse.json({ success: true, data: enrollment }, { status: 201 });
  } catch (error) {
    log.error("Enrollment POST hatası", error);
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
