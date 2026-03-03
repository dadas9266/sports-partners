import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, isValidId, notFound } from "@/lib/api-utils";
import { updateListingSchema } from "@/lib/validations";
import { createLogger } from "@/lib/logger";

const log = createLogger("listings:detail");

// İlan detayı — kişisel bilgiler sadece eşleşme sonrası gösterilir
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!isValidId(id)) return notFound("Geçersiz ilan ID");
    const currentUserId = await getCurrentUserId();

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        sport: true,
        district: { include: { city: { include: { country: true } } } },
        venue: true,
        user: { select: { id: true, name: true, avatarUrl: true, phone: true, email: true } },
        trainerProfile: {
          include: { specializations: true },
        },
        equipmentDetail: true,
        responses: {
          include: {
            user: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        match: {
          include: {
            user1: { select: { id: true, name: true, avatarUrl: true, phone: true, email: true } },
            user2: { select: { id: true, name: true, avatarUrl: true, phone: true, email: true } },
            ratings: { select: { id: true, ratedById: true } },
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { success: false, error: "İlan bulunamadı" },
        { status: 404 }
      );
    }

    // Kişisel bilgileri maskeleme — sadece eşleşme tarafları görebilir
    const isOwner = currentUserId === listing.userId;
    const isMatchParticipant =
      listing.match &&
      (currentUserId === listing.match.user1Id || currentUserId === listing.match.user2Id);

    // Kör Maç: eşleşme gerçekleşmeden ilan sahibi gizlenir (ilan sahibi kendi ilanını görebilir)
    const isAnonymousListing = (listing as any).isAnonymous && !isOwner && !isMatchParticipant;

    // İlan sahibinin telefon/email bilgisini gizle (eşleşme yoksa)
    const sanitizedListing = {
      ...listing,
      // Anonim ilan: userId'yi "anonymous" yap ki profil linki çalışmasın
      userId: isAnonymousListing ? "anonymous" : listing.userId,
      user: isAnonymousListing
        ? { id: "anonymous", name: "🕵️ Anonim Kullanıcı", avatarUrl: null, phone: null, email: null }
        : {
            id: listing.user.id,
            name: listing.user.name,
            phone: isOwner || isMatchParticipant ? listing.user.phone : null,
            email: isOwner || isMatchParticipant ? listing.user.email : null,
          },
      // Match bilgilerini sadece taraflara göster
      match: listing.match
        ? {
            ...listing.match,
            user1: {
              id: listing.match.user1.id,
              name: listing.match.user1.name,
              phone: isMatchParticipant || isOwner ? listing.match.user1.phone : null,
              email: isMatchParticipant || isOwner ? listing.match.user1.email : null,
            },
            user2: {
              id: listing.match.user2.id,
              name: listing.match.user2.name,
              phone: isMatchParticipant || isOwner ? listing.match.user2.phone : null,
              email: isMatchParticipant || isOwner ? listing.match.user2.email : null,
            },
          }
        : null,
      // Response'ları sadece ilan sahibi görsün
      responses: isOwner ? listing.responses : listing.responses.map((r) => ({
        ...r,
        message: currentUserId === r.userId ? r.message : null,
      })),
    };

    return NextResponse.json({ success: true, data: sanitizedListing });
  } catch (error) {
    log.error("İlan detay yüklenirken hata", error);
    return NextResponse.json(
      { success: false, error: "İlan yüklenemedi" },
      { status: 500 }
    );
  }
}

// İlan güncelle
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const { id } = await params;    if (!isValidId(id)) return notFound("Geçersiz ilan ID");    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      return NextResponse.json(
        { success: false, error: "İlan bulunamadı" },
        { status: 404 }
      );
    }

    if (listing.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    if (listing.status !== "OPEN") {
      return NextResponse.json(
        { success: false, error: "Sadece açık ilanlar düzenlenebilir" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = updateListingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
    if (parsed.data.sportId !== undefined) updateData.sportId = parsed.data.sportId;
    if (parsed.data.districtId !== undefined) updateData.districtId = parsed.data.districtId;
    if (parsed.data.venueId !== undefined) updateData.venueId = parsed.data.venueId || null;
    if (parsed.data.dateTime !== undefined) updateData.dateTime = new Date(parsed.data.dateTime);
    if (parsed.data.level !== undefined) updateData.level = parsed.data.level;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description || null;

    const updated = await prisma.listing.update({
      where: { id },
      data: updateData,
      include: {
        sport: true,
        district: { include: { city: true } },
        venue: true,
      },
    });

    log.info("İlan güncellendi", { listingId: id, userId });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    log.error("İlan güncellenirken hata", error);
    return NextResponse.json(
      { success: false, error: "İlan güncellenemedi" },
      { status: 500 }
    );
  }
}

// İlan kapat (PATCH)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!isValidId(id)) return notFound("Geçersiz ilan ID");
    const body = await request.json();
    const { action } = body;

    if (action !== "close") {
      return NextResponse.json(
        { success: false, error: "Geçersiz işlem" },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      return NextResponse.json(
        { success: false, error: "İlan bulunamadı" },
        { status: 404 }
      );
    }

    if (listing.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    if (listing.status !== "OPEN") {
      return NextResponse.json(
        { success: false, error: "Sadece açık ilanlar kapatılabilir" },
        { status: 400 }
      );
    }

    // İlanı kapat ve bekleyen karşılıkları reddet
    await prisma.$transaction(async (tx) => {
      await tx.listing.update({
        where: { id },
        data: { status: "CLOSED" },
      });
      await tx.response.updateMany({
        where: { listingId: id, status: "PENDING" },
        data: { status: "REJECTED" },
      });
    });

    log.info("İlan kapatıldı", { listingId: id, userId });
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    log.error("İlan kapatılırken hata", error);
    return NextResponse.json(
      { success: false, error: "İlan kapatılamadı" },
      { status: 500 }
    );
  }
}

// İlan sil
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Giriş yapmanız gerekiyor" },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!isValidId(id)) return notFound("Geçersiz ilan ID");
    const listing = await prisma.listing.findUnique({ where: { id } });

    if (!listing) {
      return NextResponse.json(
        { success: false, error: "İlan bulunamadı" },
        { status: 404 }
      );
    }

    if (listing.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Bu işlem için yetkiniz yok" },
        { status: 403 }
      );
    }

    // İlişkili kayıtları da sil (cascade)
    await prisma.$transaction(async (tx) => {
      await tx.match.deleteMany({ where: { listingId: id } });
      await tx.response.deleteMany({ where: { listingId: id } });
      await tx.listing.delete({ where: { id } });
    });

    log.info("İlan silindi", { listingId: id, userId });
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    log.error("İlan silinirken hata", error);
    return NextResponse.json(
      { success: false, error: "İlan silinemedi" },
      { status: 500 }
    );
  }
}
