import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("api:trainer-profile");

const trainerProfileSchema = z.object({
  hourlyRate: z.number().min(0).max(10000).optional(),
  experience: z.number().min(0).max(50).optional(),
  specialization: z.string().max(100).optional(),
  gymName: z.string().max(200).optional(),
  gymAddress: z.string().max(500).optional(),
  certificates: z.array(z.string()).max(10).default([]),
});

// GET /api/trainer-profile
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId zorunlu" }, { status: 400 });
  }

  try {
    const profile = await prisma.trainerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true, bio: true },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Eğitmen profili bulunamadı" }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (err) {
    log.error("Eğitmen profili getirme hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// POST /api/trainer-profile → oluştur / güncelle
export async function POST(req: NextRequest) {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = trainerProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const profile = await prisma.trainerProfile.upsert({
      where: { userId: currentUserId },
      create: { userId: currentUserId, ...parsed.data },
      update: parsed.data,
    });

    return NextResponse.json(profile);
  } catch (err) {
    log.error("Eğitmen profili oluşturma hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
