import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";

async function requireAdmin(userId: string | null) {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  return user?.isAdmin === true;
}

// Localized bot names per country code
const LOCALIZED_NAMES: Record<string, { male: string[]; female: string[] }> = {
  TR: { male: ["Ahmet Y.", "Mehmet K.", "Ali R.", "Mustafa B.", "Emre S.", "Burak T.", "Murat D.", "Hasan Ö."], female: ["Ayşe M.", "Fatma K.", "Zeynep B.", "Elif S.", "Merve D.", "Derya T.", "Selin A.", "Büşra Y."] },
  DE: { male: ["Max M.", "Felix S.", "Lukas B.", "Jonas W.", "Leon K.", "Tim H.", "Paul F.", "Niklas R."], female: ["Anna S.", "Lena M.", "Sophie B.", "Marie K.", "Laura W.", "Julia H.", "Lisa F.", "Sarah R."] },
  GB: { male: ["James W.", "Oliver S.", "Harry B.", "Jack T.", "George M.", "Charlie K.", "Thomas R.", "William H."], female: ["Emma W.", "Olivia S.", "Amelia B.", "Isla T.", "Sophie M.", "Mia K.", "Charlotte R.", "Emily H."] },
  FR: { male: ["Lucas M.", "Hugo D.", "Louis B.", "Nathan P.", "Léo R.", "Gabriel S.", "Jules T.", "Raphaël V."], female: ["Emma D.", "Léa M.", "Chloé B.", "Manon P.", "Camille R.", "Inès S.", "Zoé T.", "Jade V."] },
  NL: { male: ["Sem V.", "Daan B.", "Lucas M.", "Levi K.", "Finn D.", "Milan S.", "Bram J.", "Noah W."], female: ["Emma V.", "Sophie B.", "Julia M.", "Anna K.", "Lotte D.", "Sara S.", "Mila J.", "Lisa W."] },
  US: { male: ["James S.", "John W.", "Robert B.", "Michael T.", "David K.", "Chris M.", "Daniel H.", "Matthew R."], female: ["Emily S.", "Sarah W.", "Jessica B.", "Ashley T.", "Jennifer K.", "Amanda M.", "Megan H.", "Rachel R."] },
  AZ: { male: ["Əli M.", "Rəşad K.", "Tural B.", "Orxan S.", "Elşən D.", "Farid T.", "Murad A.", "Nicat Y."], female: ["Aygün M.", "Günel K.", "Ləman B.", "Nərmin S.", "Səbinə D.", "Fidan T.", "Aynur A.", "Rəna Y."] },
  RU: { male: ["Дмитрий К.", "Алексей С.", "Иван П.", "Михаил В.", "Сергей Н.", "Андрей М.", "Никита Л.", "Артём Б."], female: ["Анна К.", "Мария С.", "Елена П.", "Ольга В.", "Наталья Н.", "Екатерина М.", "Ирина Л.", "Дарья Б."] },
  SA: { male: ["Mohammed A.", "Ahmed S.", "Abdullah K.", "Khalid M.", "Faisal R.", "Omar T.", "Sultan B.", "Fahad N."], female: ["Fatima A.", "Noura S.", "Sara K.", "Maryam M.", "Lama R.", "Haya T.", "Reem B.", "Amal N."] },
  IT: { male: ["Marco R.", "Luca B.", "Alessandro M.", "Francesco T.", "Andrea S.", "Matteo P.", "Lorenzo G.", "Davide F."], female: ["Giulia R.", "Francesca B.", "Sara M.", "Chiara T.", "Valentina S.", "Alessia P.", "Elena G.", "Martina F."] },
  ES: { male: ["Carlos M.", "Javier S.", "Miguel R.", "Alejandro B.", "David T.", "Pablo K.", "Daniel G.", "Adrián F."], female: ["María M.", "Lucía S.", "Carmen R.", "Ana B.", "Laura T.", "Marta K.", "Paula G.", "Sara F."] },
  JP: { male: ["Yuto T.", "Haruto S.", "Sota M.", "Ren K.", "Kaito N.", "Riku H.", "Hinata Y.", "Hayato O."], female: ["Yui T.", "Hana S.", "Aoi M.", "Sakura K.", "Rin N.", "Mio H.", "Yuna Y.", "Koharu O."] },
  KR: { male: ["Minjun K.", "Seoho L.", "Jihoon P.", "Hyunwoo C.", "Donghyun J.", "Sungmin Y.", "Jaeho S.", "Wonjin H."], female: ["Jiyeon K.", "Soyeon L.", "Hayun P.", "Minji C.", "Yuna J.", "Seoyeon Y.", "Chaeyoung S.", "Somin H."] },
  BR: { male: ["Lucas S.", "Gabriel O.", "Mateus F.", "Pedro A.", "Gustavo M.", "Rafael C.", "Bruno L.", "Thiago R."], female: ["Ana S.", "Julia O.", "Maria F.", "Camila A.", "Beatriz M.", "Larissa C.", "Isabela L.", "Fernanda R."] },
  AR: { male: ["Matías G.", "Santiago R.", "Tomás F.", "Juan M.", "Nicolás B.", "Agustín S.", "Lucas P.", "Facundo D."], female: ["Valentina G.", "Martina R.", "Sofía F.", "Camila M.", "Lucía B.", "Catalina S.", "María P.", "Delfina D."] },
  EG: { male: ["Ahmed M.", "Omar S.", "Mohamed K.", "Youssef A.", "Hassan B.", "Ali T.", "Khalid R.", "Amr N."], female: ["Fatma M.", "Nour S.", "Sara K.", "Mariam A.", "Hana B.", "Dina T.", "Aya R.", "Yasmin N."] },
  AU: { male: ["Jack M.", "Oliver S.", "Liam B.", "Noah T.", "William K.", "James R.", "Thomas H.", "Ethan W."], female: ["Charlotte M.", "Olivia S.", "Amelia B.", "Isla T.", "Mia K.", "Ava R.", "Grace H.", "Chloe W."] },
  CA: { male: ["Liam M.", "Noah S.", "Ethan B.", "Lucas T.", "Benjamin K.", "Oliver R.", "James H.", "Alexander W."], female: ["Emma M.", "Olivia S.", "Ava B.", "Sophie T.", "Isabella K.", "Mia R.", "Charlotte H.", "Amelia W."] },
  IN: { male: ["Arjun S.", "Rohan K.", "Vikram P.", "Aditya M.", "Karan B.", "Rahul T.", "Varun G.", "Ankit D."], female: ["Priya S.", "Ananya K.", "Divya P.", "Sneha M.", "Pooja B.", "Neha T.", "Kavya G.", "Meera D."] },
  PK: { male: ["Ali K.", "Hassan M.", "Usman A.", "Bilal S.", "Hamza R.", "Zain T.", "Fahad B.", "Ahmed N."], female: ["Ayesha K.", "Fatima M.", "Sana A.", "Hira S.", "Maryam R.", "Zara T.", "Amna B.", "Nadia N."] },
  GR: { male: ["Giorgos P.", "Nikos K.", "Dimitris M.", "Kostas S.", "Yannis T.", "Alexandros V.", "Panagiotis R.", "Christos B."], female: ["Maria P.", "Eleni K.", "Katerina M.", "Sofia S.", "Dimitra T.", "Anna V.", "Christina R.", "Ioanna B."] },
  BG: { male: ["Georgi I.", "Dimitar P.", "Ivan S.", "Nikolay K.", "Stefan M.", "Alexander T.", "Boris V.", "Plamen R."], female: ["Maria I.", "Elena P.", "Iva S.", "Daniela K.", "Tsvetana M.", "Nadya T.", "Desislava V.", "Rositsa R."] },
  GE: { male: ["Giorgi T.", "Lasha M.", "Nikoloz K.", "Davit S.", "Levan B.", "Goga P.", "Vakhtang R.", "Zurab A."], female: ["Nino T.", "Mariam M.", "Tamar K.", "Ana S.", "Eka B.", "Lika P.", "Salome R.", "Maka A."] },
};

