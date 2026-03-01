import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized, notFound, isValidId, sanitizeText } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications";
import type { NotificationType } from "@prisma/client";
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { z } from "zod";

const log = createLogger("conversations:messages");

// GET /api/conversations/[id]/messages
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();
    if (!isValidId(id)) return notFound("Konuşma bulunamadı");

    const conv = await prisma.directConversation.findUnique({
      where: { id },
      select: { user1Id: true, user2Id: true },
    });
    if (!conv) return notFound("Konuşma bulunamadı");
    if (conv.user1Id !== userId && conv.user2Id !== userId) {
      return NextResponse.json({ success: false, error: "Bu konuşmaya erişim yetkiniz yok" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 30;

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        receiverId: true,
        content: true,
        createdAt: true,
        read: true,
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Okunmamış mesajları okundu olarak işaretle
    await prisma.message.updateMany({
      where: { conversationId: id, receiverId: userId, read: false },
      data: { read: true },
    });

    return NextResponse.json({
      success: true,
      data: { messages: messages.reverse(), nextCursor: hasMore ? messages[0]?.id : null },
    });
  } catch (error) {
    log.error("Mesajlar yüklenemedi", error);
    return NextResponse.json({ success: false, error: "Mesajlar yüklenemedi" }, { status: 500 });
  }
}

const sendSchema = z.object({
  content: z.string().min(1, "Mesaj boş olamaz").max(1000, "Mesaj çok uzun"),
});

// POST /api/conversations/[id]/messages
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();
    if (!isValidId(id)) return notFound("Konuşma bulunamadı");

    const rl = await checkRateLimit(userId, "message");
    if (!rl.allowed) return rateLimitResponse(rl.remaining);

    const body = await req.json();
    const { content: rawContent } = sendSchema.parse(body);
    const content = sanitizeText(rawContent);

    const conv = await prisma.directConversation.findUnique({
      where: { id },
      select: { user1Id: true, user2Id: true },
    });
    if (!conv) return notFound("Konuşma bulunamadı");
    if (conv.user1Id !== userId && conv.user2Id !== userId) {
      return NextResponse.json({ success: false, error: "Bu konuşmaya erişim yetkiniz yok" }, { status: 403 });
    }

    const receiverId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;

    const message = await prisma.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        receiverId,
        content,
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        receiverId: true,
        content: true,
        createdAt: true,
        read: true,
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Bildirim gönder
    try {
      await createNotification({
        userId: receiverId,
        type: "NEW_MESSAGE" as NotificationType,
        title: `${message.sender.name ?? "Biri"} mesaj gönderdi`,
        body: content.slice(0, 80),
        link: `/mesajlar/dm/${id}`,
      });
    } catch {
      // Bildirim hatası mesaj gönderimini engellemez
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 });
  } catch (error) {
    log.error("Mesaj gönderilemedi", error);
    return NextResponse.json({ success: false, error: "Mesaj gönderilemedi" }, { status: 500 });
  }
}
