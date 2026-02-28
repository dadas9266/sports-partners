import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("match-location");

// Haversine formülü — km cinsinden mesafe
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Konum Gönder — POST /api/matches/[matchId]/location
export async function POST(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId)
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    const { matchId } = await params;
    const { lat, lng } = await request.json();

    if (typeof lat !== "number" || typeof lng !== "number")
      return NextResponse.json({ error: "Geçerli koordinat gerekli" }, { status: 400 });

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match)
      return NextResponse.json({ error: "Maç bulunamadı" }, { status: 404 });

    const isUser1 = match.user1Id === userId;
    const isUser2 = match.user2Id === userId;
    if (!isUser1 && !isUser2)
      return NextResponse.json({ error: "Bu maça ait değilsiniz" }, { status: 403 });

    // Koordinatları kaydet
    const data: Record<string, unknown> = isUser1
      ? { lat1: lat, lng1: lng }
      : { lat2: lat, lng2: lng };

    const updated = await prisma.match.update({ where: { id: matchId }, data });

    // Her iki koordinat da varsa mesafe kontrolü
    const u1Lat = isUser1 ? lat : updated.lat1;
    const u1Lng = isUser1 ? lng : updated.lng1;
    const u2Lat = isUser2 ? lat : updated.lat2;
    const u2Lng = isUser2 ? lng : updated.lng2;

    if (u1Lat && u1Lng && u2Lat && u2Lng) {
      const distKm = haversineKm(u1Lat, u1Lng, u2Lat, u2Lng);
      if (distKm <= 0.5) {
        // 500m içinde — geo doğrulandı, trust score +30
        await prisma.match.update({
          where: { id: matchId },
          data: {
            locationVerifiedAt: new Date(),
            trustScore: { increment: 30 },
          },
        });
        log.info("Geo doğrulandı", { matchId, distKm });
        return NextResponse.json({ verified: true, distanceKm: distKm });
      }
      return NextResponse.json({ verified: false, distanceKm: distKm });
    }

    return NextResponse.json({ saved: true, message: "Koordinat kaydedildi, rakip bekleniyor" });
  } catch (err) {
    log.error("Lokasyon hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
