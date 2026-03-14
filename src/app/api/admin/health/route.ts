import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import fs from "fs";
import path from "path";

const log = createLogger("admin:health");

interface HealthCheck {
  name: string;
  status: "ok" | "warn" | "error";
  detail: string;
  count?: number;
}

export async function GET() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
    const admin = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
    if (!admin?.isAdmin) return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });

    const checks: HealthCheck[] = [];
    const startTime = Date.now();

    // ===== 1) VERİTABANI BAĞLANTI TESTİ =====
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.push({ name: "Veritabanı Bağlantısı", status: "ok", detail: "PostgreSQL bağlantısı aktif" });
    } catch {
      checks.push({ name: "Veritabanı Bağlantısı", status: "error", detail: "Veritabanına bağlanılamıyor!" });
    }

    // ===== 2) TABLO KAYIT SAYILARI =====
    const [
      userCount, listingCount, matchCount, responseCount, ratingCount,
      clubCount, groupCount, communityCount,
      postCount, commentCount, messageCount, notificationCount,
      favoriteCount, noShowCount, storyCount, botCount,
      trainerCount, sportCount, cityCount, countryCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.listing.count(),
      prisma.match.count(),
      prisma.response.count(),
      prisma.rating.count(),
      prisma.club.count(),
      prisma.group.count(),
      prisma.community.count(),
      prisma.post.count(),
      prisma.postComment.count(),
      prisma.message.count(),
      prisma.notification.count(),
      prisma.favorite.count(),
      prisma.noShowReport.count(),
      prisma.story.count(),
      prisma.user.count({ where: { isBot: true } }),
      prisma.trainerProfile.count(),
      prisma.sport.count(),
      prisma.city.count(),
      prisma.country.count(),
    ]);

    checks.push({
      name: "Tablo Kayıt Sayıları",
      status: "ok",
      detail: `Kullanıcı: ${userCount} (${botCount} bot) | İlan: ${listingCount} | Maç: ${matchCount} | Yanıt: ${responseCount} | Değerlendirme: ${ratingCount} | Kulüp: ${clubCount} | Grup: ${groupCount} | Topluluk: ${communityCount} | Gönderi: ${postCount} | Yorum: ${commentCount} | Mesaj: ${messageCount} | Bildirim: ${notificationCount} | Favori: ${favoriteCount} | NoShow: ${noShowCount} | Hikaye: ${storyCount} | Antrenör: ${trainerCount} | Spor: ${sportCount} | Şehir: ${cityCount} | Ülke: ${countryCount}`,
    });

    // ===== 3) YETİM (ORPHAN) KAYITLAR =====
    // Listing'i olmayan Response'lar
    const orphanResponses = await prisma.response.count({
      where: { listing: { is: null as unknown as undefined } },
    }).catch(() => -1);
    // Listing'i olmayan Match'ler
    const orphanMatches = await prisma.match.count({
      where: { listing: { is: null as unknown as undefined } },
    }).catch(() => -1);
    // Match'i olmayan Rating'ler
    const orphanRatings = await prisma.rating.count({
      where: { match: { is: null as unknown as undefined } },
    }).catch(() => -1);

    // Use raw query for reliable orphan detection
    const orphanResponsesRaw: { count: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "Response" r 
      LEFT JOIN "Listing" l ON r."listingId" = l."id" 
      WHERE l."id" IS NULL`;
    const orphanMatchesRaw: { count: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "Match" m 
      LEFT JOIN "Listing" l ON m."listingId" = l."id" 
      WHERE l."id" IS NULL`;
    const orphanRatingsRaw: { count: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "Rating" r 
      LEFT JOIN "Match" m ON r."matchId" = m."id" 
      WHERE m."id" IS NULL`;

    const oResp = Number(orphanResponsesRaw[0]?.count ?? 0);
    const oMatch = Number(orphanMatchesRaw[0]?.count ?? 0);
    const oRating = Number(orphanRatingsRaw[0]?.count ?? 0);

    const totalOrphans = oResp + oMatch + oRating;
    checks.push({
      name: "Yetim Kayıtlar (Orphans)",
      status: totalOrphans > 0 ? "warn" : "ok",
      detail: totalOrphans === 0
        ? "Yetim kayıt bulunamadı"
        : `Yetim Response: ${oResp} | Yetim Match: ${oMatch} | Yetim Rating: ${oRating}`,
      count: totalOrphans,
    });

    // ===== 4) i18n ÇEVİRİ KONTROLÜ =====
    try {
      const messagesDir = path.join(process.cwd(), "messages");
      const files = fs.readdirSync(messagesDir).filter((f) => f.endsWith(".json"));
      const langData: Record<string, Record<string, unknown>> = {};

      for (const file of files) {
        const content = fs.readFileSync(path.join(messagesDir, file), "utf-8");
        langData[file.replace(".json", "")] = JSON.parse(content);
      }

      // Flatten keys
      function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
        const keys: string[] = [];
        for (const [k, v] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${k}` : k;
          if (v && typeof v === "object" && !Array.isArray(v)) {
            keys.push(...flattenKeys(v as Record<string, unknown>, fullKey));
          } else {
            keys.push(fullKey);
          }
        }
        return keys;
      }

      const trKeys = new Set(flattenKeys(langData["tr"] ?? {}));
      const missingPerLang: Record<string, string[]> = {};

      for (const [lang, data] of Object.entries(langData)) {
        if (lang === "tr") continue;
        const langKeys = new Set(flattenKeys(data as Record<string, unknown>));
        const missing = [...trKeys].filter((k) => !langKeys.has(k));
        if (missing.length > 0) {
          missingPerLang[lang] = missing;
        }
      }

      const totalMissing = Object.values(missingPerLang).reduce((s, arr) => s + arr.length, 0);
      if (totalMissing > 0) {
        const summary = Object.entries(missingPerLang)
          .map(([lang, keys]) => `${lang}: ${keys.length} eksik (${keys.slice(0, 3).join(", ")}${keys.length > 3 ? "..." : ""})`)
          .join(" | ");
        checks.push({ name: "i18n Çeviri Bütünlüğü", status: "warn", detail: summary, count: totalMissing });
      } else {
        checks.push({ name: "i18n Çeviri Bütünlüğü", status: "ok", detail: `${files.length} dil dosyası, ${trKeys.size} anahtar — tümü tam` });
      }
    } catch (e) {
      checks.push({ name: "i18n Çeviri Bütünlüğü", status: "error", detail: "Çeviri dosyaları okunamadı" });
    }

    // ===== 5) VERİ TUTARLILIĞI =====
    // Spor tanımlanmamış ilanlar
    const noSportListings = await prisma.listing.count({ where: { sportId: null as unknown as undefined } }).catch(() => 0);
    // Şehir tanımlanmamış kullanıcılar
    const noCityUsers = await prisma.user.count({ where: { cityId: null } });
    // Yasaklı ama aktif ilanı olan kullanıcılar
    const bannedWithListings = await prisma.user.count({
      where: {
        isBanned: true,
        listings: { some: { status: "OPEN" } },
      },
    });

    const dataIssues: string[] = [];
    if (noCityUsers > 0) dataIssues.push(`Şehirsiz kullanıcı: ${noCityUsers}`);
    if (bannedWithListings > 0) dataIssues.push(`Yasaklı ama aktif ilanı var: ${bannedWithListings}`);

    checks.push({
      name: "Veri Tutarlılığı",
      status: dataIssues.length > 0 ? "warn" : "ok",
      detail: dataIssues.length === 0 ? "Veri tutarlı" : dataIssues.join(" | "),
      count: dataIssues.length,
    });

    // ===== 6) KULLANILMAYAN REFERANS VERİSİ =====
    const unusedSports = await prisma.sport.count({
      where: { listings: { none: {} } },
    });
    checks.push({
      name: "Kullanılmayan Sporlar",
      status: unusedSports > 5 ? "warn" : "ok",
      detail: unusedSports === 0 ? "Tüm sporlar kullanılıyor" : `${unusedSports} spor henüz ilan almamış`,
      count: unusedSports,
    });

    // ===== 7) PERFORMANS =====
    const elapsed = Date.now() - startTime;
    checks.push({
      name: "Sağlık Testi Süresi",
      status: elapsed > 10000 ? "warn" : "ok",
      detail: `${elapsed}ms`,
    });

    // ===== SONUÇ =====
    const errorCount = checks.filter((c) => c.status === "error").length;
    const warnCount = checks.filter((c) => c.status === "warn").length;
    const overallStatus = errorCount > 0 ? "error" : warnCount > 0 ? "warn" : "ok";

    return NextResponse.json({
      success: true,
      overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      summary: { total: checks.length, ok: checks.filter((c) => c.status === "ok").length, warn: warnCount, error: errorCount },
    });
  } catch (err) {
    log.error("Health check error", { err });
    return NextResponse.json({ error: "Sağlık testi başarısız" }, { status: 500 });
  }
}
