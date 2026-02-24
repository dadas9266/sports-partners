/**
 * Uygulama içi bildirim oluşturma yardımcı fonksiyonu.
 * API route'larından çağrılır — eşleşme, yanıt, puan gibi olaylarda.
 */
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  try {
    return await prisma.notification.create({ data: input });
  } catch {
    // Bildirim başarısız olursa ana işlemi engelleme
    console.error("[notifications] Bildirim oluşturulamadı:", input);
    return null;
  }
}

export const NOTIF = {
  newResponse: (listingId: string, responderName: string) => ({
    type: "NEW_RESPONSE" as NotificationType,
    title: "Yeni Karşılık",
    body: `${responderName} ilanınıza karşılık verdi.`,
    link: `/ilan/${listingId}`,
  }),
  accepted: (listingId: string) => ({
    type: "RESPONSE_ACCEPTED" as NotificationType,
    title: "Karşılığınız Kabul Edildi! 🎉",
    body: "Karşılığınız kabul edildi. İletişim bilgilerini görmek için ilana bakın.",
    link: `/ilan/${listingId}`,
  }),
  rejected: (listingId: string) => ({
    type: "RESPONSE_REJECTED" as NotificationType,
    title: "Karşılığınız Reddedildi",
    body: "Maalesef karşılığınız reddedildi.",
    link: `/ilan/${listingId}`,
  }),
  newMatch: (listingId: string) => ({
    type: "NEW_MATCH" as NotificationType,
    title: "Eşleşme Gerçekleşti! 🏆",
    body: "Tebrikler! Bir eşleşme gerçekleşti.",
    link: `/ilan/${listingId}`,
  }),
  newRating: (score: number) => ({
    type: "NEW_RATING" as NotificationType,
    title: "Yeni Değerlendirme",
    body: `Bir eşleşme sonrası ${score} yıldız aldınız!`,
    link: `/profil`,
  }),
  newFollower: (userId: string, followerName: string, followerId: string) => ({
    userId,
    type: "NEW_FOLLOWER" as NotificationType,
    title: "Yeni Takipçi",
    body: `${followerName} sizi takip etmeye başladı.`,
    link: `/profil/${followerId}`,
  }),
  newMessage: (userId: string, senderName: string, matchId: string, preview: string) => ({
    userId,
    type: "NEW_MESSAGE" as NotificationType,
    title: `${senderName} mesaj gönderdi`,
    body: preview,
    link: `/mesajlar/${matchId}`,
  }),
};
