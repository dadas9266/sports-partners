import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, unauthorized, notFound, isValidId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";
import { createNotification, NOTIF } from "@/lib/notifications";
import { z } from "zod";

const log = createLogger("messages:match");

// GET /api/messages/[matchId] — bir eşleşmenin mesajlarını getir
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();
    if (!isValidId(matchId)) return notFound("Konuşma bulunamadı");

    // Kullanıcının bu eşleşmede olup olmadığını kontrol et
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { user1Id: true, user2Id: true },
    });
    if (!match) return notFound("Konuşma bulunamadı");
    if (match.user1Id !== userId && match.user2Id !== userId) {
      return NextResponse.json({ success: false, error: "Bu konuşmaya erişim yetkiniz yok" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const limit = 30;

    const messages = await prisma.message.findMany({
      where: { matchId },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        content: true,
        createdAt: true,
        read: true,
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    // Okunmamış mesajları okundu yap
    await prisma.message.updateMany({
      where: { matchId, receiverId: userId, read: false },
      data: { read: true },
    });

    return NextResponse.json({
      success: true,
      data: messages.reverse(),
      nextCursor: hasMore ? messages[0]?.id : null,
    });
  } catch (error) {
    log.error("Mesajlar yüklenemedi", error);
    return NextResponse.json({ success: false, error: "Mesajlar yüklenemedi" }, { status: 500 });
  }
}

const sendSchema = z.object({
  content: z.string().min(1, "Mesaj boş olamaz").max(1000, "Mesaj çok uzun"),
});

// POST /api/messages/[matchId] — yeni mesaj gönder
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await params;
    const userId = await getCurrentUserId();
    if (!userId) return unauthorized();
    if (!isValidId(matchId)) return notFound("Konuşma bulunamadı");

    const body = await req.json();
    const { content } = sendSchema.parse(body);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { user1Id: true, user2Id: true },
    });
    if (!match) return notFound("Konuşma bulunamadı");
    if (match.user1Id !== userId && match.user2Id !== userId) {
      return NextResponse.json({ success: false, error: "Bu konuşmaya erişim yetkiniz yok" }, { status: 403 });
    }

    const receiverId = match.user1Id === userId ? match.user2Id : match.user1Id;

    const message = await prisma.message.create({
      data: { matchId, senderId: userId, receiverId, content },
      select: {
        id: true,
        content: true,
        createdAt: true,
        read: true,
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Bildirim gönder (karşı tarafa)
    const sender = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    await createNotification(
      NOTIF.newMessage(receiverId, sender?.name ?? "Biri", matchId, content.slice(0, 60))
    );

    log.info("Mesaj gönderildi", { matchId, senderId: userId });
    return NextResponse.json({ success: true, data: message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.issues[0].message }, { status: 400 });
    }
    log.error("Mesaj gönderilemedi", error);
    return NextResponse.json({ success: false, error: "Mesaj gönderilemedi" }, { status: 500 });
  }
}
