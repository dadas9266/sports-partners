import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, isValidId, notFound, unauthorized } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("trainer:enrollment");

const updateSchema = z.object({
  totalLessons: z.number().int().min(1).max(200).optional(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
});

// GET /api/trainer/enrollments/[id] — kayıt detayı + tüm dersler
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) return notFound("Kayıt bulunamadı");

    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    const enrollment = await prisma.trainerEnrollment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            bio: true,
            city: { select: { name: true } },
            sports: { select: { name: true, icon: true } },
          },
        },
        lessons: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!enrollment) return notFound("Kayıt bulunamadı");
    if (enrollment.trainerId !== userId && enrollment.studentId !== userId) {
      return NextResponse.json({ success: false, error: "Erişim reddedildi" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: enrollment });
  } catch (error) {
    log.error("Enrollment GET hatası", error);
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}

// PATCH /api/trainer/enrollments/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) return notFound("Kayıt bulunamadı");

    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    const enrollment = await prisma.trainerEnrollment.findUnique({ where: { id } });
    if (!enrollment) return notFound("Kayıt bulunamadı");
    if (enrollment.trainerId !== userId) {
      return NextResponse.json({ success: false, error: "Sadece antrenör güncelleyebilir" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const updated = await prisma.trainerEnrollment.update({
      where: { id },
      data: {
        ...(parsed.data.totalLessons !== undefined && { totalLessons: parsed.data.totalLessons }),
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
        ...(parsed.data.status !== undefined && { status: parsed.data.status as any }),
      },
    });

    log.info("Enrollment güncellendi", { id, trainerId: userId });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    log.error("Enrollment PATCH hatası", error);
    return NextResponse.json({ success: false, error: "Sunucu hatası" }, { status: 500 });
  }
}
