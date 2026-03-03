import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/api-utils";

// GET /api/settings/blocked-users — engellenen kullanıcıları listele
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return unauthorized();

  const blocks = await prisma.userBlock.findMany({
    where: { blockerId: userId },
    include: {
      blocked: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: blocks });
}
