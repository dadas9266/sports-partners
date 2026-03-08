"use client";

import { use, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";

type MatchDetail = {
  id: string;
  status: "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";
  scheduledAt: string | null;
  completedAt: string | null;
  trustScore: number;
  approvedById: string | null;
  iHaveConfirmed: boolean;
  myRating: { score: number; comment: string | null } | null;
  user1Id: string;
  user2Id: string;
  user1: { id: string; name: string; avatarUrl: string | null; userLevel: string | null };
  user2: { id: string; name: string; avatarUrl: string | null; userLevel: string | null };
  listing: {
    id: string;
    type: string;
    description: string | null;
    dateTime: string;
    sport: { id: string; name: string; icon: string | null };
    district: { name: string; city: { name: string } } | null;
  } | null;
};

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          className={`text-3xl transition ${s <= value ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"} ${onChange ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  SCHEDULED: { label: "Planlandı", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300", icon: "📅" },
  ONGOING:   { label: "Devam Ediyor", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300", icon: "⏳" },
  COMPLETED: { label: "Tamamlandı", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300", icon: "✅" },
  CANCELLED: { label: "İptal Edildi", color: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300", icon: "❌" },
};

export default function EslesmelerDetailPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [match, setMatch]         = useState<MatchDetail | null>(null);
  const [loading, setLoading]     = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingDone, setRatingDone] = useState(false);

  useEffect(() => {
    fetch(`/api/matches/${matchId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setMatch(json.data);
          if (json.data.myRating) setRatingDone(true);
        } else {
          toast.error(json.error ?? "Maç yüklenemedi");
          router.push("/");
        }
      })
      .catch(() => { toast.error("Sunucu hatası"); router.push("/"); })
      .finally(() => setLoading(false));
  }, [matchId, router]);

  const handleNoShow = async () => {
    if (!confirm("Bu kişi etkinliğe gelmedi mi? Bu bildirim geri alınamaz.")) return;
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "report_no_show" }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Gelmedi bildirimi gönderildi");
        router.push("/aktivitelerim");
      } else {
        toast.error(json.error ?? "Bildirim gönderilemedi");
      }
    } catch {
      toast.error("Bir hata oluştu");
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/complete`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        if (json.pendingConfirmation) {
          toast.success("Onayınız alındı. Rakibinizin onayı bekleniyor.");
          setMatch((prev) => prev ? { ...prev, iHaveConfirmed: true } : prev);
        } else {
          toast.success("🎉 Maç tamamlandı! Puan verebilirsiniz.");
          setMatch((prev) => prev ? { ...prev, status: "COMPLETED", iHaveConfirmed: true } : prev);
        }
      } else {
        toast.error(json.error ?? "İşlem başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setConfirming(false);
    }
  };

  const handleRate = async () => {
    setRatingLoading(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, score: ratingScore, comment: ratingComment || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("⭐ Puanınız kaydedildi!");
        setRatingDone(true);
        setMatch((prev) => prev ? { ...prev, myRating: { score: ratingScore, comment: ratingComment || null } } : prev);
      } else {
        toast.error(json.error ?? "Puanlama başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setRatingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!match) return null;

  const me = match.user1Id === session?.user?.id ? match.user1 : match.user2;
  const opponent = match.user1Id === session?.user?.id ? match.user2 : match.user1;
  const statusInfo = STATUS_LABELS[match.status] ?? STATUS_LABELS["SCHEDULED"];
  const matchDate = match.listing?.dateTime ?? match.scheduledAt;
  const dateHasPassed = matchDate ? new Date(matchDate) < new Date() : false;
  const canConfirm = !match.iHaveConfirmed && match.status !== "COMPLETED" && match.status !== "CANCELLED";
  const canRate = match.status === "COMPLETED" && !ratingDone;

  return (
    <div className="max-w-xl mx-auto space-y-4 py-6 px-4">
      {/* Geri dön */}
      <Link href="/aktivitelerim" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition">
        ← Aktivitelerime Dön
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{match.listing?.sport?.icon ?? "⚽"}</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                {match.listing?.sport?.name ?? "Spor"} Maçı
              </h1>
              {match.listing?.district && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  📍 {match.listing.district.name}, {match.listing.district.city.name}
                </p>
              )}
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full ${statusInfo.color}`}>
            {statusInfo.icon} {statusInfo.label}
          </span>
        </div>

        {matchDate && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-3">
            <span>📅</span>
            <span>{format(new Date(matchDate), "d MMMM yyyy, EEEE HH:mm", { locale: tr })}</span>
          </div>
        )}

        {match.listing?.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/40 rounded-xl px-3 py-2">
            {match.listing.description}
          </p>
        )}
      </div>

      {/* Oyuncular */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Oyuncular</h2>
        <div className="flex items-center justify-between gap-4">
          {[match.user1, match.user2].map((user, i) => (
            <Link
              key={user.id}
              href={`/profil/${user.id}`}
              className="flex flex-col items-center gap-2 flex-1 hover:opacity-80 transition"
            >
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-xl font-bold text-emerald-700 dark:text-emerald-300 overflow-hidden border-2 border-emerald-200 dark:border-emerald-700">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                ) : user.name?.[0]?.toUpperCase()}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{user.name}</p>
                {user.id === session?.user?.id && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Sen</span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Maç Onaylama */}
      {match.status !== "CANCELLED" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Maç Onayı</h2>

          {match.status === "COMPLETED" ? (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>✅</span> Her iki taraf maçı onayladı. Tamamlandı!
            </div>
          ) : match.iHaveConfirmed ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium text-sm">
                <span>⏳</span> Onayınız alındı. Rakibinizin onayı bekleniyor.
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">Rakibiniz onayladığında maç tamamlanacak ve puan verebileceksiniz.</p>
            </div>
          ) : dateHasPassed ? (
            <div className="space-y-3">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-semibold mb-2">📅 Maç Tarihi Geçti</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-4">Etkinlik zamanı geçti. Maçı oynadıysanız lütfen onaylayın, oynamadıysanız bildirin.</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="flex-1 min-w-[140px] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 text-sm"
                  >
                    {confirming ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> İşleniyor...</>
                    ) : (
                      <>✅ Maçı Oynadık</>
                    )}
                  </button>
                  <button
                    onClick={handleNoShow}
                    className="flex-1 min-w-[140px] bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl px-4 py-2.5 hover:bg-red-100 transition text-sm font-semibold"
                  >
                    ⚠️ Gelmedi (Bildir)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Maç tarihi henüz gelmedi. Maçtan sonra buradan onaylayabilirsiniz.
            </p>
          )}
        </div>
      )}

      {/* Puanlama */}
      {canRate && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            ⭐ {opponent.name} için Puan Ver
          </h2>

          {ratingDone ? (
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
              <span>✅</span> Puanınız verildi. Teşekkürler!
            </div>
          ) : (
            <div className="space-y-4">
              <StarRating value={ratingScore} onChange={setRatingScore} />
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                rows={3}
                placeholder="Yorum (isteğe bağlı)"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
              <button
                onClick={handleRate}
                disabled={ratingLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition"
              >
                {ratingLoading ? "Gönderiliyor..." : "Puanı Gönder"}
              </button>
            </div>
          )}
        </div>
      )}

      {ratingDone && match.myRating && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Verdiğiniz Puan</h2>
          <div className="flex items-center gap-2">
            <StarRating value={match.myRating.score} />
            <span className="text-lg font-bold text-gray-800 dark:text-gray-100">{match.myRating.score}/5</span>
          </div>
          {match.myRating.comment && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">&ldquo;{match.myRating.comment}&rdquo;</p>
          )}
        </div>
      )}

      {/* Mesajlar Linki */}
      <Link
        href={`/mesajlar/${matchId}`}
        className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-700 dark:text-gray-200 font-semibold text-sm"
      >
        💬 Mesajlaşmaya Git
      </Link>
    </div>
  );
}
