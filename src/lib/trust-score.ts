import { prisma } from "@/lib/prisma";

/**
 * Dinamik Trust Score hesaplama.
 * Başlangıç: 100 puan. Minimum: 0, Maksimum: 200.
 *
 * Puanlama kuralları:
 * - No-show raporu alma: -25 (her biri)
 * - Pozitif rating (4-5 yıldız): +5 (her biri)
 * - Negatif rating (1-2 yıldız): -10 (her biri)
 * - 5+ başarılı maç: +10 bonus
 * - 10+ başarılı maç: +20 bonus ek
 * - Maç iptali (DISPUTED): -5 (her biri)
 */

const BASE_SCORE = 100;
const MIN_SCORE = 0;
const MAX_SCORE = 200;

export async function computeTrustScore(userId: string): Promise<number> {
  const [noShowCount, ratings, matchCounts] = await Promise.all([
    prisma.noShowReport.count({ where: { reportedId: userId } }),
    prisma.rating.findMany({
      where: { ratedUserId: userId },
      select: { score: true },
    }),
    prisma.match.count({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: "COMPLETED",
      },
    }),
  ]);

  let score = BASE_SCORE;

  // No-show cezası
  score -= noShowCount * 25;

  // Rating etkileri
  for (const r of ratings) {
    if (r.score >= 4) score += 5;
    else if (r.score <= 2) score -= 10;
  }

  // Başarılı maç bonusu
  if (matchCounts >= 5) score += 10;
  if (matchCounts >= 10) score += 20;

  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, score));
}

/**
 * Güven skorunu hesapla ve User.totalPoints'e kaydet.
 * Cron job veya maç tamamlandığında çağrılır.
 */
export async function updateTrustScore(userId: string): Promise<number> {
  const score = await computeTrustScore(userId);

  await prisma.user.update({
    where: { id: userId },
    data: { totalPoints: score },
  });

  return score;
}
