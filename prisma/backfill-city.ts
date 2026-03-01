/**
 * Backfill script: cityId alanı boş olan ilanların cityId değerini
 * districtId üzerinden doldurur. Tek seferlik çalıştırılır.
 *
 * Çalıştırma:
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/backfill-city.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 cityId eksik ilanlar aranıyor...");

  // districtId var ama cityId yok olan ilanları bul
  const listings = await prisma.listing.findMany({
    where: { cityId: null, districtId: { not: null } },
    select: { id: true, districtId: true },
  });

  console.log(`📋 ${listings.length} ilan bulundu, güncelleniyor...`);

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

  // cityId de yok districtId de yok olan ilanlar var mı kontrol et
  const withoutBoth = await prisma.listing.count({
    where: { cityId: null, districtId: null },
  });

  console.log(`✅ ${updated} ilan güncellendi`);
  if (skipped > 0) console.log(`⚠️  ${skipped} ilan atlandı (district bulunamadı)`);
  if (withoutBoth > 0) console.log(`⚠️  ${withoutBoth} ilan hem cityId hem districtId olmadan mevcut (manuel kontrol gerekli)`);
  console.log("🎉 Backfill tamamlandı!");
}

main()
  .catch((e) => { console.error("❌ Hata:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
