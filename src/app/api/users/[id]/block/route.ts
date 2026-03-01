import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { z } from "zod";

const blockSchema = z.object({
  type: z.enum(["BLOCK", "RESTRICT"]).default("BLOCK"),
});

// GET /api/users/[id]/block — Engelleme durumunu kontrol et
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  const block = await prisma.userBlock.findUnique({
    where: { blockerId_blockedId: { blockerId: userId, blockedId: id } },
    select: { type: true },
  });

  return NextResponse.json({ success: true, data: block ?? null });
}

// POST /api/users/[id]/block — Engelle veya kısıtla
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  if (userId === id) return NextResponse.json({ error: "Kendinizi engelleyemezsiniz" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const parsed = blockSchema.safeParse(body);
  const type = parsed.success ? parsed.data.type : "BLOCK";

  const block = await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: userId, blockedId: id } },
    update: { type },
    create: { blockerId: userId, blockedId: id, type },
  });

  // Engellenince varsa follow ilişkisini kaldır
  if (type === "BLOCK") {
    await prisma.follow.deleteMany({
      where: {
        OR: [
          { followerId: userId, followingId: id },
          { followerId: id, followingId: userId },
        ],
      },
    });
  }

  const label = type === "BLOCK" ? "Kullanıcı engellendi" : "Kullanıcı kısıtlandı";
  return NextResponse.json({ success: true, data: block, message: label });
}

// DELETE /api/users/[id]/block — Engeli kaldır
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });

  await prisma.userBlock.deleteMany({
    where: { blockerId: userId, blockedId: id },
  });

  return NextResponse.json({ success: true, message: "Engel kaldırıldı" });
}
