import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("clubs");

const createClubSchema = z.object({
  name: z.string().min(2, "Kulüp adı en az 2 karakter olmalı").max(100),
  sportId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  website: z.string().url("Geçerli bir URL giriniz").optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  isPrivate: z.boolean().default(false), // true = katılım kaptan onayı gerektirir
});

// GET /api/clubs — Kulüpleri listele (cityId veya sportId ile filtrele)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityId = searchParams.get("cityId");
    const sportId = searchParams.get("sportId");
    const search = searchParams.get("search");

    const clubs = await prisma.club.findMany({
      where: {
        ...(cityId && { cityId }),
        ...(sportId && { sportId }),
        ...(search && { name: { contains: search, mode: "insensitive" } }),
      },
      include: {
        sport: { select: { id: true, name: true, icon: true } },
        city: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ success: true, data: clubs });
  } catch (error) {
    log.error("Kulüpler listelenirken hata", error);
    return NextResponse.json({ success: false, error: "Kulüpler yüklenemedi" }, { status: 500 });
  }
}

// POST /api/clubs — Yeni kulüp oluştur
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createClubSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { name, sportId, cityId, website, description, isPrivate } = parsed.data;

    const club = await prisma.club.create({
      data: {
        name,
        creatorId: userId,
        sportId: sportId || null,
        cityId: cityId || null,
        website: website || null,
        description: description || null,
        isPrivate: isPrivate ?? false,
        // Oluşturan kişi otomatik CAPTAIN (APPROVED) olarak eklenir
        members: {
          create: { userId, role: "CAPTAIN", status: "APPROVED" },
        },
      },
      include: {
        sport: { select: { id: true, name: true, icon: true } },
        city: { select: { id: true, name: true } },
        _count: { select: { members: true } },
      },
    });

    log.info("Yeni kulüp oluşturuldu", { clubId: club.id, userId });
    return NextResponse.json({ success: true, data: club }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ success: false, error: "Bu şehirde aynı isimde bir kulüp zaten mevcut" }, { status: 409 });
    }
    log.error("Kulüp oluşturulurken hata", error);
    return NextResponse.json({ success: false, error: "Kulüp oluşturulamadı" }, { status: 500 });
  }
}
