import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";

const log = createLogger("match-otp");

// Güven skoru yardımcısı — mevcut alanlardan hesapla
async function recalcTrustScore(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { otps: { where: { usedAt: { not: null } } } },
  });
  if (!match) return;

  let score = 0;
  // OTP: her iki taraf onayladıysa +40
  const verifiedUsers = new Set(match.otps.map((o: { userId: string }) => o.userId));
  if (verifiedUsers.has(match.user1Id) && verifiedUsers.has(match.user2Id)) score += 40;
  // Geo: koordinatlar kayıtlıysa +30
  if (match.locationVerifiedAt) score += 30;
  // Üçüncü taraf: onaylandıysa +30
  if (match.approvedAt) score += 30;

  await prisma.match.update({ where: { id: matchId }, data: { trustScore: score } });
}

// OTP Oluştur — POST /api/matches/[matchId]/otp
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId)
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    const { matchId } = await params;

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match)
      return NextResponse.json({ error: "Maç bulunamadı" }, { status: 404 });

    const isParticipant = match.user1Id === userId || match.user2Id === userId;
    if (!isParticipant)
      return NextResponse.json({ error: "Bu maça ait değilsiniz" }, { status: 403 });

    if (match.status !== "SCHEDULED" && match.status !== "ONGOING")
      return NextResponse.json({ error: "Maç doğrulama için uygun değil" }, { status: 400 });

    // Aktif OTP var mı?
    const existing = await prisma.matchOtp.findFirst({
      where: { matchId, userId, expiresAt: { gt: new Date() }, usedAt: null },
    });
    if (existing)
      return NextResponse.json({ code: existing.code, expiresAt: existing.expiresAt });

    // Yeni 6 haneli OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika

    await prisma.matchOtp.create({ data: { matchId, userId, code, expiresAt } });

    // Karşı tarafa bildirim gönder
    const otherId = match.user1Id === userId ? match.user2Id : match.user1Id;
    await createNotification({
      userId: otherId,
      type: "MATCH_OTP_REQUESTED",
      title: "Маç Doğrulama Talebi",
      body: "Rakibiniz maçı doğrulamak istiyor. Onaylamak için tıklayın.",
      link: `/eslesmeler/${matchId}`,
    });

    log.info("OTP oluşturuldu", { matchId, userId });
    return NextResponse.json({ code, expiresAt });
  } catch (err) {
    log.error("OTP oluşturma hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

// OTP Doğrula — PUT /api/matches/[matchId]/otp
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const userId = await getCurrentUserId();
    if (!userId)
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });

    const { matchId } = await params;
    const { code } = await request.json();

    if (!code)
      return NextResponse.json({ error: "Kod gerekli" }, { status: 400 });

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match)
      return NextResponse.json({ error: "Maç bulunamadı" }, { status: 404 });

    const isParticipant = match.user1Id === userId || match.user2Id === userId;
    if (!isParticipant)
      return NextResponse.json({ error: "Bu maça ait değilsiniz" }, { status: 403 });

    // Karşı tarafın kodunu doğrula (kendi kodunu değil)
    const otherId = match.user1Id === userId ? match.user2Id : match.user1Id;
    const otp = await prisma.matchOtp.findFirst({
      where: {
        matchId,
        userId: otherId,
        code,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!otp)
      return NextResponse.json({ error: "Geçersiz veya süresi dolmuş kod" }, { status: 400 });

    await prisma.matchOtp.update({ where: { id: otp.id }, data: { usedAt: new Date() } });

    // Match ONGOING yap + güven skoru güncelle
    await prisma.match.update({
      where: { id: matchId },
      data: { status: "ONGOING" },
    });
    await recalcTrustScore(matchId);

    log.info("OTP doğrulandı", { matchId, userId });
    return NextResponse.json({ success: true, message: "Maç doğrulandı!" });
  } catch (err) {
    log.error("OTP doğrulama hatası", err);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
