import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdminClient } from "@/lib/storage";
import { updateTrustScore } from "@/lib/trust-score";

/**
 * GET /api/cron/cleanup-expired
 *
 * Vercel Cron Job — her gece 03:00 UTC çalışır.
 * 1. Tarih/saati geçmiş ya da 30+ gün eski OPEN ilanları EXPIRED yapar.
 * 2. EXPIRED ilanların PENDING tekliflerini (Response) REJECTED olarak işaretler
 *    ve teklif göndericiye bildirim gönderir.
 * 3. expiresAt geçmiş PENDING DirectChallenge'ları EXPIRED yapar +
 *    tepki verilmemiş DirectChallenge'ları alıcı listesinden temizler.
 * 4. Eski bildirimleri / şifre tokenlarını temizler.
 *
 * Güvenlik: CRON_SECRET header kontrolü.
 */
export async function GET(req: NextRequest) {
  // Vercel Cron Security — fail-closed: block if no secret configured
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // ── 1. Süresi dolmuş ilanları EXPIRED yap ─────────────────────────────────
  // a) Etkinlik tarihi/saati geçmiş açık ilanlar (OPEN veya MATCHED)
  const expiredByDate = await prisma.listing.updateMany({
    where: {
      status: { in: ["OPEN", "MATCHED"] },
      dateTime: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  // b) 30 günden eski ama henüz EXPIRED olmamış açık ilanlar (güvenlik ağı)
  const expiredByAge = await prisma.listing.updateMany({
    where: {
      status: "OPEN",
      createdAt: { lt: thirtyDaysAgo },
    },
    data: { status: "EXPIRED" },
  });

  // c) Hızlı ilan (isQuick) — expiresAt geçmişse kapat
  const expiredQuick = await prisma.listing.updateMany({
    where: {
      status: "OPEN",
      expiresAt: { not: null, lt: now },
    },
    data: { status: "EXPIRED" },
  });

  const totalExpiredListings = expiredByDate.count + expiredByAge.count + expiredQuick.count;

  // ── 2. EXPIRED ilanların PENDING tekliflerini REJECTED yap ────────────────
  // Önce hangi ilanların EXPIRED olduğunu bul (cevap verilen hariç)
  const expiredListingIds = await prisma.listing.findMany({
    where: { status: "EXPIRED" },
    select: { id: true },
  });
  const expiredIds = expiredListingIds.map((l: { id: string }) => l.id);

  let rejectedResponses = { count: 0 };
  if (expiredIds.length > 0) {
    // PENDING teklifleri bul (bildirim için)
    const pendingResponses = await prisma.response.findMany({
      where: {
        listingId: { in: expiredIds },
        status: "PENDING",
      },
      select: {
        id: true,
        userId: true, // teklifi gönderen
        listing: { select: { id: true, sport: { select: { name: true } }, dateTime: true } },
      },
    });

    if (pendingResponses.length > 0) {
      // Toplu REJECTED yap
      rejectedResponses = await prisma.response.updateMany({
        where: {
          listingId: { in: expiredIds },
          status: "PENDING",
        },
        data: { status: "REJECTED" },
      });

      // Her göndericiye bildirim
      for (const resp of pendingResponses) {
        try {
          await (prisma as any).notification.create({
            data: {
              userId: resp.userId,
              type: "SYSTEM",
              title: "📅 İlan süresi doldu",
              body: `Teklif gönderdiğiniz "${resp.listing.sport?.name ?? "Spor"}" ilanının süresi doldu. Teklif otomatik olarak iptal edildi.`,
              link: `/ilan/${resp.listing.id}`,
            },
          });
        } catch {
          // bildirim hatası kritik değil
        }
      }
    }
  }

  // ── 3. DirectChallenge — süresi geçmiş PENDING'leri EXPIRED yap ──────────
  const expiredChallenges = await (prisma as any).directChallenge.updateMany({
    where: {
      status: "PENDING",
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  // ── 4. Eski bildirimleri temizle ──────────────────────────────────────────
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const deletedNotifs = await prisma.notification.deleteMany({
    where: {
      read: true,
      createdAt: { lt: ninetyDaysAgo },
    },
  });

  // ── 5. Süresi dolmuş şifre tokenlarını temizle ─────────────────────────────
  const deletedTokens = await prisma.passwordResetToken.deleteMany({
    where: {
      expiresAt: { lt: now },
    },
  });

  // ── 6. Süresi dolmuş story'leri temizle (DB + Supabase Storage) ────────────
  // Önce medya URL'lerini topla, sonra storage'dan sil, son olarak DB'den temizle
  const expiredStories = await prisma.story.findMany({
    where: { expiresAt: { lt: now } },
    select: { id: true, mediaUrl: true },
  });

  let deletedStorageFiles = 0;
  if (expiredStories.length > 0) {
    try {
      const supabase = getSupabaseAdminClient();
      for (const story of expiredStories) {
        if (!story.mediaUrl) continue;
        // URL'den bucket ve path'i çıkar:
        // Pattern: .../storage/v1/object/public/{bucket}/{path}
        const match = story.mediaUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
        if (match) {
          const [, bucket, path] = match;
          const { error } = await supabase.storage.from(bucket).remove([decodeURIComponent(path)]);
          if (!error) deletedStorageFiles++;
        }
      }
    } catch {
      // Storage hatası kritik değil, DB temizliğine devam et
    }
  }

  const deletedStories = await prisma.story.deleteMany({
    where: { expiresAt: { lt: now } },
  });

  // ── 6b. EXPIRED ilanların equipment görsellerini temizle ──────────────────
  let deletedEquipmentFiles = 0;
  try {
    const expiredEquipmentListings = await prisma.listing.findMany({
      where: { status: "EXPIRED", type: "EQUIPMENT" },
      select: { id: true, equipmentDetail: { select: { images: true } } },
      take: 50,
    });
    const supabase = getSupabaseAdminClient();
    for (const listing of expiredEquipmentListings) {
      const images = (listing.equipmentDetail as any)?.images;
      if (!Array.isArray(images)) continue;
      for (const imgUrl of images) {
        if (typeof imgUrl !== "string") continue;
        const match = imgUrl.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
        if (match) {
          const [, bucket, path] = match;
          const { error } = await supabase.storage.from(bucket).remove([decodeURIComponent(path)]);
          if (!error) deletedEquipmentFiles++;
        }
      }
    }
  } catch {
    // Equipment image cleanup hatası kritik değil
  }

  // ── 7. Trust Score toplu güncelleme — son 7 günde aktif kullanıcılar ────────
  let trustScoreUpdated = 0;
  try {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await prisma.user.findMany({
      where: { lastSeenAt: { gte: sevenDaysAgo }, isBot: false },
      select: { id: true },
      take: 200, // Batch limiti
    });
    for (const u of activeUsers) {
      try {
        await updateTrustScore(u.id);
        trustScoreUpdated++;
      } catch {
        // Bireysel kullanıcı hatası diğerlerini etkilemesin
      }
    }
  } catch {
    // Trust score batch hatası kritik değil
  }

  return NextResponse.json({
    ok: true,
    summary: {
      expiredListings: {
        byDate: expiredByDate.count,
        byAge: expiredByAge.count,
        quickExpired: expiredQuick.count,
        total: totalExpiredListings,
      },
      rejectedResponses: rejectedResponses.count,
      expiredChallenges: expiredChallenges.count,
      deletedNotifications: deletedNotifs.count,
      deletedPasswordTokens: deletedTokens.count,
      deletedStories: { db: deletedStories.count, storage: deletedStorageFiles },
      deletedEquipmentFiles,
      trustScoreUpdated,
    },
    timestamp: now.toISOString(),
  });
}
