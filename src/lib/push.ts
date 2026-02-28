/**
 * Web Push — sunucu tarafı yardımcı
 *
 * VAPID anahtar üretimi için terminalde:
 *   npx web-push generate-vapid-keys
 *
 * Oluşturulan anahtarları .env dosyasına ekleyin:
 *   VAPID_SUBJECT="mailto:admin@sporpartner.com"
 *   VAPID_PUBLIC_KEY="..."
 *   VAPID_PRIVATE_KEY="..."
 */
import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import { createLogger } from "@/lib/logger";

const log = createLogger("push");

let initialized = false;

function initWebPush() {
  if (initialized) return;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) {
    log.warn("VAPID keys eksik — push bildirimleri devre dışı. .env dosyasına ekleyin.");
    return;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
}

export interface PushPayload {
  title: string;
  body: string;
  link?: string;
  tag?: string;
}

export interface SubscriptionData {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Tek bir aboneye push bildirimi gönder */
export async function sendPushToSubscription(
  sub: SubscriptionData,
  payload: PushPayload
): Promise<"ok" | "expired" | "error"> {
  initWebPush();
  if (!initialized) return "error";

  const pushSub: WebPushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };

  try {
    await webpush.sendNotification(pushSub, JSON.stringify(payload));
    return "ok";
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 410 || status === 404) return "expired"; // abonelik geçersiz
    log.error("Push gönderme hatası", { err });
    return "error";
  }
}

/** Bir kullanıcının tüm aboneliklerine push bildirimi gönder */
export async function sendPushToUser(
  subscriptions: SubscriptionData[],
  payload: PushPayload
): Promise<void> {
  await Promise.allSettled(
    subscriptions.map((sub) => sendPushToSubscription(sub, payload))
  );
}
