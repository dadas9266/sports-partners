"use client";

import { use, useEffect, useRef, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";
import { getMessages, sendMessage, getConversations } from "@/services/api";
import { useNotifications } from "@/hooks/useNotifications";
import type { Message, Conversation } from "@/types";

export default function ChatPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVisibleRef = useRef(true);
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDesc, setReportDesc] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // SSE heartbeat: yeni mesaj bildirimlerini dinle
  const { unreadMessages } = useNotifications();

  const loadMessages = useCallback(async () => {
    try {
      const res = await getMessages(matchId);
      if (res.success && res.data) {
        setMessages(res.data.messages);
      }
    } catch {
      // sessiz
    }
  }, [matchId]);

  // SSE heartbeat'ten unreadMessages değişince mesajları tazele
  useEffect(() => {
    if (!loading) loadMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadMessages]);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/auth/giris"); return; }
    if (status !== "authenticated") return;

    // İlk yükleme
    Promise.all([
      getMessages(matchId),
      getConversations(),
    ]).then(([msgs, convs]) => {
      if (msgs.success && msgs.data) setMessages(msgs.data.messages);
      if (convs.success && convs.data) {
        const found = convs.data.find((c) => c.matchId === matchId) ?? null;
        setConversation(found);
      }
    }).catch(() => toast.error("Sohbet yüklenemedi"))
      .finally(() => setLoading(false));

    // Page Visibility API — sekme arkaplanda iken polling durdur
    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === "visible";
      if (isVisibleRef.current) loadMessages();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Yedek polling: 10 saniyede bir (SSE yoksa devreye girer)
    pollingRef.current = setInterval(() => {
      if (isVisibleRef.current) loadMessages();
    }, 10_000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [status, router, matchId, loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await sendMessage(matchId, text);
      if (res.success && res.data) {
        setMessages((prev) => [...prev, res.data!]);
        setContent("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mesaj gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  const handleReportUser = async () => {
    if (!conversation?.partner?.id) return;
    setReportLoading(true);
    try {
      const res = await fetch(`/api/users/${conversation.partner.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason, description: reportDesc || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Şikayet gönderilemedi");
      toast.success(data.message || "Şikayetiniz alındı");
      setReportModal(false);
      setReportDesc("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setReportLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const myId = session?.user?.id;

  return (
    <div className="max-w-2xl mx-auto flex flex-col" style={{ height: "calc(100vh - 80px)" }}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-t-xl border border-gray-100 dark:border-gray-700 px-4 py-3 flex items-center gap-3 shrink-0">
        <Link href="/mesajlar" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">
          ←
        </Link>
        {conversation ? (
          <>
            <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-bold text-emerald-600 overflow-hidden">
              {conversation.partner.avatarUrl ? (
                <img src={conversation.partner.avatarUrl} alt={conversation.partner.name} className="w-full h-full object-cover" />
              ) : (
                conversation.partner.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-1">
                <Link href={`/profil/${conversation.partner.id}`} className="font-semibold text-gray-800 dark:text-gray-100 hover:underline">
                  {conversation.partner.name}
                </Link>
                {/* Puan rozeti kaldırıldı - API tarafında henüz desteklenmiyor */}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {conversation.listing?.sport.icon} {conversation.listing?.sport.name} — {conversation.listing?.dateTime ? format(new Date(conversation.listing.dateTime), "d MMM HH:mm", { locale: tr }) : ""}
              </p>
            </div>
            <button
              onClick={() => setReportModal(true)}
              className="ml-auto p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
              title="Şikayet Et"
            >
              🚩
            </button>
          </>
        ) : (
          <span className="font-semibold text-gray-800 dark:text-gray-100">Sohbet</span>
        )}
      </div>

      {/* Mesajlar */}
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 px-4 py-4 space-y-3 border-x border-gray-100 dark:border-gray-700">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-500 text-sm py-8">
            Henüz mesaj yok. İlk mesajı siz gönderin!
          </p>
        )}
        {messages.map((msg) => {
          const isMine = msg.senderId === myId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                isMine
                  ? "bg-emerald-500 text-white rounded-br-sm"
                  : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-bl-sm"
              }`}>
                <p className="leading-relaxed">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? "text-emerald-100" : "text-gray-400 dark:text-gray-500"}`}>
                  {format(new Date(msg.createdAt), "HH:mm")}
                  {isMine && <span className="ml-1">{msg.read ? " ✓✓" : " ✓"}</span>}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 rounded-b-xl border border-t-0 border-gray-100 dark:border-gray-700 px-4 py-3 flex gap-2 shrink-0">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Mesaj yaz..."
          maxLength={1000}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
        />
        <button
          onClick={handleSend}
          disabled={sending || !content.trim()}
          className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          {sending ? "..." : "Gönder"}
        </button>
      </div>

      {/* Şikayet Modal */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReportModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">🚩 Kullanıcıyı Şikayet Et</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sebep</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="SPAM">📧 Spam</option>
                  <option value="HARASSMENT">😡 Taciz / Zorbalık</option>
                  <option value="FAKE_PROFILE">🎭 Sahte Profil</option>
                  <option value="INAPPROPRIATE_CONTENT">⚠️ Uygunsuz İçerik</option>
                  <option value="SCAM">💸 Dolandırıcılık</option>
                  <option value="OTHER">🔖 Diğer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama (opsiyonel)</label>
                <textarea
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Detaylı bilgi verebilirsiniz..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setReportModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition">İptal</button>
                <button onClick={handleReportUser} disabled={reportLoading} className="px-4 py-2 text-sm text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition disabled:opacity-50">
                  {reportLoading ? "Gönderiliyor..." : "Gönder"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
