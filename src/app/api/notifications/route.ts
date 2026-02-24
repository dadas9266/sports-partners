import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("notifications");

// Bildirimleri listele
export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const onlyUnread = searchParams.get("unread") === "true";

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId, ...(onlyUnread ? { read: false } : {}) },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return NextResponse.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    log.error("Bildirimler yüklenirken hata", error);
    return NextResponse.json({ success: false, error: "Bildirimler yüklenemedi" }, { status: 500 });
  }
}

// Bildirimleri okundu işaretle
export async function PATCH(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ success: false, error: "Giriş yapmanız gerekiyor" }, { status: 401 });
    }

    const body = await request.json();
    const { ids, all } = body as { ids?: string[]; all?: boolean };

    if (all) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
    } else if (ids && ids.length > 0) {
      await prisma.notification.updateMany({
        where: { userId, id: { in: ids } },
        data: { read: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error("Bildirim güncelleme hatası", error);
    return NextResponse.json({ success: false, error: "Güncelleme başarısız" }, { status: 500 });
  }
}
