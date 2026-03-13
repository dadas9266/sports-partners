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
        city: true,
        district: { include: { city: { include: { country: true } } } },
        venue: true,
        user: { select: { id: true, name: true, avatarUrl: true, phone: true, email: true } },
        trainerProfile: {
          include: { specializations: true },
        },
        equipmentDetail: true,
        venueRentalDetail: true,
        venueMembershipDetail: true,
        venueClassDetail: true,
        venueProductDetail: true,
        venueEventDetail: true,
        venueServiceDetail: true,
        responses: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
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
    if (parsed.data.countryId !== undefined) updateData.countryId = parsed.data.countryId || null;
    if (parsed.data.cityId !== undefined) updateData.cityId = parsed.data.cityId || null;
    if (parsed.data.districtId !== undefined) updateData.districtId = parsed.data.districtId;
    if (parsed.data.venueId !== undefined) updateData.venueId = parsed.data.venueId || null;
    if (parsed.data.dateTime !== undefined) updateData.dateTime = new Date(parsed.data.dateTime);
    if (parsed.data.level !== undefined) updateData.level = parsed.data.level;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description || null;
    if (parsed.data.allowedGender !== undefined) updateData.allowedGender = parsed.data.allowedGender;

    const targetType = parsed.data.type ?? listing.type;

    const updated = await prisma.$transaction(async (tx) => {
      const nextListing = await tx.listing.update({
        where: { id },
        data: updateData,
      });

      const deleteVenueDetailPromises = [
        targetType !== "VENUE_RENTAL" ? tx.venueRentalDetail.deleteMany({ where: { listingId: id } }) : Promise.resolve(),
        targetType !== "VENUE_MEMBERSHIP" ? tx.venueMembershipDetail.deleteMany({ where: { listingId: id } }) : Promise.resolve(),
        targetType !== "VENUE_CLASS" ? tx.venueClassDetail.deleteMany({ where: { listingId: id } }) : Promise.resolve(),
        targetType !== "VENUE_PRODUCT" ? tx.venueProductDetail.deleteMany({ where: { listingId: id } }) : Promise.resolve(),
        targetType !== "VENUE_EVENT" ? tx.venueEventDetail.deleteMany({ where: { listingId: id } }) : Promise.resolve(),
        targetType !== "VENUE_SERVICE" ? tx.venueServiceDetail.deleteMany({ where: { listingId: id } }) : Promise.resolve(),
      ];

      await Promise.all(deleteVenueDetailPromises);

      if (targetType === "VENUE_RENTAL" && parsed.data.venueRentalDetail) {
        await tx.venueRentalDetail.upsert({
          where: { listingId: id },
          create: {
            listingId: id,
            facilityType: parsed.data.venueRentalDetail.facilityType || "saha",
            courtCount: parsed.data.venueRentalDetail.courtCount ?? 1,
            pricePerHour: parsed.data.venueRentalDetail.pricePerHour ?? null,
            pricePerSession: parsed.data.venueRentalDetail.pricePerSession ?? null,
            minDuration: parsed.data.venueRentalDetail.minDuration ?? null,
            availableSlots: parsed.data.venueRentalDetail.availableSlots || null,
            surfaceType: parsed.data.venueRentalDetail.surfaceType || null,
            hasLighting: parsed.data.venueRentalDetail.hasLighting ?? false,
          },
          update: {
            facilityType: parsed.data.venueRentalDetail.facilityType || "saha",
            courtCount: parsed.data.venueRentalDetail.courtCount ?? 1,
            pricePerHour: parsed.data.venueRentalDetail.pricePerHour ?? null,
            pricePerSession: parsed.data.venueRentalDetail.pricePerSession ?? null,
            minDuration: parsed.data.venueRentalDetail.minDuration ?? null,
            availableSlots: parsed.data.venueRentalDetail.availableSlots || null,
            surfaceType: parsed.data.venueRentalDetail.surfaceType || null,
            hasLighting: parsed.data.venueRentalDetail.hasLighting ?? false,
          },
        });
      }

      if (targetType === "VENUE_MEMBERSHIP" && parsed.data.venueMembershipDetail) {
        await tx.venueMembershipDetail.upsert({
          where: { listingId: id },
          create: {
            listingId: id,
            membershipType: parsed.data.venueMembershipDetail.membershipType || "aylık",
            price: parsed.data.venueMembershipDetail.price ?? 0,
            includes: parsed.data.venueMembershipDetail.includes ?? [],
            trialAvailable: parsed.data.venueMembershipDetail.trialAvailable ?? false,
            trialPrice: parsed.data.venueMembershipDetail.trialPrice ?? null,
            maxMembers: parsed.data.venueMembershipDetail.maxMembers ?? null,
          },
          update: {
            membershipType: parsed.data.venueMembershipDetail.membershipType || "aylık",
            price: parsed.data.venueMembershipDetail.price ?? 0,
            includes: parsed.data.venueMembershipDetail.includes ?? [],
            trialAvailable: parsed.data.venueMembershipDetail.trialAvailable ?? false,
            trialPrice: parsed.data.venueMembershipDetail.trialPrice ?? null,
            maxMembers: parsed.data.venueMembershipDetail.maxMembers ?? null,
          },
        });
      }

      if (targetType === "VENUE_CLASS" && parsed.data.venueClassDetail) {
        await tx.venueClassDetail.upsert({
          where: { listingId: id },
          create: {
            listingId: id,
            className: parsed.data.venueClassDetail.className || "",
            schedule: parsed.data.venueClassDetail.schedule || null,
            instructorName: parsed.data.venueClassDetail.instructorName || null,
            pricePerSession: parsed.data.venueClassDetail.pricePerSession ?? null,
            priceMonthly: parsed.data.venueClassDetail.priceMonthly ?? null,
            difficulty: parsed.data.venueClassDetail.difficulty || null,
            maxParticipants: parsed.data.venueClassDetail.maxParticipants ?? null,
          },
          update: {
            className: parsed.data.venueClassDetail.className || "",
            schedule: parsed.data.venueClassDetail.schedule || null,
            instructorName: parsed.data.venueClassDetail.instructorName || null,
            pricePerSession: parsed.data.venueClassDetail.pricePerSession ?? null,
            priceMonthly: parsed.data.venueClassDetail.priceMonthly ?? null,
            difficulty: parsed.data.venueClassDetail.difficulty || null,
            maxParticipants: parsed.data.venueClassDetail.maxParticipants ?? null,
          },
        });
      }

      if (targetType === "VENUE_PRODUCT" && parsed.data.venueProductDetail) {
        await tx.venueProductDetail.upsert({
          where: { listingId: id },
          create: {
            listingId: id,
            productCategory: parsed.data.venueProductDetail.productCategory || "supplement",
            productName: parsed.data.venueProductDetail.productName || "",
            brand: parsed.data.venueProductDetail.brand || null,
            price: parsed.data.venueProductDetail.price ?? 0,
            unit: parsed.data.venueProductDetail.unit || "adet",
            inStock: parsed.data.venueProductDetail.inStock ?? true,
          },
          update: {
            productCategory: parsed.data.venueProductDetail.productCategory || "supplement",
            productName: parsed.data.venueProductDetail.productName || "",
            brand: parsed.data.venueProductDetail.brand || null,
            price: parsed.data.venueProductDetail.price ?? 0,
            unit: parsed.data.venueProductDetail.unit || "adet",
            inStock: parsed.data.venueProductDetail.inStock ?? true,
          },
        });
      }

      if (targetType === "VENUE_EVENT" && parsed.data.venueEventDetail) {
        await tx.venueEventDetail.upsert({
          where: { listingId: id },
          create: {
            listingId: id,
            eventType: parsed.data.venueEventDetail.eventType || "turnuva",
            startDate: parsed.data.venueEventDetail.startDate ? new Date(parsed.data.venueEventDetail.startDate) : null,
            endDate: parsed.data.venueEventDetail.endDate ? new Date(parsed.data.venueEventDetail.endDate) : null,
            entryFee: parsed.data.venueEventDetail.entryFee ?? null,
            maxParticipants: parsed.data.venueEventDetail.maxParticipants ?? null,
            registrationDeadline: parsed.data.venueEventDetail.registrationDeadline ? new Date(parsed.data.venueEventDetail.registrationDeadline) : null,
          },
          update: {
            eventType: parsed.data.venueEventDetail.eventType || "turnuva",
            startDate: parsed.data.venueEventDetail.startDate ? new Date(parsed.data.venueEventDetail.startDate) : null,
            endDate: parsed.data.venueEventDetail.endDate ? new Date(parsed.data.venueEventDetail.endDate) : null,
            entryFee: parsed.data.venueEventDetail.entryFee ?? null,
            maxParticipants: parsed.data.venueEventDetail.maxParticipants ?? null,
            registrationDeadline: parsed.data.venueEventDetail.registrationDeadline ? new Date(parsed.data.venueEventDetail.registrationDeadline) : null,
          },
        });
      }

      if (targetType === "VENUE_SERVICE" && parsed.data.venueServiceDetail) {
        await tx.venueServiceDetail.upsert({
          where: { listingId: id },
          create: {
            listingId: id,
            serviceType: parsed.data.venueServiceDetail.serviceType || "",
            sessionDuration: parsed.data.venueServiceDetail.sessionDuration ?? null,
            pricePerSession: parsed.data.venueServiceDetail.pricePerSession ?? null,
            qualifications: parsed.data.venueServiceDetail.qualifications || null,
          },
          update: {
            serviceType: parsed.data.venueServiceDetail.serviceType || "",
            sessionDuration: parsed.data.venueServiceDetail.sessionDuration ?? null,
            pricePerSession: parsed.data.venueServiceDetail.pricePerSession ?? null,
            qualifications: parsed.data.venueServiceDetail.qualifications || null,
          },
        });
      }

      return tx.listing.findUnique({
        where: { id: nextListing.id },
        include: {
          sport: true,
          city: true,
          district: { include: { city: { include: { country: true } } } },
          venue: true,
          trainerProfile: { include: { specializations: true } },
          equipmentDetail: true,
          venueRentalDetail: true,
          venueMembershipDetail: true,
          venueClassDetail: true,
          venueProductDetail: true,
          venueEventDetail: true,
          venueServiceDetail: true,
          user: { select: { id: true, name: true, avatarUrl: true } },
          responses: true,
        },
      });
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

    // İlan silme yerine "CLOSED" durumuna çekip match geçmişini koruyoruz
    // Eğer match yoksa tamamen silinmesine izin verebiliriz ama tutarlılık için hep CLOSED daha güvenli
    await prisma.$transaction(async (tx) => {
      // Eğer match varsa ilanı silmek yerine CLOSED yapalım ki match geçmişi bozulmasın
      const hasMatch = await tx.match.findUnique({ where: { listingId: id } });
      
      if (hasMatch) {
         await tx.listing.update({
          where: { id },
          data: { status: "CLOSED" },
        });
        // Bekleyenleri reddet (Match zaten var ama diğerleri PENDING kalmış olabilir)
        await tx.response.updateMany({
          where: { listingId: id, status: "PENDING" },
          data: { status: "REJECTED" },
        });
      } else {
        // Match yoksa tamamen silebiliriz
        await tx.favorite.deleteMany({ where: { listingId: id } });
        await tx.noShowReport.deleteMany({ where: { listingId: id } });
        await (tx as any).trainerProfile?.deleteMany({ where: { listingId: id } });
        await (tx as any).equipmentDetail?.deleteMany({ where: { listingId: id } });
        await tx.venueRentalDetail.deleteMany({ where: { listingId: id } });
        await tx.venueMembershipDetail.deleteMany({ where: { listingId: id } });
        await tx.venueClassDetail.deleteMany({ where: { listingId: id } });
        await tx.venueProductDetail.deleteMany({ where: { listingId: id } });
        await tx.venueEventDetail.deleteMany({ where: { listingId: id } });
        await tx.venueServiceDetail.deleteMany({ where: { listingId: id } });
        await tx.response.deleteMany({ where: { listingId: id } });
        await tx.listing.delete({ where: { id } });
      }
    });

    log.info("İlan silindi/kapatıldı", { listingId: id, userId });
    return NextResponse.json({ success: true, data: null });
  } catch (error) {
    log.error("İlan silinirken hata", error);
    return NextResponse.json(
      { success: false, error: "İlan silinemedi" },
      { status: 500 }
    );
  }
}