const DEFAULT_NAMES = {
  male: ["Alex K.", "Max S.", "Sam B.", "Leo T.", "Dan M.", "Ben R.", "Tom H.", "Jack W."],
  female: ["Anna K.", "Lisa S.", "Emma B.", "Sara T.", "Mia M.", "Amy R.", "Eva H.", "Zoe W."],
};

/**
 * POST /api/admin/bots/seed-country
 * Auto-creates 2 bots per city in a country, then creates tasks for them
 * Body: { countryId, sportId, listingDateTime? }
 */
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!(await requireAdmin(userId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await req.json();
  const { countryId, sportId, listingDateTime } = body;

  if (!countryId || !sportId) {
    return NextResponse.json({ error: "countryId ve sportId zorunlu" }, { status: 400 });
  }

  const country = await prisma.country.findUnique({
    where: { id: countryId },
    include: { cities: { select: { id: true, name: true } } },
  });
  if (!country) {
    return NextResponse.json({ error: "Ülke bulunamadı" }, { status: 404 });
  }

  const sport = await prisma.sport.findUnique({ where: { id: sportId } });
  if (!sport) {
    return NextResponse.json({ error: "Spor bulunamadı" }, { status: 404 });
  }

  const names = LOCALIZED_NAMES[country.code] ?? DEFAULT_NAMES;
  let maleIdx = 0;
  let femaleIdx = 0;
  let botsCreated = 0;
  let tasksCreated = 0;

  const dateTime = listingDateTime ? new Date(listingDateTime) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const taskIds: string[] = [];

  for (const city of country.cities) {
    // Check if bots already exist for this city and sport to avoid duplicates if preferred, 
    // but here we create new ones as per "seed" logic.
    
    // Create male bot for this city
    const maleName = names.male[maleIdx % names.male.length];
    maleIdx++;
    const maleBot = await prisma.user.create({
      data: {
        name: maleName,
        email: `bot_${Date.now()}_m_${city.id.slice(0, 6)}@sporpartner.internal`,
        gender: "MALE",
        birthDate: new Date(1990 + (maleIdx % 15), maleIdx % 12, 1),
        cityId: city.id,
        isBot: true,
        onboardingDone: true,
        sports: { connect: [{ id: sportId }] },
      },
    });
    botsCreated++;

    // Create female bot for this city
    const femaleName = names.female[femaleIdx % names.female.length];
    femaleIdx++;
    const femaleBot = await prisma.user.create({
      data: {
        name: femaleName,
        email: `bot_${Date.now()}_f_${city.id.slice(0, 6)}@sporpartner.internal`,
        gender: "FEMALE",
        birthDate: new Date(1992 + (femaleIdx % 13), femaleIdx % 12, 15),
        cityId: city.id,
        isBot: true,
        onboardingDone: true,
        sports: { connect: [{ id: sportId }] },
      },
    });
    botsCreated++;

    // Create bot task for this city
    const task = await prisma.botTask.create({
      data: {
        listingBotId: maleBot.id,
        responderBotId: femaleBot.id,
        cityId: city.id,
        countryId: country.id,
        sportId,
        status: "PENDING",
        listingDateTime: dateTime,
      },
    });
    tasksCreated++;
    taskIds.push(task.id);
  }

// Görevleri arka planda çalıştır (non-blocking)
  executeTasks(taskIds).catch(console.error);

  return NextResponse.json({
    success: true,
    message: `${country.name}: ${botsCreated} bot + ${tasksCreated} görev oluşturuldu ve işlemler başlatıldı (${country.cities.length} şehir)`,
    data: { botsCreated, tasksCreated, cities: country.cities.length },
  });
}

// Re-using the logic from /api/admin/bot-tasks/route.ts or similar to run them immediately
// Since we want to keep it simple, let's copy the execution logic here or import it if possible.
// For now, I'll copy the core execution logic to ensure it runs.

async function executeTasks(taskIds: string[]) {
  for (const taskId of taskIds) {
    const task = await prisma.botTask.findUnique({
      where: { id: taskId },
      include: {
        listingBot: { include: { sports: true, city: { include: { country: true } } } },
        responderBot: true,
        city: true,
        sport: true,
      },
    });
    if (!task) continue;

    try {
      // 1. İlan oluştur
      const sportId = task.sportId ?? task.listingBot.sports[0]?.id;
      if (!sportId) throw new Error("Bot'un sporu yok");

      const listing = await prisma.listing.create({
        data: {
          userId: task.listingBotId,
          sportId,
          cityId: task.cityId ?? task.listingBot.cityId,
          type: "RIVAL",
          level: (task.listingBot.userLevel as "BEGINNER" | "INTERMEDIATE" | "ADVANCED") ?? "BEGINNER",
          status: "OPEN",
          description: generateListingDesc(task.listingBot.name ?? "Sporcu", task.sport?.name ?? "spor"),
          dateTime: task.listingDateTime ?? getFutureDate(1),
          maxParticipants: 2,
        },
      });

      await prisma.botTask.update({
        where: { id: taskId },
        data: { status: "LISTING_CREATED", listingId: listing.id },
      });

      // 2. Gecikme (Seed modunda kısa tutabiliriz veya task default'u kullanırız)
      await sleep(5000); 

      // 3. Başvuru yap
      const response = await prisma.response.create({
        data: {
          listingId: listing.id,
          userId: task.responderBotId,
          message: generateResponseMsg(task.responderBot.name ?? "Sporcu"),
        },
      });

      await prisma.botTask.update({
        where: { id: taskId },
        data: { status: "RESPONSE_SENT", responseId: response.id },
      });

      // 4. Eşleşmeyi kabul et
      const match = await prisma.match.create({
        data: {
          listingId: listing.id,
          responseId: response.id,
          user1Id: task.listingBotId,
          user2Id: task.responderBotId,
          status: "SCHEDULED",
          scheduledAt: getFutureDate(1),
        },
      });

      await prisma.listing.update({ where: { id: listing.id }, data: { status: "MATCHED" } });
      await prisma.response.update({ where: { id: response.id }, data: { status: "ACCEPTED" } });

      await prisma.botTask.update({
        where: { id: taskId },
        data: {
          status: "MATCH_DONE",
          matchId: match.id,
          executedAt: new Date(),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await prisma.botTask.update({
        where: { id: taskId },
        data: { status: "FAILED", errorMessage: message, executedAt: new Date() },
      });
    }
  }
}

function generateListingDesc(name: string, sport: string): string {
  const templates = [
    `${sport} oynamak istiyorum, birlikte oynayacak biri arıyorum.`,
    `${sport} partneri arıyorum. Deneyimli olmak zorunda değil.`,
    `Hafta sonu ${sport} maçı için takım arkadaşı aranıyor.`,
    `${name} olarak ${sport} için eşleşme arıyorum.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateResponseMsg(name: string): string {
  const templates = [
    "Merhaba! İlgimi çekti, katılmak istiyorum.",
    "Selam, benimle oynamak ister misin?",
    "Müsaitim, buluşalım!",
    `${name} olarak başvuruyorum, uygun görürsen harika olur.`,
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

function getFutureDate(daysAhead: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(10 + Math.floor(Math.random() * 8), 0, 0, 0);
  return d;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
