"use client";

import { useEffect, useState, use, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";
import type { ListingDetail, ListingResponse, ListingSummary } from "@/types";
import ListingCard from "@/components/ListingCard";
import { LEVEL_LABELS_WITH_ICON, STATUS_LABELS, ALLOWED_GENDER_LABELS } from "@/types";
import { getListingDetail, sendResponse, handleResponse as handleResponseApi, closeListing, deleteListing, reportNoShow } from "@/services/api";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";

// Acil ilan geri sayım badge
function UrgentBadge({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState("");
  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Süresi doldu"); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}:${secs.toString().padStart(2, "0")} kaldı`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return (
    <span className="inline-flex items-center gap-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-bold px-3 py-1 rounded-full animate-pulse tabular-nums">
      ⚡ ACİL · {remaining}
    </span>
  );
}

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
  const [completing, setCompleting] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratedThisSession, setRatedThisSession] = useState(false);
  const [similar, setSimilar] = useState<ListingSummary[]>([]);

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

  useEffect(() => {
    if (!listing) return;
    const sportId = listing.sport?.id;
    if (!sportId) return;
    const cityId = listing.district?.city?.id;
    const params = new URLSearchParams({ sportId, pageSize: "5" });
    if (cityId) params.set("cityId", cityId);
    fetch(`/api/listings?${params}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setSimilar(
            (data.data?.listings ?? []).filter((l: ListingSummary) => l.id !== listing.id).slice(0, 4)
          );
        }
      })
      .catch(() => {});
  }, [listing]);

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

  const handleCompleteMatch = async (matchId: string) => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/complete`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Maç tamamlanamadı");
      toast.success("Maç tamamlandı! 🎉 +10 puan kazandınız");
      fetchListing();
      setShowRatingModal(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setCompleting(false);
    }
  };

  const handleRate = async (matchId: string, ratedUserId: string) => {
    if (ratingScore === 0) { toast.error("Lütfen bir puan seçin"); return; }
    setRatingSubmitting(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, ratedUserId, score: ratingScore, comment: ratingComment || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Değerlendirme gönderilemedi");
      toast.success("Değerlendirmeniz gönderildi ⭐");
      setShowRatingModal(false);
      setRatedThisSession(true);
      fetchListing();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setRatingSubmitting(false);
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
            {(listing as any).isUrgent && (listing as any).expiresAt && new Date((listing as any).expiresAt) > new Date() && (
              <UrgentBadge expiresAt={(listing as any).expiresAt} />
            )}
            {(listing as any).isAnonymous && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-semibold px-3 py-1 rounded-full">
                🕵️ Kör Maç
              </span>
            )}
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
              {listing.userId === "anonymous" ? (
                <span className="flex items-center gap-1.5 font-medium text-gray-500 dark:text-gray-400">
                  🕵️ Anonim Kullanıcı
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">Kör Maç</span>
                </span>
              ) : (
                <Link href={`/profil/${listing.userId}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition font-medium">
                  {listing.user?.name}
                </Link>
              )}
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

        {/* ── Eğitmen Bilgileri ── */}
        {listing.type === "TRAINER" && listing.trainerProfile && (
          <div className="mt-5 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <h2 className="font-bold text-blue-800 dark:text-blue-200 mb-3 text-base flex items-center gap-2">
              🎓 Eğitmen Bilgileri
              {listing.trainerProfile.isVerified && (
                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">✓ Onaylı</span>
              )}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {listing.trainerProfile.hourlyRate != null && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center sm:col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saatlik Ücret</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {listing.trainerProfile.hourlyRate.toLocaleString("tr-TR")} ₺
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400"> / saat</span>
                  </p>
                </div>
              )}
              {listing.trainerProfile.specializations?.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <span>🏅</span>
                  <span className="font-medium">{s.sportName}</span>
                  {s.years > 0 && <span className="text-sm text-blue-500 dark:text-blue-400">({s.years} yıl)</span>}
                </div>
              ))}
              {listing.trainerProfile.gymName && (
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 sm:col-span-2">
                  <span>🏢</span>
                  <span className="font-medium">{listing.trainerProfile.gymName}</span>
                </div>
              )}
              {listing.trainerProfile.gymAddress && (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 sm:col-span-2">
                  <span>📍</span>
                  <span className="text-sm">{listing.trainerProfile.gymAddress}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Spor Malzemesi Bilgileri ── */}
        {listing.type === "EQUIPMENT" && listing.equipmentDetail && (
          <div className="mt-5 p-5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
            <h2 className="font-bold text-purple-800 dark:text-purple-200 mb-3 text-base">🛒 Ürün Detayları</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Fiyat</p>
                <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                  {listing.equipmentDetail.price.toLocaleString("tr-TR")} ₺
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Durum</p>
                <p className="font-semibold text-purple-700 dark:text-purple-300">
                  {listing.equipmentDetail.condition === "NEW" ? "✨ Sıfır"
                    : listing.equipmentDetail.condition === "LIKE_NEW" ? "🌟 Sıfır Gibi"
                    : listing.equipmentDetail.condition === "GOOD" ? "👍 İyi"
                    : "🔧 Orta"}
                </p>
              </div>
              {listing.equipmentDetail.brand && (
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <span>🏷️</span>
                  <span><span className="text-gray-500 dark:text-gray-400 text-sm">Marka: </span>{listing.equipmentDetail.brand}</span>
                </div>
              )}
              {listing.equipmentDetail.model && (
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                  <span>📋</span>
                  <span><span className="text-gray-500 dark:text-gray-400 text-sm">Model: </span>{listing.equipmentDetail.model}</span>
                </div>
              )}
            </div>
            {listing.equipmentDetail.images?.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {listing.equipmentDetail.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Ürün görseli ${i + 1}`}
                    className="h-24 w-24 object-cover rounded-lg border border-purple-200 dark:border-purple-700"
                  />
                ))}
              </div>
            )}
            {listing.equipmentDetail.isSold && (
              <div className="mt-3 text-center text-sm font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg py-2">
                🔴 Bu ürün satılmıştır
              </div>
            )}
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
          {/* Post-match panel — only for participants after the event */}
          {isMatchParticipant && matchInPast && listing.match && (() => {
            const matchStatus = listing.match.status;
            const ratedUserId = listing.match.user1Id === currentUserId ? listing.match.user2Id : listing.match.user1Id;
            const alreadyRated = ratedThisSession || listing.match.ratings?.some((r) => r.ratedById === currentUserId);

            return (
              <div className="mt-4 border-t border-green-200 dark:border-green-700 pt-4 space-y-4">
                {/* Complete match CTA */}
                {matchStatus !== "COMPLETED" && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Etkinliğe katıldınız mı?</p>
                    <Button onClick={() => handleCompleteMatch(listing.match!.id)} loading={completing} size="sm">
                      ✅ Maçı Tamamla (+10 puan)
                    </Button>
                  </div>
                )}

                {/* Rating section */}
                {matchStatus === "COMPLETED" && !alreadyRated && !showRatingModal && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Karşı oyuncuyu değerlendirin</p>
                    <button
                      onClick={() => setShowRatingModal(true)}
                      className="inline-flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 rounded-lg px-4 py-2 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
                    >
                      ⭐ Değerlendirme Yap
                    </button>
                  </div>
                )}

                {/* Inline star rating modal */}
                {showRatingModal && !alreadyRated && (
                  <div className="animate-slide-up bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-700 rounded-xl p-5 space-y-3">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">⭐ Karşı Oyuncuyu Değerlendir</h4>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRatingScore(star)}
                          className={`text-3xl transition-transform hover:scale-110 focus:outline-none ${star <= ratingScore ? "opacity-100" : "opacity-30"}`}
                          aria-label={`${star} yıldız`}
                        >
                          ⭐
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      rows={2}
                      maxLength={300}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-amber-400 outline-none resize-none"
                      placeholder="Yorum (opsiyonel, max 300 karakter)..."
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleRate(listing.match!.id, ratedUserId)} loading={ratingSubmitting} disabled={ratingScore === 0}>
                        Gönder
                      </Button>
                      <button onClick={() => setShowRatingModal(false)} className="text-sm text-gray-500 hover:underline">İptal</button>
                    </div>
                  </div>
                )}

                {/* Post-rating: replay CTA */}
                {(alreadyRated || matchStatus === "COMPLETED") && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-sm text-emerald-800 dark:text-emerald-300 font-medium">
                      {alreadyRated ? "✅ Değerlendirdiniz!" : "✅ Maç tamamlandı!"}
                    </span>
                    <Link
                      href={`/ilan/olustur?sport=${listing.sport?.id}&cityId=${listing.district?.city?.id}`}
                      className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
                    >
                      🔄 Tekrar buluşalım →
                    </Link>
                  </div>
                )}

                {/* No-show button */}
                {matchStatus !== "COMPLETED" && (
                  <button
                    onClick={() => handleNoShow(listing.match!.id)}
                    disabled={noShowSending}
                    className="text-xs text-red-500 dark:text-red-400 hover:underline disabled:opacity-50"
                  >
                    {noShowSending ? "Gönderiliyor..." : "⚠️ Karşım gelmedi (bildir)"}
                  </button>
                )}
              </div>
            );
          })()}
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

      {/* Benzer İlanlar */}
      {similar.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🔍 Benzer İlanlar</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {similar.map(s => (
              <ListingCard key={s.id} listing={s} />
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
