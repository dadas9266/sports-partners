import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, isValidId, notFound, unauthorized } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("trainer:lessons");

const createLessonSchema = z.object({
  enrollmentId: z.string().min(1),
  scheduledAt: z.string().datetime().optional().nullable(),
  trainerNotes: z.string().max(3000).optional().nullable(),
  homeworkText: z.string().max(3000).optional().nullable(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).default("SCHEDULED"),
});

const updateLessonSchema = createLessonSchema.partial().omit({ enrollmentId: true }).extend({
  completedAt: z.string().datetime().optional().nullable(),
});

// POST /api/trainer/lessons — yeni ders ekle
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    const body = await req.json();
    const parsed = createLessonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const enrollment = await prisma.trainerEnrollment.findUnique({
      where: { id: parsed.data.enrollmentId },
    });
    if (!enrollment) return notFound("Kayıt bulunamadı");
    if (enrollment.trainerId !== userId) {
      return NextResponse.json({ success: false, error: "Sadece antrenör ders ekleyebilir" }, { status: 403 });
    }

    const lesson = await prisma.trainerLesson.create({
      data: {
        enrollmentId: parsed.data.enrollmentId,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        trainerNotes: parsed.data.trainerNotes ?? null,
        homeworkText: parsed.data.homeworkText ?? null,
        status: (parsed.data.status as any) ?? "SCHEDULED",
      },
    });

    // COMPLETED ise usedLessons artır
    if (lesson.status === "COMPLETED") {
      await prisma.trainerEnrollment.update({
        where: { id: enrollment.id },
        data: { usedLessons: { increment: 1 } },
      });
    }

    log.info("Ders eklendi", { enrollmentId: enrollment.id, trainerId: userId });
    return NextResponse.json({ success: true, data: lesson }, { status: 201 });
  } catch (error) {
    log.error("Lesson POST hatası", error);
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

// PATCH /api/trainer/lessons/[lessonId] — ders güncelle
export async function PATCH(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    const { searchParams } = new URL(req.url);
    const lessonId = searchParams.get("id");
    if (!lessonId || !isValidId(lessonId)) return notFound("Ders bulunamadı");

    const lesson = await prisma.trainerLesson.findUnique({
      where: { id: lessonId },
      include: { enrollment: { select: { trainerId: true, id: true } } },
    });
    if (!lesson) return notFound("Ders bulunamadı");
    if (lesson.enrollment.trainerId !== userId) {
      return NextResponse.json({ success: false, error: "Sadece antrenör güncelleyebilir" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateLessonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const wasCompleted = lesson.status === "COMPLETED";
    const willBeCompleted = parsed.data.status === "COMPLETED";

    const updated = await prisma.trainerLesson.update({
      where: { id: lessonId },
      data: {
        ...(parsed.data.scheduledAt !== undefined && {
          scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null,
        }),
        ...(parsed.data.trainerNotes !== undefined && { trainerNotes: parsed.data.trainerNotes }),
        ...(parsed.data.homeworkText !== undefined && { homeworkText: parsed.data.homeworkText }),
        ...(parsed.data.status && { status: parsed.data.status as any }),
        ...(willBeCompleted && !wasCompleted && { completedAt: new Date() }),
        ...(!willBeCompleted && wasCompleted && { completedAt: null }),
      },
    });

    // usedLessons sayacını güncelle
    if (!wasCompleted && willBeCompleted) {
      await prisma.trainerEnrollment.update({
        where: { id: lesson.enrollment.id },
        data: { usedLessons: { increment: 1 } },
      });
    } else if (wasCompleted && parsed.data.status && parsed.data.status !== "COMPLETED") {
      await prisma.trainerEnrollment.update({
        where: { id: lesson.enrollment.id },
        data: { usedLessons: { decrement: 1 } },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    log.error("Lesson PATCH hatası", error);
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
