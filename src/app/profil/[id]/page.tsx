"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, differenceInYears } from "date-fns";
import { tr } from "date-fns/locale";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { getPublicProfile, submitRating, getUserRatings, toggleFollow, getFollowStats, getLeaderboard, startDirectConversation, removeFollower } from "@/services/api";
import type { PublicProfile, Rating, Badge, UserStoryGroup } from "@/types";
import { LEVEL_LABELS, LEVEL_COLORS } from "@/types";
import BadgeComp from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import StoryViewer from "@/components/StoryViewer";
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
  const router = useRouter();
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingModal, setRatingModal] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [activeTab, setActiveTab] = useState<"listings" | "ratings" | "posts">("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsView, setPostsView] = useState<"grid" | "list">("grid");

  // Story state
  const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followsMe, setFollowsMe] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  // Block / report / 3-dot menu state
  const [dotMenuOpen, setDotMenuOpen] = useState(false);
  const [blockStatus, setBlockStatus] = useState<"BLOCK" | "RESTRICT" | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDesc, setReportDesc] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  // Challenge state
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeForm, setChallengeForm] = useState({ sportId: "", challengeType: "RIVAL" as "RIVAL" | "PARTNER", message: "", proposedDateTime: "" });
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [sports, setSports] = useState<{ id: string; name: string; icon: string | null }[]>([]);

  const loadFollowStats = useCallback(async () => {
    try {
      const res = await getFollowStats(id);
      if (res.success && res.data) {
        setIsFollowing(res.data.isFollowing);
        setFollowsMe(res.data.followsMe ?? false);
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
        if (p.success && p.data) {
          setProfile(p.data);
          setFollowerCount((p.data as PublicProfile & { followersCount?: number }).followersCount ?? 0);
          setFollowingCount((p.data as PublicProfile & { followingCount?: number }).followingCount ?? 0);
        }
        if (r.success && r.data) setRatings(r.data);
        if (lb.success && lb.data) {
          const entry = lb.data.find((e) => e.id === id);
          if (entry) setBadges(entry.badges);
        }
      })
      .catch(() => toast.error("Profil yüklenemedi"))
      .finally(() => setLoading(false));

    loadFollowStats();

    // Engelleme durumunu yükle
    if (session) {
      fetch(`/api/users/${id}/block`)
        .then(r => r.json())
        .then(json => { if (json.success) setBlockStatus(json.type ?? null); })
        .catch(() => {});
    }

    // Hikayeleri yükle
    fetch(`/api/stories?userId=${id}`)
      .then(r => r.json())
      .then(json => {
        if (json.success && json.stories.length > 0) {
          setStoryGroups([{
            userId: id,
            userName: null,
            userAvatar: null,
            stories: json.stories,
            hasUnread: json.stories.some((s: { viewedByMe: boolean }) => !s.viewedByMe),
          }]);
        }
      })
      .catch(() => {});
  }, [id, loadFollowStats, session]);

  // Sporları yükle (teklif modalı için)
  useEffect(() => {
    fetch("/api/sports")
      .then((r) => r.json())
      .then((json) => { if (json.success) setSports(json.data ?? []); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab !== "posts") return;
    setPostsLoading(true);
    fetch(`/api/posts?userId=${id}`)
      .then((r) => r.json())
      .then((json) => { if (Array.isArray(json.posts)) setPosts(json.posts); })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [id, activeTab]);

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

  const handleBlock = async (type: "BLOCK" | "RESTRICT") => {
    if (!session) return;
    setBlockLoading(true);
    setDotMenuOpen(false);
    try {
      if (blockStatus === type) {
        // Kaldır
        const res = await fetch(`/api/users/${id}/block`, { method: "DELETE" });
        if ((await res.json()).success) {
          setBlockStatus(null);
          toast.success(type === "BLOCK" ? "Engel kaldırıldı" : "Kısıtlama kaldırıldı");
        }
      } else {
        const res = await fetch(`/api/users/${id}/block`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
        const json = await res.json();
        if (json.success) {
          setBlockStatus(type);
          if (type === "BLOCK") { setIsFollowing(false); setFollowsMe(false); }
          toast.success(type === "BLOCK" ? "Kullanıcı engellendi" : "Kullanıcı kısıtlandı");
        } else {
          toast.error(json.error ?? "İşlem başarısız");
        }
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setBlockLoading(false);
    }
  };

  const handleReport = async () => {
    if (!session) return;
    setReportLoading(true);
    try {
      const res = await fetch(`/api/users/${id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason, description: reportDesc || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Şikayetiniz alındı, incelenecek.");
        setReportModal(false);
        setReportDesc("");
      } else {
        toast.error(json.error ?? "Şikayet gönderilemedi");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setReportLoading(false);
    }
  };

  const handleRemoveFollower = async () => {
    if (!session) return;
    setDotMenuOpen(false);
    try {
      const res = await removeFollower(id);
      if (res.success) {
        setFollowsMe(false);
        toast.success("Takipçi kaldırıldı");
      } else {
        toast.error("İşlem başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    }
  };

  const handleChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeForm.sportId) { toast.error("Spor dalı seçiniz"); return; }
    setChallengeLoading(true);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: id,
          sportId: challengeForm.sportId,
          challengeType: challengeForm.challengeType,
          message: challengeForm.message || undefined,
          proposedDateTime: challengeForm.proposedDateTime || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("✅ Teklif gönderildi! 48 saat geçerlidir.");
        setShowChallengeModal(false);
        setChallengeForm({ sportId: "", challengeType: "RIVAL", message: "", proposedDateTime: "" });
      } else {
        toast.error(json.error ?? "Teklif gönderilemedi");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setChallengeLoading(false);
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Cover */}
        <div className="relative h-44 bg-gradient-to-r from-emerald-400 to-teal-500">
          {(profile as any).coverUrl && (
            <img src={(profile as any).coverUrl} alt="Kapak" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="p-6">
        <div className="flex items-start gap-5 flex-wrap">
          {/* Avatar — story varsa halkali, tıklanabilir */}
          <button
            onClick={() => storyGroups.length > 0 ? setStoryViewerOpen(true) : undefined}
            className={`relative w-20 h-20 rounded-full shrink-0 -mt-10 border-4 border-white dark:border-gray-800 shadow overflow-visible ${
              storyGroups.length > 0 ? "cursor-pointer" : "cursor-default"
            }`}
            disabled={storyGroups.length === 0}
            aria-label={storyGroups.length > 0 ? "Hikayeleri görüntüle" : undefined}
          >
            {/* Gradient ring (hikaye varsa) */}
            {storyGroups.length > 0 && (
              <span className={`absolute inset-[-4px] rounded-full ${
                storyGroups[0].hasUnread
                  ? "bg-gradient-to-br from-pink-500 via-orange-400 to-yellow-300"
                  : "bg-gray-400"
              }`} />
            )}
            <span className="absolute inset-[2px] rounded-full bg-white dark:bg-gray-800 z-[1]" />
            <span className="absolute inset-[4px] rounded-full overflow-hidden z-[2] bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                profile.name.charAt(0).toUpperCase()
              )}
            </span>
          </button>

          {/* Bilgiler */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{profile.name}</h1>
              {(profile as any).trainerProfile?.isVerified && (
                <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-700">
                  ✓ Verified Pro
                </span>
              )}
              {profile.birthDate && (
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-bold text-gray-600 dark:text-gray-400">
                  {differenceInYears(new Date(), new Date(profile.birthDate))} Yaş
                </span>
              )}
              {profile.isOwnProfile && (
                <Link href="/profil"><BadgeComp variant="emerald">Sen</BadgeComp></Link>
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
            <div className="flex flex-wrap gap-1.5 mt-2 items-center">
              {badges.length > 0 && badges.map((b) => <BadgeChip key={b.id} badge={b} />)}
              {/* Streak Rozeti */}
              {(profile as any).currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" title={`En uzun seri: ${(profile as any).longestStreak} gün`}>
                  🔥 {(profile as any).currentStreak} Günlük Seri
                </span>
              )}
            </div>

            {/* Trainer Badges */}
            {(profile as any).trainerProfile?.isVerified && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(profile as any).trainerProfile.specialization && (
                  <span className="inline-flex items-center bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                    🎯 {(profile as any).trainerProfile.specialization}
                  </span>
                )}
                {(profile as any).trainerProfile.experience && (
                  <span className="inline-flex items-center bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                    🏆 {(profile as any).trainerProfile.experience} Yıl Deneyim
                  </span>
                )}
                {(profile as any).trainerProfile.hourlyRate && (
                  <span className="inline-flex items-center bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                    💰 {(profile as any).trainerProfile.hourlyRate}₺/sa
                  </span>
                )}
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
            </div>

            {/* Athlete Stats */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-800">
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{profile.totalMatches}</p>
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">Maç</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-3 text-center border border-amber-100 dark:border-amber-800">
                <p className="text-xl font-black text-amber-700 dark:text-amber-300">
                  {profile.avgRating ? `${profile.avgRating.toFixed(1)} ⭐` : "—"}
                </p>
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5">Puan</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-800">
                <p className="text-xl font-black text-blue-700 dark:text-blue-300">{followerCount}</p>
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">Takipçi</p>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800/40 dark:to-slate-800/40 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700">
                <p className="text-xl font-black text-gray-700 dark:text-gray-300">{profile.totalListings}</p>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">İlan</p>
              </div>
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

            {/* Kulüpler */}
            {(profile as any).clubs?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(profile as any).clubs.map((c: { id: string; name: string; role: string; sport?: { icon?: string | null } | null }) => (
                  <span key={c.id} className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs px-2 py-1 rounded-full">
                    {c.sport?.icon ?? "🏅"} {c.name}
                    {c.role === "CAPTAIN" && <span className="ml-1 text-amber-500">👑</span>}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sağ taraf butonlar */}
          <div className="flex flex-col gap-2 min-w-[130px]">
            {session && !profile.isOwnProfile && (
              <>
                {/* Takip / blok durumu */}
                <div className="flex flex-col gap-1">
                  {followsMe && (
                    <span className="text-[11px] text-center text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 rounded-full px-2 py-0.5">
                      👤 Seni takip ediyor
                    </span>
                  )}
                  {blockStatus === "BLOCK" && (
                    <span className="text-[11px] text-center text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 rounded-full px-2 py-0.5">
                      🚫 Engellendi
                    </span>
                  )}
                  {blockStatus === "RESTRICT" && (
                    <span className="text-[11px] text-center text-orange-600 dark:text-orange-400 font-medium bg-orange-50 dark:bg-orange-900/20 rounded-full px-2 py-0.5">
                      🔇 Kısıtlandı
                    </span>
                  )}
                </div>
                {blockStatus !== "BLOCK" && (
                  <Button
                    size="sm"
                    variant={isFollowing ? "secondary" : "primary"}
                    onClick={handleFollow}
                    loading={followLoading}
                  >
                    {isFollowing ? "✓ Takip Ediliyor" : "+ Takip Et"}
                  </Button>
                )}
                <Button size="sm" variant="secondary" onClick={() => setRatingModal(true)}>
                  ⭐ Değerlendir
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowChallengeModal(true)}>
                  ⚔️ Teklif Gönder
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={messagingLoading}
                  onClick={async () => {
                    if (!session) { toast.error("Mesaj göndermek için giriş yapın"); return; }
                    setMessagingLoading(true);
                    try {
                      const res = await startDirectConversation(id);
                      if (res.success && res.data) {
                        router.push(`/mesajlar/dm/${res.data.id}`);
                      } else {
                        toast.error("Konuşma başlatılamadı");
                      }
                    } catch {
                      toast.error("Konuşma başlatılamadı");
                    } finally {
                      setMessagingLoading(false);
                    }
                  }}
                >
                  💬 Mesaj Gönder
                </Button>
                {/* ··· Menü */}
                <div className="relative">
                  <button
                    onClick={() => setDotMenuOpen((v) => !v)}
                    disabled={blockLoading}
                    className="w-full flex items-center justify-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    ··· Daha Fazla
                  </button>
                  {dotMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setDotMenuOpen(false)} />
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-[101] overflow-hidden py-1">
                        {followsMe && (
                          <button
                            onClick={handleRemoveFollower}
                            className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                          >
                            👤 Takipçiyi Çıkar
                          </button>
                        )}
                        <button
                          onClick={() => handleBlock("RESTRICT")}
                          className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                        >
                          🔇 {blockStatus === "RESTRICT" ? "Kısıtlamayı Kaldır" : "Kısıtla"}
                        </button>
                        <button
                          onClick={() => handleBlock("BLOCK")}
                          className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                        >
                          🚫 {blockStatus === "BLOCK" ? "Engeli Kaldır" : "Engelle"}
                        </button>
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                        <button
                          onClick={() => { setDotMenuOpen(false); setReportModal(true); }}
                          className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
                        >
                          🚩 Şikayet Et
                        </button>
                      </div>
                    </>
                  )}
                </div>
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
      </div>

      {/* Sekmeler */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button onClick={() => setActiveTab("posts")} className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${activeTab === "posts" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}>
          📸 Gönderiler
        </button>
        <button onClick={() => setActiveTab("listings")} className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${activeTab === "listings" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}>
          📋 İlanlar ({profile.activeListings.length})
        </button>
        <button onClick={() => setActiveTab("ratings")} className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${activeTab === "ratings" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}>
          ⭐ Değerlendirmeler ({ratings.length})
        </button>
      </div>

      {/* Posts Tab */}
      {activeTab === "posts" && (
        <div>
          {posts.length > 0 && (
            <div className="flex justify-end gap-1 mb-3">
              <button onClick={() => setPostsView("grid")} className={`p-2 rounded-lg text-lg leading-none transition ${postsView === "grid" ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>⊞</button>
              <button onClick={() => setPostsView("list")} className={`p-2 rounded-lg text-lg leading-none transition ${postsView === "list" ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700" : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>☰</button>
            </div>
          )}
          {postsLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <p className="text-4xl mb-2">📸</p>
              <p className="text-sm">Henüz gönderi yok</p>
            </div>
          ) : postsView === "grid" ? (
            <div className="grid grid-cols-3 gap-0.5 rounded-lg overflow-hidden">
              {posts.map((post) => (
                <button key={post.id} onClick={() => setPostsView("list")} className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700 group">
                  {post.images?.[0] ? (
                    <img src={post.images[0]} alt="" className="w-full h-full object-cover group-hover:opacity-80 transition duration-200" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-5 text-center leading-relaxed font-medium">{post.content}</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                    <span className="text-white text-xs font-bold drop-shadow">❤️ {post._count?.likes ?? 0}</span>
                    <span className="text-white text-xs font-bold drop-shadow">💬 {post._count?.comments ?? 0}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden flex items-center justify-center text-base shrink-0">
                      {profile.avatarUrl ? <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" /> : profile.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{profile.name}</p>
                      <p className="text-xs text-gray-400">{format(new Date(post.createdAt), "d MMM yyyy, HH:mm", { locale: tr })}</p>
                    </div>
                  </div>
                  {post.content && <p className="text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap mb-3">{post.content}</p>}
                  {post.images?.length > 0 && (
                    <div className={`grid gap-1.5 mb-3 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                      {post.images.slice(0, 4).map((url: string, i: number) => (
                        <img key={i} src={url} alt="" className="w-full h-48 object-cover rounded-lg" />
                      ))}
                    </div>
                  )}
                  <div className="flex gap-4 pt-2 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                    <span>❤️ {post._count?.likes ?? 0}</span>
                    <span>💬 {post._count?.comments ?? 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

      {/* Teklif Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowChallengeModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">⚔️ Maç / Partner Teklifi</h2>
            <form onSubmit={handleChallenge} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spor Dalı *</label>
                <select
                  required
                  value={challengeForm.sportId}
                  onChange={(e) => setChallengeForm({ ...challengeForm, sportId: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Spor Dalı Seçin</option>
                  {sports.map((s) => (
                    <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teklif Türü</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["RIVAL", "PARTNER"] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setChallengeForm({ ...challengeForm, challengeType: t })}
                      className={`py-2 px-3 rounded-lg text-sm font-medium border transition ${challengeForm.challengeType === t ? "bg-emerald-600 text-white border-emerald-600" : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"}`}
                    >
                      {t === "RIVAL" ? "⚔️ Rakip" : "🤝 Partner"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Önerilen Tarih/Saat (opsiyonel)</label>
                <input
                  type="datetime-local"
                  value={challengeForm.proposedDateTime}
                  onChange={(e) => setChallengeForm({ ...challengeForm, proposedDateTime: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mesaj (opsiyonel)</label>
                <textarea
                  value={challengeForm.message}
                  onChange={(e) => setChallengeForm({ ...challengeForm, message: e.target.value })}
                  rows={3}
                  maxLength={300}
                  placeholder="Kısa bir mesaj ekleyin..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setShowChallengeModal(false)} type="button">İptal</Button>
                <Button type="submit" loading={challengeLoading}>⚔️ Gönder</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Story Viewer */}
      {storyViewerOpen && storyGroups.length > 0 && (
        <StoryViewer
          groups={storyGroups}
          initialGroupIndex={0}
          onClose={() => setStoryViewerOpen(false)}
        />
      )}

      {/* Değerlendirme Modal */}
      {ratingModal && (        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRatingModal(false)}>
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

      {/* Şikayet Modal */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setReportModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">🚩 Şikayet Et</h2>
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
                  placeholder="Şikayetinizi detaylandırın..."
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setReportModal(false)}>İptal</Button>
                <Button onClick={handleReport} loading={reportLoading} className="bg-orange-500 hover:bg-orange-600">Şikayet Gönder</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
