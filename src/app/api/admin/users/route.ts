import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, isError } from "@/lib/rbac";

// GET /api/admin/users – Tüm kullanıcıları listele (Yalnızca Admin)
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
        isAdmin: true,
        isBanned: true,
        noShowCount: true,
        warnCount: true,
        lastSeenAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count(),
  ]);

  return NextResponse.json({
    users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// PATCH /api/admin/users – Kullanıcı ban/unban veya isAdmin değiştir
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;

  const body = await req.json();
  const { userId, isBanned, isAdmin } = body as {
    userId?: string;
    isBanned?: boolean;
    isAdmin?: boolean;
  };

  if (!userId) {
    return NextResponse.json({ error: "userId zorunludur" }, { status: 400 });
  }

  // Kendini ban'layamasın / admin kaldıramasın
  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "Kendi hesabınızı bu endpoint ile değiştiremezsiniz" },
      { status: 400 }
    );
  }

  const updateData: Record<string, boolean> = {};
  if (typeof isBanned === "boolean") updateData.isBanned = isBanned;
  if (typeof isAdmin === "boolean") updateData.isAdmin = isAdmin;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Güncellenecek alan yok" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: { id: true, name: true, isAdmin: true, isBanned: true },
  });

  return NextResponse.json({ user: updated });
}
