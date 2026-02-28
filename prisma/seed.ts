import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seed işlemi başlatılıyor...");

  // Sporlar
  const sporlarListesi = [
    { name: "Futbol", icon: "⚽" },
    { name: "Basketbol", icon: "🏀" },
    { name: "Tenis", icon: "🎾" },
    { name: "Voleybol", icon: "🏐" },
    { name: "Masa Tenisi", icon: "🏓" },
    { name: "Yüzme", icon: "🏊" },
    { name: "Koşu", icon: "🏃" },
    { name: "Yürüyüş", icon: "🚶" },
    { name: "Bisiklet", icon: "🚲" },
    { name: "Kaykay / Paten", icon: "🛹" },
    { name: "Squash", icon: "🎾" },
    { name: "Pickleball", icon: "🎾" },
    { name: "Padel", icon: "🎾" },
    { name: "Balık Tutma", icon: "🎣" },
    { name: "Hiking (Doğa Yürüyüşü)", icon: "🥾" },
    { name: "Bilardo", icon: "🎱" },
    { name: "Dart", icon: "🎯" },
    { name: "Yoga / Pilates", icon: "🧘" },
    { name: "Fitness", icon: "💪" },
  ];

  const sporlar = [];
  for (const s of sporlarListesi) {
    const created = await prisma.sport.upsert({
      where: { name: s.name },
      update: { icon: s.icon },
      create: s,
    });
    sporlar.push(created);
  }
  console.log(`✅ ${sporlar.length} spor/aktivite dalı hazır`);

  // Ülke
  const turkiye = await prisma.country.upsert({
    where: { code: "TR" },
    update: {},
    create: { name: "Türkiye", code: "TR" },
  });

  // ─── 81 İL VERİSİ ────────────────────────────────────────────────────────
  const illerData: Record<string, string[]> = {
    "Adana": ["Seyhan", "Yüreğir", "Çukurova", "Sarıçam", "Ceyhan", "Kozan"],
    "Adıyaman": ["Merkez", "Besni", "Kahta", "Gölbaşı"],
    "Afyonkarahisar": ["Merkez", "Sandıklı", "Dinar", "Bolvadin"],
    "Ağrı": ["Merkez", "Doğubayazıt", "Patnos"],
    "Aksaray": ["Merkez", "Ortaköy"],
    "Amasya": ["Merkez", "Merzifon", "Suluova"],
    "Ankara": ["Çankaya", "Keçiören", "Mamak", "Yenimahalle", "Altındağ", "Sincan", "Etimesgut", "Pursaklar", "Beypazarı"],
    "Antalya": ["Muratpaşa", "Kepez", "Konyaaltı", "Alanya", "Manavgat", "Serik", "Aksu"],
    "Ardahan": ["Merkez"],
    "Artvin": ["Merkez", "Hopa"],
    "Aydın": ["Efeler", "Nazilli", "Söke", "Kuşadası", "Didim"],
    "Balıkesir": ["Altıeylül", "Karesi", "Bandırma", "Edremit", "Ayvalık"],
    "Bartın": ["Merkez"],
    "Batman": ["Merkez"],
    "Bayburt": ["Merkez"],
    "Bilecik": ["Merkez", "Bozüyük"],
    "Bingöl": ["Merkez"],
    "Bitlis": ["Merkez", "Tatvan"],
    "Bolu": ["Merkez", "Gerede"],
    "Burdur": ["Merkez", "Bucak"],
    "Bursa": ["Osmangazi", "Yıldırım", "Nilüfer", "Gemlik", "İnegöl", "Mudanya", "Gürsu"],
    "Çanakkale": ["Merkez", "Biga", "Gelibolu", "Çan"],
    "Çankırı": ["Merkez"],
    "Çorum": ["Merkez", "Alaca"],
    "Denizli": ["Pamukkale", "Merkezefendi", "Acıpayam"],
    "Diyarbakır": ["Bağlar", "Kayapınar", "Sur", "Yenişehir"],
    "Düzce": ["Merkez"],
    "Edirne": ["Merkez", "Keşan", "Uzunköprü"],
    "Elazığ": ["Merkez"],
    "Erzincan": ["Merkez"],
    "Erzurum": ["Yakutiye", "Palandöken", "Aziziye"],
    "Eskişehir": ["Odunpazarı", "Tepebaşı"],
    "Gaziantep": ["Şahinbey", "Şehitkamil", "Nizip", "İslahiye"],
    "Giresun": ["Merkez"],
    "Gümüşhane": ["Merkez"],
    "Hakkari": ["Merkez"],
    "Hatay": ["Antakya", "İskenderun", "Defne", "Dörtyol", "Kırıkhan"],
    "Iğdır": ["Merkez"],
    "Isparta": ["Merkez", "Yalvaç"],
    "İstanbul": ["Kadıköy", "Beşiktaş", "Üsküdar", "Şişli", "Bakırköy", "Fatih", "Beyoğlu", "Sarıyer", "Maltepe", "Pendik", "Ümraniye", "Bağcılar", "Bahçelievler", "Bayrampaşa", "Beylikdüzü", "Büyükçekmece", "Çekmeköy", "Esenler", "Esenyurt", "Eyüpsultan", "Gaziosmanpaşa", "Güngören", "Kağıthane", "Kartal", "Küçükçekmece", "Silivri", "Sultanbeyli", "Sultangazi", "Tuzla", "Zeytinburnu", "Arnavutköy", "Avcılar"],
    "İzmir": ["Konak", "Karşıyaka", "Bornova", "Buca", "Çiğli", "Gaziemir", "Balçova", "Karabağlar", "Bayraklı", "Narlıdere", "Güzelbahçe", "Urla", "Çeşme", "Torbalı"],
    "Kahramanmaraş": ["Dulkadiroğlu", "Onikişubat"],
    "Karabük": ["Merkez"],
    "Karaman": ["Merkez"],
    "Kars": ["Merkez"],
    "Kastamonu": ["Merkez"],
    "Kayseri": ["Kocasinan", "Melikgazi", "Talas", "Develi"],
    "Kırıkkale": ["Merkez"],
    "Kırklareli": ["Merkez", "Lüleburgaz"],
    "Kırşehir": ["Merkez"],
    "Kilis": ["Merkez"],
    "Kocaeli": ["İzmit", "Gebze", "Körfez", "Darıca", "Çayırova", "Başiskele"],
    "Konya": ["Meram", "Selçuklu", "Karatay", "Ereğli", "Akşehir"],
    "Kütahya": ["Merkez", "Tavşanlı"],
    "Malatya": ["Battalgazi", "Yeşilyurt"],
    "Manisa": ["Yunusemre", "Şehzadeler", "Akhisar", "Turgutlu", "Salihli"],
    "Mardin": ["Artuklu", "Kızıltepe", "Nusaybin"],
    "Mersin": ["Yenişehir", "Mezitli", "Toroslar", "Akdeniz", "Tarsus", "Erdemli"],
    "Muğla": ["Menteşe", "Bodrum", "Fethiye", "Marmaris", "Milas"],
    "Muş": ["Merkez"],
    "Nevşehir": ["Merkez", "Ürgüp"],
    "Niğde": ["Merkez", "Bor"],
    "Ordu": ["Altınordu", "Ünye", "Fatsa"],
    "Osmaniye": ["Merkez"],
    "Rize": ["Merkez", "Ardeşen"],
    "Sakarya": ["Adapazarı", "Serdivan", "Erenler", "Arifiye"],
    "Samsun": ["Atakum", "Canik", "İlkadım", "Tekkeköy"],
    "Siirt": ["Merkez"],
    "Sinop": ["Merkez"],
    "Sivas": ["Merkez"],
    "Şanlıurfa": ["Karaköprü", "Eyyübiye", "Haliliye", "Suruç", "Viranşehir"],
    "Şırnak": ["Merkez", "Cizre", "Silopi"],
    "Tekirdağ": ["Süleymanpaşa", "Çorlu", "Çerkezköy"],
    "Tokat": ["Merkez", "Erbaa", "Niksar"],
    "Trabzon": ["Ortahisar", "Akçaabat", "Arsin"],
    "Tunceli": ["Merkez"],
    "Uşak": ["Merkez"],
    "Van": ["İpekyolu", "Tuşba", "Edremit"],
    "Yalova": ["Merkez", "Çınarcık"],
    "Yozgat": ["Merkez", "Sorgun"],
    "Zonguldak": ["Merkez", "Ereğli", "Karadeniz Ereğlisi"],
  };

  const cityMap: Record<string, { id: string }> = {};
  const districtMap: Record<string, { id: string }> = {};

  for (const [ilAdi, ilceler] of Object.entries(illerData)) {
    const city = await prisma.city.upsert({
      where: { name_countryId: { name: ilAdi, countryId: turkiye.id } },
      update: {},
      create: { name: ilAdi, countryId: turkiye.id },
    });
    cityMap[ilAdi] = city;
    for (const ilce of ilceler) {
      const district = await prisma.district.upsert({
        where: { name_cityId: { name: ilce, cityId: city.id } },
        update: {},
        create: { name: ilce, cityId: city.id },
      });
      districtMap[`${ilAdi}:${ilce}`] = district;
    }
  }

  // Mevcut kodla uyumluluk için değişken takma adları
  const istanbul = cityMap["İstanbul"];
  const ankara = cityMap["Ankara"];
  const izmir = cityMap["İzmir"];
  const kadikoy = districtMap["İstanbul:Kadıköy"];
  const besiktas = districtMap["İstanbul:Beşiktaş"];
  const uskudar = districtMap["İstanbul:Üsküdar"];
  const sisli = districtMap["İstanbul:Şişli"];
  const bakirkoy = districtMap["İstanbul:Bakırköy"];
  const cankaya = districtMap["Ankara:Çankaya"];
  const kecioren = districtMap["Ankara:Keçiören"];
  const karsiyaka = districtMap["İzmir:Karşıyaka"];
  const bornova = districtMap["İzmir:Bornova"];

  console.log(`✅ 81 il ve ${Object.keys(districtMap).length} ilçe oluşturuldu`);

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
