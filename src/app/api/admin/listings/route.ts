import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:admin:listings");

async function requireAdmin() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return user?.isAdmin ? userId : null;
}

// İlanları listele (filtreli/filtresiz)
export async function GET(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const isBot = searchParams.get("isBot") === "true";
  const status = searchParams.get("status"); // OPEN, CLOSED etc.
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 20;

  const where: any = {};
  if (searchParams.has("isBot")) {
    where.user = { isBot };
  }
  if (status) {
    where.status = status;
  }

  try {
    const [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, name: true, avatarUrl: true, isBot: true } },
          sport: { select: { name: true, icon: true } },
          city: { select: { name: true } },
          _count: { select: { responses: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    log.error("İlanlar listelenirken hata", error);
    return NextResponse.json({ error: "Listelenemedi" }, { status: 500 });
  }
}

// İlan(ları) sil
export async function DELETE(req: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

  const body = await req.json();
  const { ids, allBots, allListings } = body as {
    ids?: string[];
    allBots?: boolean;
    allListings?: boolean;
  };

  try {
    if (allListings) {
      // TÜM ilanları sil (Tehlikeli işlem)
      await prisma.response.deleteMany({});
      await prisma.match.deleteMany({});
      const result = await prisma.listing.deleteMany({});
      log.warn("Admin TÜM ilanları sildi", { adminId, count: result.count });
      return NextResponse.json({ success: true, count: result.count });
    }

    if (allBots) {
      // Sadece botların ilanlarını sil
      const botListings = await prisma.listing.findMany({
        where: { user: { isBot: true } },
        select: { id: true },
      });
      const botListingIds = botListings.map((l) => l.id);

      await prisma.response.deleteMany({ where: { listingId: { in: botListingIds } } });
      await prisma.match.deleteMany({ where: { listingId: { in: botListingIds } } });
      const result = await prisma.listing.deleteMany({
        where: { user: { isBot: true } },
      });

      log.info("Admin bot ilanlarını sildi", { adminId, count: result.count });
      return NextResponse.json({ success: true, count: result.count });
    }

    if (ids && ids.length > 0) {
      // Belirli id'leri sil
      await prisma.response.deleteMany({ where: { listingId: { in: ids } } });
      await prisma.match.deleteMany({ where: { listingId: { in: ids } } });
      const result = await prisma.listing.deleteMany({
        where: { id: { in: ids } },
      });

      log.info("Admin seçili ilanları sildi", { adminId, count: result.count });
      return NextResponse.json({ success: true, count: result.count });
    }

    return NextResponse.json({ error: "Geçersiz parametreler" }, { status: 400 });
  } catch (error) {
    log.error("İlan silinirken hata", error);
    return NextResponse.json({ error: "Silinemedi" }, { status: 500 });
  }
}
