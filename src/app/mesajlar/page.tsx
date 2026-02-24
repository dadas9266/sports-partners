"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";
import { getConversations } from "@/services/api";
import type { Conversation } from "@/types";

export default function MesajlarPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/giris");
      return;
    }
    if (status !== "authenticated") return;

    getConversations()
      .then((res) => {
        if (res.success && res.data) setConversations(res.data);
      })
      .catch(() => toast.error("Mesajlar yüklenemedi"))
      .finally(() => setLoading(false));
  }, [status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">💬 Mesajlar</h1>

      {conversations.length === 0 ? (
        <div className="text-center py-16">
          <span className="text-6xl">💬</span>
          <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg">Henüz mesajınız yok</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Bir eşleşme gerçekleştiğinde buradan mesajlaşabilirsiniz
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Link
              key={conv.matchId}
              href={`/mesajlar/${conv.matchId}`}
              className={`flex items-center gap-4 p-4 rounded-xl border transition hover:shadow-md cursor-pointer ${
                conv.hasUnread
                  ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800"
                  : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700"
              }`}
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-lg font-bold text-emerald-600 dark:text-emerald-400 shrink-0 overflow-hidden">
                {conv.partner.avatarUrl ? (
                  <img src={conv.partner.avatarUrl} alt={conv.partner.name} className="w-full h-full object-cover" />
                ) : (
                  conv.partner.name.charAt(0).toUpperCase()
                )}
              </div>

              {/* İçerik */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-semibold truncate ${conv.hasUnread ? "text-emerald-700 dark:text-emerald-300" : "text-gray-800 dark:text-gray-100"}`}>
                    {conv.partner.name}
                  </span>
                  {conv.lastMessage && (
                    <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                      {format(new Date(conv.lastMessage.createdAt), "d MMM HH:mm", { locale: tr })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                  {conv.listing.sport.icon} {conv.listing.sport.name} — {format(new Date(conv.listing.dateTime), "d MMM", { locale: tr })}
                </p>
                {conv.lastMessage ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                    {conv.lastMessage.isMine ? (
                      <span className="text-gray-400 dark:text-gray-500">Sen: </span>
                    ) : null}
                    {conv.lastMessage.content}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 italic">Henüz mesaj yok</p>
                )}
              </div>

              {/* Unread badge */}
              {conv.hasUnread && (
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0" />
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
