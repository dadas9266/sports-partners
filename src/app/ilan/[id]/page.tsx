"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";
import type { ListingDetail, ListingResponse } from "@/types";
import { LEVEL_LABELS_WITH_ICON, STATUS_LABELS, ALLOWED_GENDER_LABELS } from "@/types";
import { getListingDetail, sendResponse, handleResponse as handleResponseApi, closeListing, deleteListing, reportNoShow } from "@/services/api";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [deleteModal, setDeleteModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [noShowSending, setNoShowSending] = useState(false);

  const currentUserId = session?.user?.id;

  const fetchListing = useCallback(async () => {
    try {
      const data = await getListingDetail(id);
      if (data.success && data.data) setListing(data.data);
      else toast.error("İlan bulunamadı");
    } catch {
      toast.error("İlan yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchListing();
  }, [fetchListing]);

  const handleSendResponse = async () => {
    if (!session) {
      router.push("/auth/giris");
      return;
    }
    setSending(true);
    try {
      await sendResponse(id, responseMessage);
      toast.success("Karşılığınız gönderildi!");
      setResponseMessage("");
      fetchListing();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setSending(false);
    }
  };

  const handleResponseAction = async (responseId: string, action: "accept" | "reject") => {
    setActionLoading(responseId);
    try {
      await handleResponseApi(responseId, action);
      toast.success(action === "accept" ? "Karşılık kabul edildi! 🎉" : "Karşılık reddedildi");
      fetchListing();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteListing(id);
      toast.success("İlan silindi");
      router.push("/profil");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setDeleting(false);
      setDeleteModal(false);
    }
  };

  const handleClose = async () => {
    setClosing(true);
    try {
      await closeListing(id);
      toast.success("İlan kapatıldı");
      fetchListing();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setClosing(false);
      setCloseModal(false);
    }
  };

  const handleNoShow = async (matchId: string) => {
    if (!confirm("Bu kişi etkinliğe gelmedi mi? Bu bildirim geri alınamaz.")) return;
    setNoShowSending(true);
    try {
      await reportNoShow(matchId);
      toast.success("Gelmedi bildirimi gönderildi");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bildirim gönderilemedi");
    } finally {
      setNoShowSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16" aria-label="Yükleniyor">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-16">
        <span className="text-6xl" role="img" aria-label="üzgün yüz">😕</span>
        <p className="mt-4 text-gray-500 dark:text-gray-400">İlan bulunamadı</p>
      </div>
    );
  }

  const isOwner = currentUserId === listing.userId;
  const hasResponded = listing.responses?.some((r: ListingResponse) => r.userId === currentUserId);
  const isMatched = listing.status === "MATCHED";
  const isClosed = listing.status === "CLOSED";
  const acceptedCount = listing.responses?.filter((r: ListingResponse) => r.status === "ACCEPTED").length ?? 0;
  const capacityFill = listing.maxParticipants > 2 ? Math.min((acceptedCount / (listing.maxParticipants - 1)) * 100, 100) : 0;
  const isMatchParticipant = listing.match && (currentUserId === listing.match.user1Id || currentUserId === listing.match.user2Id);
  const matchInPast = listing.match && new Date(listing.dateTime) < new Date();

  return (
    <div className="max-w-3xl mx-auto">
      {/* Üst bilgi */}
      <article className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-4xl" role="img" aria-label={listing.sport?.name}>
              {listing.sport?.icon || "🏅"}
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {listing.sport?.name}
              </h1>
              <Badge variant={listing.type === "RIVAL" ? "orange" : listing.type === "TRAINER" ? "blue" : listing.type === "EQUIPMENT" ? "purple" : "emerald"} size="md">
                {listing.type === "RIVAL" ? "🥊 Rakip Arıyor" : listing.type === "TRAINER" ? "🎓 Eğitmen" : listing.type === "EQUIPMENT" ? "🛒 Satılık" : "🤝 Partner Arıyor"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && listing.status === "OPEN" && (
              <>
                <Link href={`/ilan/${id}/duzenle`}>
                  <Button variant="secondary" size="sm">Düzenle</Button>
                </Link>
                <Button variant="secondary" size="sm" onClick={() => setCloseModal(true)}>
                  Kapat
                </Button>
                <Button variant="danger" size="sm" onClick={() => setDeleteModal(true)}>
                  Sil
                </Button>
              </>
            )}
            <span className={`inline-block text-sm font-medium px-3 py-1 rounded-full ${STATUS_LABELS[listing.status]?.className || ""}`}>
              {isMatched ? "✅ Eşleşti" : isClosed ? "Kapatıldı" : "🟢 Açık"}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span role="img" aria-label="konum">📍</span>
              <span>
                {listing.district?.city?.country?.name} / {listing.district?.city?.name} / {listing.district?.name}
              </span>
            </div>
            {listing.venue && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span role="img" aria-label="mekan">🏟️</span>
                <span>{listing.venue.name}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span role="img" aria-label="tarih">📅</span>
              <time dateTime={listing.dateTime}>
                {format(new Date(listing.dateTime), "d MMMM yyyy, HH:mm", { locale: tr })}
              </time>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span role="img" aria-label="seviye">📊</span>
              <span>{LEVEL_LABELS_WITH_ICON[listing.level]}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span role="img" aria-label="kullanıcı">👤</span>
              <Link href={`/profil/${listing.userId}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition font-medium">
                {listing.user?.name}
              </Link>
            </div>
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span role="img" aria-label="mesaj">💬</span>
              <span>{listing.responses?.length || 0} karşılık</span>
            </div>
            {listing.allowedGender && listing.allowedGender !== "ANY" && (
              <div className="flex items-center gap-2">
                <span role="img" aria-label="cinsiyet kısıtı">🚦</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  listing.allowedGender === "FEMALE_ONLY"
                    ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                }`}>
                  {ALLOWED_GENDER_LABELS[listing.allowedGender]}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Kadro progress bar — sadece grup ilanlarında */}
        {listing.maxParticipants > 2 && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>👥 Kadro Doluluk</span>
              <span className="font-semibold">{acceptedCount + 1} / {listing.maxParticipants} kişi</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2.5">
              <div
                className="bg-emerald-500 rounded-full h-2.5 transition-all"
                style={{ width: `${capacityFill}%` }}
              />
            </div>
          </div>
        )}

        {listing.description && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-gray-700 dark:text-gray-300">{listing.description}</p>
          </div>
        )}
      </article>

      {/* Match bilgisi */}
      {isMatched && listing.match && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-4">
          <h3 className="font-semibold text-green-800 dark:text-green-300 mb-3">
            🎉 Eşleşme Gerçekleşti!
          </h3>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">İlan Sahibi</p>
              <Link href={`/profil/${listing.match.user1Id}`} className="font-semibold text-gray-800 dark:text-gray-100 hover:text-emerald-600 transition">
                {listing.match.user1?.name}
              </Link>
              {(isOwner || currentUserId === listing.match.user2Id) && (
                <>
                  {listing.match.user1?.phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">📞 {listing.match.user1.phone}</p>
                  )}
                  {listing.match.user1?.email && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">✉️ {listing.match.user1.email}</p>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center justify-center text-2xl" aria-hidden="true">🤝</div>
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">Eşleşen Kişi</p>
              <Link href={`/profil/${listing.match.user2Id}`} className="font-semibold text-gray-800 dark:text-gray-100 hover:text-emerald-600 transition">
                {listing.match.user2?.name}
              </Link>
              {(isOwner || currentUserId === listing.match.user2Id) && (
                <>
                  {listing.match.user2?.phone && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">📞 {listing.match.user2.phone}</p>
                  )}
                  {listing.match.user2?.email && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">✉️ {listing.match.user2.email}</p>
                  )}
                </>
              )}
            </div>
          </div>
          {/* No-show butonu — maç geçmişteyse katılımcılara göster */}
          {isMatchParticipant && matchInPast && listing.match && (
            <div className="mt-4 border-t border-green-200 dark:border-green-700 pt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Etkinlik gerçekleşti mi?</p>
              <button
                onClick={() => handleNoShow(listing.match!.id)}
                disabled={noShowSending}
                className="text-sm text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
              >
                {noShowSending ? "Gönderiliyor..." : "⚠️ Karşım gelmedi (bildir)"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Karşılık gönder */}
      {!isOwner && !isMatched && !isClosed && !hasResponded && session && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">💬 Karşılık Ver</h3>
          <textarea
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-emerald-500 outline-none resize-none mb-3"
            placeholder="Mesajınızı yazın (opsiyonel, max 500 karakter)..."
            aria-label="Karşılık mesajı"
          />
          <Button onClick={handleSendResponse} loading={sending}>
            Karşılık Gönder
          </Button>
        </div>
      )}

      {!session && !isMatched && (
        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6 mb-4 text-center">
          <p className="text-gray-600 dark:text-gray-300">
            Karşılık vermek için{" "}
            <Link href="/auth/giris" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
              giriş yapmanız
            </Link>{" "}
            gerekiyor.
          </p>
        </div>
      )}

      {hasResponded && !isOwner && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4 text-center">
          <p className="text-blue-700 dark:text-blue-300">✅ Bu ilana zaten karşılık verdiniz</p>
        </div>
      )}

      {/* İlan sahibi için gelen karşılıklar */}
      {isOwner && listing.responses && listing.responses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
            📩 Gelen Karşılıklar ({listing.responses.length})
          </h3>
          <div className="space-y-3">
            {listing.responses.map((resp: ListingResponse) => (
              <div key={resp.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <Link href={`/profil/${resp.userId}`} className="font-medium text-gray-800 dark:text-gray-100 hover:text-emerald-600 transition">
                      {resp.user?.name}
                    </Link>
                    <span className="ml-2 text-xs text-gray-400">
                      {format(new Date(resp.createdAt), "d MMM HH:mm", { locale: tr })}
                    </span>
                  </div>
                  <Badge
                    variant={resp.status === "PENDING" ? "yellow" : resp.status === "ACCEPTED" ? "green" : "red"}
                  >
                    {STATUS_LABELS[resp.status]?.label || resp.status}
                  </Badge>
                </div>
                {resp.message && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{resp.message}</p>
                )}
                {resp.status === "PENDING" && listing.status === "OPEN" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleResponseAction(resp.id, "accept")} loading={actionLoading === resp.id} disabled={actionLoading !== null}>
                      ✅ Kabul Et
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleResponseAction(resp.id, "reject")} loading={actionLoading === resp.id} disabled={actionLoading !== null}>
                      ❌ Reddet
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="İlanı Sil"
        description="Bu ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="İlanı Sil"
        variant="danger"
        loading={deleting}
      />
      <Modal
        open={closeModal}
        onClose={() => setCloseModal(false)}
        onConfirm={handleClose}
        title="İlanı Kapat"
        description="Bu ilanı kapatmak istediğinize emin misiniz? Bekleyen tüm karşılıklar reddedilecektir."
        confirmText="İlanı Kapat"
        variant="primary"
        loading={closing}
      />
    </div>
  );
}
