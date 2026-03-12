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

// Verilen listing id'leri için tüm ilişkili kayıtları transaction ile sil
async function cascadeDeleteListings(listingIds: string[]) {
  if (listingIds.length === 0) return 0;

  // Match'leri bul (alt tablolar için gerekli)
  const matches = await prisma.match.findMany({
    where: { listingId: { in: listingIds } },
    select: { id: true },
  });
  const matchIds = matches.map((m) => m.id);

  return prisma.$transaction(async (tx) => {
    // 1) Match alt tabloları (en derin bağımlılıklar)
    if (matchIds.length > 0) {
      await tx.matchOtp.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.rating.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.message.deleteMany({ where: { matchId: { in: matchIds } } });
      await tx.noShowReport.deleteMany({ where: { matchId: { in: matchIds } } });
    }

    // 2) Listing'e doğrudan bağlı tablolar
    await tx.match.deleteMany({ where: { listingId: { in: listingIds } } });
    await tx.response.deleteMany({ where: { listingId: { in: listingIds } } });
    await tx.favorite.deleteMany({ where: { listingId: { in: listingIds } } });
    await tx.noShowReport.deleteMany({ where: { listingId: { in: listingIds } } });
    await tx.equipmentDetail.deleteMany({ where: { listingId: { in: listingIds } } });

    // 3) TrainerProfile listingId bağlantısını kopar (opsiyonel FK)
    await tx.trainerProfile.updateMany({
      where: { listingId: { in: listingIds } },
      data: { listingId: null },
    });

    // 4) Story linkedListingId null yap (string alan, FK değil)
    await tx.story.updateMany({
      where: { linkedListingId: { in: listingIds } },
      data: { linkedListingId: null },
    });

    // 5) Son olarak listing'leri sil
    const result = await tx.listing.deleteMany({ where: { id: { in: listingIds } } });
    return result.count;
  });
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
      const all = await prisma.listing.findMany({ select: { id: true } });
      const count = await cascadeDeleteListings(all.map((l) => l.id));
      log.warn("Admin TÜM ilanları sildi", { adminId, count });
      return NextResponse.json({ success: true, count });
    }

    if (allBots) {
      const botListings = await prisma.listing.findMany({
        where: { user: { isBot: true } },
        select: { id: true },
      });
      const count = await cascadeDeleteListings(botListings.map((l) => l.id));
      log.info("Admin bot ilanlarını sildi", { adminId, count });
      return NextResponse.json({ success: true, count });
    }

    if (ids && ids.length > 0) {
      const count = await cascadeDeleteListings(ids);
      log.info("Admin seçili ilanları sildi", { adminId, count });
      return NextResponse.json({ success: true, count });
    }

    return NextResponse.json({ error: "Geçersiz parametreler" }, { status: 400 });
  } catch (error) {
    log.error("İlan silinirken hata", error);
    return NextResponse.json({ error: "Silinemedi" }, { status: 500 });
  }
}
