import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("messages");

// GET /api/messages — tüm konuşmalar (match bazında)
export async function GET(_req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    // Kullanıcının dahil olduğu eşleşmeler
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      select: {
        id: true,
        createdAt: true,
        listing: {
          select: {
            id: true,
            sport: { select: { name: true, icon: true } },
            dateTime: true,
          },
        },
        user1: { select: { id: true, name: true, avatarUrl: true } },
        user2: { select: { id: true, name: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, senderId: true, read: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const conversations = matches.map((m) => {
      const partner = m.user1.id === userId ? m.user2 : m.user1;
      const lastMsg = m.messages[0] ?? null;
      const hasUnread = lastMsg && !lastMsg.read && lastMsg.senderId !== userId;

      return {
        matchId: m.id,
        partner,
        listing: m.listing,
        lastMessage: lastMsg
          ? {
              content: lastMsg.content.slice(0, 80),
              createdAt: lastMsg.createdAt,
              isMine: lastMsg.senderId === userId,
            }
          : null,
        hasUnread,
      };
    });

    return NextResponse.json({ success: true, data: conversations });
  } catch (error) {
    log.error("Konuşmalar yüklenemedi", error);
    return NextResponse.json({ success: false, error: "Konuşmalar yüklenemedi" }, { status: 500 });
  }
}
