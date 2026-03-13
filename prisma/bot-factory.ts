import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ADLAR = [
  "Can", "Mustafa", "Murat", "Emre", "Barış", "Deniz", "Ege", "Mert", "Ali", "Hüseyin",
  "Elif", "Zeynep", "Merve", "Selin", "Ece", "Derya", "Gül", "Aslı", "Burcu", "Ezgi",
  "Kaan", "Bora", "Yiğit", "Umut", "Sarp", "Arda", "Kerem", "Ömer", "Enes", "Yavuz",
  "İrem", "Büşra", "Ayşe", "Fatma", "Hande", "İlayda", "Yağmur", "Pelin", "Melis", "Damla"
];

const SOYADLAR = [
  "Yılmaz", "Kaya", "Demir", "Çelik", "Şahin", "Yıldız", "Öztürk", "Aydın", "Özkan", "Kılıç",
  "Arslan", "Doğan", "Bulut", "Güneş", "Korkmaz", "Erdoğan", "Aslan", "Polat", "Keskin", "Yavuz"
];

const MESAJLAR = [
  "Gelmek isterim, rakip arıyorum.",
  "Mekan uygunsa ben de varım.",
  "Harika bir fikir, katılabilirim.",
  "Seviyeme uygun görünüyor, eşleşelim.",
  "Hafta sonu için planım yoktu, iyi oldu.",
  "Hangi sahada oynayacağız?",
  "Ekip tamam mı, eksik var mı?",
  "Daha önce burada oynamıştım, güzel mekan.",
  "Yeniyim ama kendime güveniyorum.",
  "Vakit geçirmek için ideal."
];

async function createBot(cityId: string, districtId: string | null) {
  const ad = ADLAR[Math.floor(Math.random() * ADLAR.length)];
  const soyad = SOYADLAR[Math.floor(Math.random() * SOYADLAR.length)];
  const name = `${ad} ${soyad}`;
  const email = `${ad.toLowerCase()}.${soyad.toLowerCase()}.${Math.floor(Math.random() * 1000)}@botmail.com`;
  const hash = await bcrypt.hash("Bot123!", 10);

  return prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name,
      email,
      passwordHash: hash,
      cityId,
      // @ts-ignore
      districtId: districtId || null,
      onboardingDone: true,
      isBot: true,
      gender: Math.random() > 0.5 ? "MALE" : "FEMALE",
      birthDate: new Date(Date.now() - (Math.floor(Math.random() * 20 + 18) * 365 * 24 * 60 * 60 * 1000)), // 18-38 yaş arası
      bio: "Ben bir spor tutkunuyum, yeni insanlarla tanışmayı seviyorum.",
    }
  });
}

async function main() {
  console.log("🤖 Bot Fabrikası Çalışıyor...");

  // 1. Şehirleri Bul
  const cities = await prisma.city.findMany({
    where: {
      name: { in: ["Manisa", "İzmir", "İstanbul", "Ankara"] }
    },
    include: { districts: true }
  });

  const cityMap = cities.reduce((acc, city) => {
    acc[city.name] = city;
    return acc;
  }, {} as Record<string, any>);

  const targets = [
    { name: "Manisa", count: 20 },
    { name: "İzmir", count: 10 },
    { name: "İstanbul", count: 10 },
    { name: "Ankara", count: 10 },
  ];

  const allBots: any[] = [];

  for (const target of targets) {
    const city = cityMap[target.name];
    if (!city) {
      console.warn(`⚠️ Şehir bulunamadı: ${target.name}`);
      continue;
    }

    console.log(`📍 ${target.name} için ${target.count} bot oluşturuluyor...`);
    for (let i = 0; i < target.count; i++) {
      const dist = city.districts[Math.floor(Math.random() * city.districts.length)] || null;
      const bot = await createBot(city.id, dist?.id || null);
      allBots.push(bot);
    }
  }

  console.log(`✅ Toplam ${allBots.length} bot oluşturuldu.`);

  // 2. İlan Simülasyonu
  console.log("📝 İlan simülasyonu başlatılıyor...");
  const sports = await prisma.sport.findMany();
  
  // Her şehirden birkaç bot ilan açsın
  for (const city of cities) {
    const cityBots = allBots.filter(b => b.cityId === city.id);
    const listingCount = Math.floor(Math.random() * 3) + 2; // Her şehre 2-4 ilan
    
    for (let i = 0; i < listingCount; i++) {
      const owner = cityBots[Math.floor(Math.random() * cityBots.length)];
      const sport = sports[Math.floor(Math.random() * sports.length)];
      const district = city.districts[Math.floor(Math.random() * city.districts.length)];
      
      const cumleler = [
        `Bu hafta ${sport.name} için partner arıyorum.`,
        `${district?.name} tarafında ${sport.name} için partner arıyorum.`,
        `Hafta sonu ${sport.name} için plan yapan varsa eşleşebiliriz.`,
        `${sport.name} için seviyeden bağımsız bir eşleşme arıyorum.`,
        `${district?.name} çevresinde ${sport.name} için ilan açtım, katılmak isteyen yazabilir.`,
        `${sport.name} için uygun bir eşleşme arıyorum.`
      ];

      const listing = await prisma.listing.create({
        data: {
          userId: owner.id,
          sportId: sport.id,
          districtId: district?.id || city.districts[0]?.id,
          type: Math.random() > 0.5 ? "RIVAL" : "PARTNER",
          level: ["BEGINNER", "INTERMEDIATE", "ADVANCED"][Math.floor(Math.random() * 3)] as any,
          dateTime: new Date(Date.now() + (Math.random() * 7 * 24 * 60 * 60 * 1000)), // Gelecek 7 gün içinde
          description: cumleler[Math.floor(Math.random() * cumleler.length)],
        }
      });

      // Bu ilana başka botlar karşılık versin
      const responderCount = Math.floor(Math.random() * 3); // 0-2 karşılık
      const usedResponderIds = new Set<string>([owner.id]);
      const availableResponders = cityBots.filter(b => b.id !== owner.id);
      
      for (let j = 0; j < responderCount && j < availableResponders.length; j++) {
        const unusedResponders = availableResponders.filter(b => !usedResponderIds.has(b.id));
        if (unusedResponders.length === 0) break;
        const responder = unusedResponders[Math.floor(Math.random() * unusedResponders.length)];
        usedResponderIds.add(responder.id);
        try {
          await prisma.response.create({
            data: {
              listingId: listing.id,
              userId: responder.id,
              message: MESAJLAR[Math.floor(Math.random() * MESAJLAR.length)],
              status: "PENDING"
            }
          });
        } catch {
          // Duplicate response, skip
        }
      }
    }
  }

  console.log("✨ Simülasyon tamamlandı!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
