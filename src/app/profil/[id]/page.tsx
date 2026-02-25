"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { format, differenceInYears } from "date-fns";
import { tr } from "date-fns/locale";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { getPublicProfile, submitRating, getUserRatings, toggleFollow, getFollowStats, getLeaderboard } from "@/services/api";
import type { PublicProfile, Rating, Badge } from "@/types";
import { LEVEL_LABELS, LEVEL_COLORS } from "@/types";
import BadgeComp from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          className={`text-2xl transition ${s <= value ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"} ${onChange ? "hover:scale-110 cursor-pointer" : "cursor-default"}`}
          aria-label={`${s} yıldız`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function BadgeChip({ badge }: { badge: Badge }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`} title={badge.description}>
      {badge.icon} {badge.label}
    </span>
  );
}

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingModal, setRatingModal] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [activeTab, setActiveTab] = useState<"listings" | "ratings">("listings");

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const loadFollowStats = useCallback(async () => {
    if (!session) return;
    try {
      const res = await getFollowStats(id);
      if (res.success && res.data) {
        setIsFollowing(res.data.isFollowing);
        setFollowerCount(res.data.followerCount);
        setFollowingCount(res.data.followingCount);
      }
    } catch { /* ignore */ }
  }, [id, session]);

  useEffect(() => {
    Promise.all([
      getPublicProfile(id),
      getUserRatings(id),
      getLeaderboard(undefined, 100),
    ])
      .then(([p, r, lb]) => {
        if (p.success && p.data) setProfile(p.data);
        if (r.success && r.data) setRatings(r.data);
        if (lb.success && lb.data) {
          const entry = lb.data.find((e) => e.id === id);
          if (entry) setBadges(entry.badges);
        }
      })
      .catch(() => toast.error("Profil yüklenemedi"))
      .finally(() => setLoading(false));

    loadFollowStats();
  }, [id, loadFollowStats]);

  const handleFollow = async () => {
    if (!session) { toast.error("Takip etmek için giriş yapın"); return; }
    setFollowLoading(true);
    try {
      const res = await toggleFollow(id);
      if (res.success && res.data) {
        setIsFollowing(res.data.following);
        setFollowerCount((prev) => res.data!.following ? prev + 1 : prev - 1);
        toast.success(res.data.following ? "Takip edildi" : "Takipten çıkıldı");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleRatingSubmit = async () => {
    setSubmittingRating(true);
    try {
      await submitRating(id, ratingScore, ratingComment);
      toast.success("Değerlendirmeniz gönderildi!");
      setRatingModal(false);
      // Refresh ratings
      const r = await getUserRatings(id);
      if (r.success && r.data) setRatings(r.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <span className="text-6xl">😕</span>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Kullanıcı bulunamadı</p>
      </div>
    );
  }

  const joinDate = format(new Date(profile.createdAt), "MMMM yyyy", { locale: tr });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Profil Kartı */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-start gap-5 flex-wrap">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-3xl font-bold text-emerald-600 dark:text-emerald-400 shrink-0 overflow-hidden">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              profile.name.charAt(0).toUpperCase()
            )}
          </div>

          {/* Bilgiler */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{profile.name}</h1>
              {profile.birthDate && (
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-bold text-gray-600 dark:text-gray-400">
                  {differenceInYears(new Date(), new Date(profile.birthDate))} Yaş
                </span>
              )}
              {profile.isOwnProfile && (
                <Link href="/profil">
                  <BadgeComp variant="emerald">Sen</BadgeComp>
                </Link>
              )}
            </div>

            {profile.avgRating !== null && profile.avgRating !== undefined && (
              <div className="flex items-center gap-2 mt-1">
                <StarRating value={Math.round(profile.avgRating)} />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {profile.avgRating.toFixed(1)} ({profile.ratingCount} değerlendirme)
                </span>
              </div>
            )}

            {/* Rozetler */}
            {badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {badges.map((b) => <BadgeChip key={b.id} badge={b} />)}
              </div>
            )}

            {profile.bio && (
              <p className="mt-2 text-gray-600 dark:text-gray-400 text-sm">{profile.bio}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
              {profile.city && (
                <span className="flex items-center gap-1">
                  📍 {profile.city.name}{profile.city.country ? `, ${profile.city.country.name}` : ""}
                </span>
              )}
              <span className="flex items-center gap-1">📅 {joinDate} tarihinden beri</span>
              <span className="flex items-center gap-1">📋 {profile.totalListings} ilan</span>
              <span className="flex items-center gap-1">🤝 {profile.totalMatches} eşleşme</span>
              {session && (
                <>
                  <span className="flex items-center gap-1">👥 {followerCount} takipçi</span>
                  <span className="flex items-center gap-1">➡️ {followingCount} takip</span>
                </>
              )}
            </div>

            {/* Sporlar */}
            {profile.sports.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.sports.map((s) => (
                  <span key={s.id} className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-1 rounded-full">
                    {s.icon} {s.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sağ taraf butonlar */}
          <div className="flex flex-col gap-2">
            {session && !profile.isOwnProfile && (
              <>
                <Button
                  size="sm"
                  variant={isFollowing ? "secondary" : "primary"}
                  onClick={handleFollow}
                  loading={followLoading}
                >
                  {isFollowing ? "✓ Takip Ediliyor" : "+ Takip Et"}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setRatingModal(true)}>
                  ⭐ Değerlendir
                </Button>
              </>
            )}
            {profile.isOwnProfile && (
              <Link href="/profil">
                <Button size="sm" variant="secondary">Profili Düzenle</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Sekmeler */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("listings")}
          className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${activeTab === "listings" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}
        >
          📋 Açık İlanlar ({profile.activeListings.length})
        </button>
        <button
          onClick={() => setActiveTab("ratings")}
          className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${activeTab === "ratings" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}
        >
          ⭐ Değerlendirmeler ({ratings.length})
        </button>
      </div>

      {/* İlanlar */}
      {activeTab === "listings" && (
        <div className="space-y-3">
          {profile.activeListings.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Aktif ilan yok</p>
          ) : (
            profile.activeListings.map((listing) => (
              <Link key={listing.id} href={`/ilan/${listing.id}`}>
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition cursor-pointer">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{listing.sport?.icon || "🏆"}</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">{listing.sport?.name}</span>
                      <BadgeComp variant={listing.type === "RIVAL" ? "orange" : listing.type === "TRAINER" ? "blue" : listing.type === "EQUIPMENT" ? "purple" : "emerald"} size="sm">
                        {listing.type === "RIVAL" ? "Rakip" : listing.type === "TRAINER" ? "Eğitmen" : listing.type === "EQUIPMENT" ? "Satılık" : "Partner"}
                      </BadgeComp>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${LEVEL_COLORS[listing.level]}`}>
                      {LEVEL_LABELS[listing.level]}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex flex-wrap gap-3">
                    <span>📍 {listing.district?.city?.name}, {listing.district?.name}</span>
                    <span>📅 {format(new Date(listing.dateTime), "d MMM HH:mm", { locale: tr })}</span>
                    <span>💬 {listing._count?.responses ?? 0} yanıt</span>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Değerlendirmeler */}
      {activeTab === "ratings" && (
        <div className="space-y-3">
          {ratings.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Henüz değerlendirme yok</p>
          ) : (
            ratings.map((r) => (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between">
                  <Link href={`/profil/${r.ratedBy.id}`} className="flex items-center gap-2 hover:underline">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-bold text-emerald-600">
                      {r.ratedBy.name.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-800 dark:text-gray-100">{r.ratedBy.name}</span>
                  </Link>
                  <StarRating value={r.score} />
                </div>
                {r.comment && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 italic">"{r.comment}"</p>
                )}
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  {format(new Date(r.createdAt), "d MMMM yyyy", { locale: tr })}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* Değerlendirme Modal */}
      {ratingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRatingModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Kullanıcıyı Değerlendir</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Puan</label>
                <StarRating value={ratingScore} onChange={setRatingScore} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yorum (opsiyonel)</label>
                <textarea
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Bu kullanıcı hakkında ne düşünüyorsunuz?"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setRatingModal(false)}>İptal</Button>
                <Button onClick={handleRatingSubmit} loading={submittingRating}>Gönder</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
