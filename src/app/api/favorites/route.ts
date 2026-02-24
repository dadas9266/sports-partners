import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("favorites");

// Kullanıcının favorilerini getir
export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        listing: {
          include: {
            sport: true,
            district: { include: { city: { include: { country: true } } } },
            venue: true,
            user: { select: { id: true, name: true } },
            _count: { select: { responses: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: favorites.map((f) => f.listing),
    });
  } catch (error) {
    log.error("Favoriler yüklenirken hata", error);
    return NextResponse.json({ success: false, error: "Favoriler yüklenemedi" }, { status: 500 });
  }
}

// Favori ekle / kaldır (toggle)
export async function POST(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const body = await request.json();
    const { listingId } = body as { listingId: string };

    if (!listingId) {
      return NextResponse.json({ success: false, error: "listingId gerekli" }, { status: 400 });
    }

    // İlan var mı?
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      return NextResponse.json({ success: false, error: "İlan bulunamadı" }, { status: 404 });
    }

    const existing = await prisma.favorite.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });

    if (existing) {
      // Favoriden kaldır
      await prisma.favorite.delete({ where: { id: existing.id } });
      log.info("Favoriden kaldırıldı", { userId, listingId });
      return NextResponse.json({ success: true, favorited: false });
    } else {
      // Favoriye ekle
      await prisma.favorite.create({ data: { userId, listingId } });
      log.info("Favoriye eklendi", { userId, listingId });
      return NextResponse.json({ success: true, favorited: true });
    }
  } catch (error) {
    log.error("Favori işlemi hatası", error);
    return NextResponse.json({ success: false, error: "İşlem başarısız" }, { status: 500 });
  }
}
