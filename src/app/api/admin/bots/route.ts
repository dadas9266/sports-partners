import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";

// Admin yetkisi kontrolü
async function requireAdmin(userId: string | null) {
  if (!userId) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
  return user?.isAdmin === true;
}

// GET /api/admin/bots — Bot listesi
export async function GET() {
  const userId = await getCurrentUserId();
  if (!(await requireAdmin(userId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const bots = await prisma.user.findMany({
    where: { isBot: true },
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      birthDate: true,
      gender: true,
      botPersona: true,
      cityId: true,
      city: { select: { id: true, name: true, country: { select: { id: true, name: true } } } },
      sports: { select: { id: true, name: true, icon: true } },
      createdAt: true,
      _count: { select: { listings: true, matches1: true, matches2: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: bots });
}

// POST /api/admin/bots — Yeni bot oluştur
export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!(await requireAdmin(userId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const body = await req.json();
  const { name, gender, birthYear, cityId, sportIds, botPersona } = body;

  if (!name || !gender || !birthYear || !cityId) {
    return NextResponse.json({ error: "name, gender, birthYear, cityId zorunlu" }, { status: 400 });
  }

  const birthDate = new Date(birthYear, 0, 1);
  const email = `bot_${Date.now()}@sporpartner.internal`;

  const bot = await prisma.user.create({
    data: {
      name,
      email,
      gender,
      birthDate,
      cityId,
      botPersona: botPersona ?? null,
      isBot: true,
      onboardingDone: true,
      sports: sportIds?.length ? { connect: sportIds.map((id: string) => ({ id })) } : undefined,
    },
    select: { id: true, name: true, email: true, isBot: true, botPersona: true },
  });

  return NextResponse.json({ success: true, data: bot }, { status: 201 });
}

// DELETE /api/admin/bots?id=xxx — Bot sil
export async function DELETE(req: Request) {
  const userId = await getCurrentUserId();
  if (!(await requireAdmin(userId))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const botId = searchParams.get("id");
  if (!botId) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  // Sadece bot kullanıcıları silinebilir
  const bot = await prisma.user.findUnique({ where: { id: botId }, select: { isBot: true } });
  if (!bot?.isBot) return NextResponse.json({ error: "Bu kullanıcı bot değil" }, { status: 400 });

  await prisma.user.delete({ where: { id: botId } });

  return NextResponse.json({ success: true });
}
