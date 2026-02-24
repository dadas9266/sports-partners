import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/api-utils";
import { createLogger } from "@/lib/logger";

const log = createLogger("sse:notifications");

// GET /api/notifications/stream — Server-Sent Events ile gerçek zamanlı bildirim
export async function GET(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  let lastCheck = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      // Bağlantı kuruldu mesajı
      controller.enqueue(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

      const send = (data: unknown) => {
        try {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch {
          // bağlantı kapandı
        }
      };

      // Her 8 saniyede yeni bildirim ve mesajları kontrol et
      const interval = setInterval(async () => {
        if (req.signal.aborted) {
          clearInterval(interval);
          return;
        }

        try {
          const [newNotifs, unreadMessages] = await Promise.all([
            prisma.notification.findMany({
              where: { userId, createdAt: { gt: lastCheck } },
              orderBy: { createdAt: "desc" },
              take: 10,
              select: { id: true, type: true, title: true, body: true, link: true, read: true, createdAt: true },
            }),
            prisma.message.count({
              where: { receiverId: userId, read: false },
            }),
          ]);

          if (newNotifs.length > 0) {
            send({ type: "notifications", data: newNotifs });
          }

          send({ type: "heartbeat", unreadMessages, ts: Date.now() });
          lastCheck = new Date();
        } catch (err) {
          log.error("SSE polling hatası", err);
        }
      }, 8000);

      // Bağlantı kesilince temizle
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        try { controller.close(); } catch { /* ignore */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
