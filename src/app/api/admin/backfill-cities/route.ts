import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";

/**
 * POST /api/admin/backfill-cities
 * districtId'si olan ama cityId'si olmayan ilanların cityId'sini doldurur.
 * Tek seferlik çalıştırılır.
 */
export async function POST() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

    const admin = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
    if (!admin?.isAdmin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    // districtId var ama cityId yok olan ilanları bul
    const listings = await prisma.listing.findMany({
      where: { cityId: null, districtId: { not: null } },
      select: { id: true, districtId: true },
    });

    let updated = 0;
    let skipped = 0;

    for (const listing of listings) {
      if (!listing.districtId) { skipped++; continue; }

      const district = await prisma.district.findUnique({
        where: { id: listing.districtId },
        select: { cityId: true },
      });

      if (!district?.cityId) { skipped++; continue; }

      await prisma.listing.update({
        where: { id: listing.id },
        data: { cityId: district.cityId },
      });
      updated++;
    }

    const withoutBoth = await prisma.listing.count({
      where: { cityId: null, districtId: null },
    });

    return NextResponse.json({
      success: true,
      updated,
      skipped,
      withoutBoth,
      message: `${updated} ilan güncellendi, ${skipped} atlandı, ${withoutBoth} ilan hem cityId hem districtId yok`,
    });
  } catch (e) {
    console.error("Backfill hatası:", e);
    return NextResponse.json({ error: "Backfill başarısız" }, { status: 500 });
  }
}
