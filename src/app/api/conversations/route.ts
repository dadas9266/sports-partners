import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { z } from "zod";

const log = createLogger("conversations");

// GET /api/conversations — tüm konuşmalar (match bazlı + direkt)
export async function GET(_req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    // 1. Match bazlı konuşmalar
    const matches = await prisma.match.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
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
      take: 50,
    });

    const matchConversations = matches.map((m) => {
      const partner = m.user1.id === userId ? m.user2 : m.user1;
      const lastMsg = m.messages[0] ?? null;
      const hasUnread = !!(lastMsg && !lastMsg.read && lastMsg.senderId !== userId);
      return {
        type: "match" as const,
        id: m.id,
        matchId: m.id,
        partner,
        listing: m.listing,
        lastMessage: lastMsg
          ? { content: lastMsg.content.slice(0, 80), createdAt: lastMsg.createdAt, isMine: lastMsg.senderId === userId }
          : null,
        hasUnread,
        updatedAt: lastMsg?.createdAt ?? m.createdAt,
      };
    });

    // 2. Direkt konuşmalar
    const directConvs = await prisma.directConversation.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      select: {
        id: true,
        createdAt: true,
        user1: { select: { id: true, name: true, avatarUrl: true } },
        user2: { select: { id: true, name: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, createdAt: true, senderId: true, read: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const directConversations = directConvs.map((c) => {
      const partner = c.user1.id === userId ? c.user2 : c.user1;
      const lastMsg = c.messages[0] ?? null;
      const hasUnread = !!(lastMsg && !lastMsg.read && lastMsg.senderId !== userId);
      return {
        type: "direct" as const,
        id: c.id,
        conversationId: c.id,
        partner,
        listing: null,
        lastMessage: lastMsg
          ? { content: lastMsg.content.slice(0, 80), createdAt: lastMsg.createdAt, isMine: lastMsg.senderId === userId }
          : null,
        hasUnread,
        updatedAt: lastMsg?.createdAt ?? c.createdAt,
      };
    });

    // 3. Birleştir ve tarihe göre sırala (en yeni üstte)
    const all = [...matchConversations, ...directConversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json({ success: true, data: all });
  } catch (error) {
    log.error("Konuşmalar yüklenemedi", error);
    return NextResponse.json({ success: false, error: "Konuşmalar yüklenemedi" }, { status: 500 });
  }
}

const createSchema = z.object({
  targetUserId: z.string().min(1),
});

// POST /api/conversations — direkt konuşma başlat veya mevcut olanı getir
export async function POST(req: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();

    const body = await req.json();
    const { targetUserId } = createSchema.parse(body);

    if (targetUserId === userId) {
      return NextResponse.json({ success: false, error: "Kendinizle mesajlaşamazsınız" }, { status: 400 });
    }

    // Hedef kullanıcı var mı?
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, avatarUrl: true, whoCanMessage: true },
    });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // Gizlilik kontrolü: bu kullanıcıya mesaj yazabilir miyiz?
    if (targetUser.whoCanMessage === "NOBODY") {
      return NextResponse.json({ success: false, error: "Bu kullanıcı mesaj almıyor" }, { status: 403 });
    }
    if (targetUser.whoCanMessage === "FOLLOWERS") {
      const isFollowing = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: userId, followingId: targetUserId } },
      });
      if (!isFollowing) {
        return NextResponse.json({ success: false, error: "Bu kullanıcı yalnızca takipçilerinden mesaj kabul ediyor" }, { status: 403 });
      }
    }

    // Engel kontrolü — blocked users cannot start conversations
    const block = await prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: userId, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: userId },
        ],
      },
    });
    if (block) {
      return NextResponse.json(
        { success: false, error: "Bu kullanıcıyla mesajlaşamazsınız" },
        { status: 403 }
      );
    }

    // Canonical order: user1Id < user2Id (unique constraint)
    const [user1Id, user2Id] = [userId, targetUserId].sort();

    const conversation = await prisma.directConversation.upsert({
      where: { user1Id_user2Id: { user1Id, user2Id } },
      create: { user1Id, user2Id },
      update: {},
      select: { id: true },
    });

    return NextResponse.json({ success: true, data: { id: conversation.id, partner: targetUser } });
  } catch (error) {
    log.error("Konuşma başlatılamadı", error);
    return NextResponse.json({ success: false, error: "Konuşma başlatılamadı" }, { status: 500 });
  }
}
