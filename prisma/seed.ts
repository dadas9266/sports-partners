import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed işlemi başlatılıyor...");

  // Sporlar
  const sporlar = await Promise.all([
    prisma.sport.create({ data: { name: "Futbol", icon: "⚽" } }),
    prisma.sport.create({ data: { name: "Basketbol", icon: "🏀" } }),
    prisma.sport.create({ data: { name: "Tenis", icon: "🎾" } }),
    prisma.sport.create({ data: { name: "Voleybol", icon: "🏐" } }),
    prisma.sport.create({ data: { name: "Badminton", icon: "🏸" } }),
    prisma.sport.create({ data: { name: "Masa Tenisi", icon: "🏓" } }),
    prisma.sport.create({ data: { name: "Yüzme", icon: "🏊" } }),
    prisma.sport.create({ data: { name: "Koşu", icon: "🏃" } }),
  ]);
  console.log(`✅ ${sporlar.length} spor dalı oluşturuldu`);

  // Ülke
  const turkiye = await prisma.country.create({
    data: { name: "Türkiye", code: "TR" },
  });

  // Şehirler
  const istanbul = await prisma.city.create({
    data: { name: "İstanbul", countryId: turkiye.id },
  });
  const ankara = await prisma.city.create({
    data: { name: "Ankara", countryId: turkiye.id },
  });
  const izmir = await prisma.city.create({
    data: { name: "İzmir", countryId: turkiye.id },
  });

  // İlçeler - İstanbul
  const kadikoy = await prisma.district.create({
    data: { name: "Kadıköy", cityId: istanbul.id },
  });
  const besiktas = await prisma.district.create({
    data: { name: "Beşiktaş", cityId: istanbul.id },
  });
  const uskudar = await prisma.district.create({
    data: { name: "Üsküdar", cityId: istanbul.id },
  });
  const sisli = await prisma.district.create({
    data: { name: "Şişli", cityId: istanbul.id },
  });
  const bakirkoy = await prisma.district.create({
    data: { name: "Bakırköy", cityId: istanbul.id },
  });

  // İlçeler - Ankara
  const cankaya = await prisma.district.create({
    data: { name: "Çankaya", cityId: ankara.id },
  });
  const kecioren = await prisma.district.create({
    data: { name: "Keçiören", cityId: ankara.id },
  });

  // İlçeler - İzmir
  const karsiyaka = await prisma.district.create({
    data: { name: "Karşıyaka", cityId: izmir.id },
  });
  const bornova = await prisma.district.create({
    data: { name: "Bornova", cityId: izmir.id },
  });

  console.log("✅ Ülke, şehirler ve ilçeler oluşturuldu");

  // Mekanlar
  const mekanlar = await Promise.all([
    prisma.venue.create({
      data: {
        name: "Kadıköy Spor Salonu",
        address: "Caferağa Mah. Moda Cad. No:12",
        districtId: kadikoy.id,
        sportId: sporlar[0].id,
      },
    }),
    prisma.venue.create({
      data: {
        name: "Fenerbahçe Korları",
        address: "Fenerbahçe Parkı İçi",
        districtId: kadikoy.id,
        sportId: sporlar[2].id,
      },
    }),
    prisma.venue.create({
      data: {
        name: "Beşiktaş Basketbol Sahası",
        address: "Barbaros Bulvarı Açık Saha",
        districtId: besiktas.id,
        sportId: sporlar[1].id,
      },
    }),
    prisma.venue.create({
      data: {
        name: "Üsküdar Halı Saha",
        address: "Altunizade Mah.",
        districtId: uskudar.id,
        sportId: sporlar[0].id,
      },
    }),
    prisma.venue.create({
      data: {
        name: "Şişli Spor Merkezi",
        address: "Mecidiyeköy Mah.",
        districtId: sisli.id,
      },
    }),
    prisma.venue.create({
      data: {
        name: "Bakırköy Yüzme Havuzu",
        address: "Ataköy Sahil",
        districtId: bakirkoy.id,
        sportId: sporlar[6].id,
      },
    }),
    prisma.venue.create({
      data: {
        name: "Çankaya Tenis Kulübü",
        address: "Tunalı Hilmi Cad.",
        districtId: cankaya.id,
        sportId: sporlar[2].id,
      },
    }),
    prisma.venue.create({
      data: {
        name: "Keçiören Spor Kompleksi",
        address: "Keçiören Belediyesi Tesisleri",
        districtId: kecioren.id,
      },
    }),
    prisma.venue.create({
      data: {
        name: "Karşıyaka Voleybol Sahası",
        address: "Karşıyaka Sahil",
        districtId: karsiyaka.id,
        sportId: sporlar[3].id,
      },
    }),
    prisma.venue.create({
      data: {
        name: "Bornova Stadyumu",
        address: "Bornova Merkez",
        districtId: bornova.id,
        sportId: sporlar[0].id,
      },
    }),
  ]);
  console.log(`✅ ${mekanlar.length} mekan oluşturuldu`);

  // Örnek kullanıcılar
  const hash = await bcrypt.hash("Test123!", 12);
  const user1 = await prisma.user.create({
    data: {
      name: "Ahmet Yılmaz",
      email: "ahmet@test.com",
      passwordHash: hash,
      phone: "05551112233",
    },
  });
  const user2 = await prisma.user.create({
    data: {
      name: "Mehmet Kaya",
      email: "mehmet@test.com",
      passwordHash: hash,
      phone: "05554445566",
    },
  });
  const user3 = await prisma.user.create({
    data: {
      name: "Ayşe Demir",
      email: "ayse@test.com",
      passwordHash: hash,
    },
  });
  console.log("✅ 3 test kullanıcısı oluşturuldu (şifre: Test123!)");

  // Örnek ilanlar
  const now = new Date();
  const ilanlar = await Promise.all([
    prisma.listing.create({
      data: {
        type: "RIVAL",
        sportId: sporlar[0].id,
        districtId: kadikoy.id,
        venueId: mekanlar[0].id,
        userId: user1.id,
        dateTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        level: "INTERMEDIATE",
        description:
          "Cumartesi günü halı saha maçı için rakip takım arıyoruz. 7v7 oynayacağız.",
      },
    }),
    prisma.listing.create({
      data: {
        type: "PARTNER",
        sportId: sporlar[2].id,
        districtId: kadikoy.id,
        venueId: mekanlar[1].id,
        userId: user2.id,
        dateTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        level: "BEGINNER",
        description:
          "Tenise yeni başladım, birlikte antrenman yapacak partner arıyorum.",
      },
    }),
    prisma.listing.create({
      data: {
        type: "RIVAL",
        sportId: sporlar[1].id,
        districtId: besiktas.id,
        venueId: mekanlar[2].id,
        userId: user3.id,
        dateTime: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000),
        level: "ADVANCED",
        description:
          "3v3 basketbol maçı, ciddi oyuncular arıyoruz. Deneyimli olmanız tercih sebebi.",
      },
    }),
    prisma.listing.create({
      data: {
        type: "PARTNER",
        sportId: sporlar[0].id,
        districtId: uskudar.id,
        venueId: mekanlar[3].id,
        userId: user1.id,
        dateTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        level: "BEGINNER",
        description:
          "Haftasonu futbol oynamak isteyen arkadaşlar toplanıyoruz, seviye farketmez.",
      },
    }),
    prisma.listing.create({
      data: {
        type: "PARTNER",
        sportId: sporlar[3].id,
        districtId: karsiyaka.id,
        venueId: mekanlar[8].id,
        userId: user2.id,
        dateTime: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
        level: "INTERMEDIATE",
        description: "Voleybol oynayacak 2 kişi arıyoruz, sahil voleybolu.",
      },
    }),
    prisma.listing.create({
      data: {
        type: "RIVAL",
        sportId: sporlar[2].id,
        districtId: cankaya.id,
        venueId: mekanlar[6].id,
        userId: user3.id,
        dateTime: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
        level: "INTERMEDIATE",
        description: "Tenis maçı yapmak istiyorum. Tek maç olarak düşünüyorum.",
      },
    }),
  ]);
  console.log(`✅ ${ilanlar.length} örnek ilan oluşturuldu`);

  // Örnek karşılıklar
  await prisma.response.create({
    data: {
      listingId: ilanlar[0].id,
      userId: user2.id,
      message: "Biz de 7 kişiyiz, maça hazırız!",
      status: "PENDING",
    },
  });
  await prisma.response.create({
    data: {
      listingId: ilanlar[0].id,
      userId: user3.id,
      message: "Takımımız eksik ama katılabiliriz.",
      status: "PENDING",
    },
  });
  await prisma.response.create({
    data: {
      listingId: ilanlar[1].id,
      userId: user1.id,
      message: "Ben de yeni başladım, beraber çalışalım!",
      status: "PENDING",
    },
  });
  console.log("✅ 3 örnek karşılık oluşturuldu");

  console.log("\n🎉 Seed işlemi tamamlandı!");
  console.log("Test hesapları:");
  console.log("  ahmet@test.com / Test123!");
  console.log("  mehmet@test.com / Test123!");
  console.log("  ayse@test.com / Test123!");
}

main()
  .catch((e) => {
    console.error("❌ Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
