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
    // Optimistic update — hemen butonu güncelle
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowerCount((prev) => next ? prev + 1 : prev - 1);
    setFollowLoading(true);
    try {
      const res = await toggleFollow(id) as any;
      // API { success, following } şeklinde flat döndürüyor
      const actualFollowing = res.following ?? res.data?.following ?? next;
      setIsFollowing(actualFollowing);
      setFollowerCount((prev) => {
        const diff = actualFollowing !== next ? (actualFollowing ? 1 : -1) : 0;
        return prev + diff;
      });
      toast.success(actualFollowing ? "✓ Takip edildi" : "Takipten çıkıldı");
    } catch (err) {
      // Hata durumunda optimistic update'i geri al
      setIsFollowing(!next);
      setFollowerCount((prev) => next ? prev - 1 : prev + 1);
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
    <div className="max-w-3xl mx-auto">

      {/* ── COVER ── */}
      <div className="relative h-36 sm:h-44 rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600">
        {(profile as any).coverUrl && (
          <img src={(profile as any).coverUrl} alt="Kapak" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        {session && !profile.isOwnProfile && blockStatus !== "BLOCK" && (
          <div className="absolute top-3 right-3 z-20">
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`text-xs font-semibold px-3.5 py-1.5 rounded-full backdrop-blur-sm border transition ${
                isFollowing
                  ? "bg-white/25 text-white border-white/40 hover:bg-white/15"
                  : "bg-white text-emerald-700 border-white/80 hover:bg-emerald-50 shadow"
              }`}
            >
              {followLoading ? "..." : isFollowing ? "✓ Takip" : "+ Takip Et"}
            </button>
          </div>
        )}
        {profile.isOwnProfile && (
          <div className="absolute top-3 right-3 z-20">
            <Link href="/profil"
              className="text-xs font-semibold px-3.5 py-1.5 rounded-full bg-white/25 text-white border border-white/40 hover:bg-white/35 backdrop-blur-sm transition">
              Düzenle
            </Link>
          </div>
        )}
      </div>

      {/* ── IDENTITY: Avatar + Ad + Konum ── */}
      <div className="flex items-end gap-4 -mt-8 px-2 relative z-10 mb-1">
        <button
          onClick={() => storyGroups.length > 0 ? setStoryViewerOpen(true) : undefined}
          disabled={storyGroups.length === 0}
          className={`relative flex-shrink-0 w-20 h-20 rounded-2xl border-4 border-white dark:border-gray-900 shadow-lg overflow-visible ${storyGroups.length > 0 ? "cursor-pointer" : ""}`}
        >
          {storyGroups.length > 0 && (
            <span className={`absolute inset-[-4px] rounded-2xl ${storyGroups[0].hasUnread ? "bg-gradient-to-br from-pink-500 via-orange-400 to-yellow-300" : "bg-gray-300 dark:bg-gray-600"}`} />
          )}
          <span className="absolute inset-0 rounded-2xl overflow-hidden bg-emerald-100 dark:bg-emerald-900/30 z-[1] flex items-center justify-center text-2xl font-semibold text-emerald-600">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
            ) : profile.name.charAt(0).toUpperCase()}
          </span>
        </button>
        <div className="pb-2 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white leading-tight">{profile.name}</h1>
            {(profile as any).trainerProfile?.isVerified && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 whitespace-nowrap">🏅 Antrenör</span>
            )}
            {(profile as any).userType === "VENUE" && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 whitespace-nowrap">🏟️ Tesis</span>
            )}
            {profile.isOwnProfile && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Sen</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {profile.city && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                📍 {profile.city.name}{profile.city.country ? `, ${profile.city.country.name}` : ""}
              </p>
            )}
            {profile.birthDate && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {differenceInYears(new Date(), new Date(profile.birthDate))} yaş
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── STATS + ACTION BAR ───────────────────────────── */}
      <div className="px-2 pt-1 pb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">

          {/* Stats row */}
          <div className="flex items-center gap-4 sm:gap-5 flex-wrap">
            {[
              { val: profile.totalMatches, label: "Maç" },
              { val: followerCount, label: "Takipçi" },
              { val: followingCount, label: "Takip" },
              { val: profile.avgRating ? `${profile.avgRating.toFixed(1)} ⭐` : "—", label: "Puan" },
              { val: profile.totalListings, label: "İlan" },
            ].map(s => (
              <span key={s.label} className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{s.val}</span>{" "}{s.label}
              </span>
            ))}
          </div>

          {/* Action icons */}
          {session && !profile.isOwnProfile && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={async () => {
                  if (!session) { toast.error("Giriş yapın"); return; }
                  setMessagingLoading(true);
                  try {
                    const res = await startDirectConversation(id);
                    if (res.success && res.data) router.push(`/mesajlar/dm/${res.data.id}`);
                    else toast.error("Konuşma başlatılamadı");
                  } catch { toast.error("Konuşma başlatılamadı"); }
                  finally { setMessagingLoading(false); }
                }}
                disabled={messagingLoading}
                title="Mesaj Gönder"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 transition text-base"
              >💬</button>
              {blockStatus !== "BLOCK" && (
                <button onClick={() => setShowChallengeModal(true)} title="Teklif Gönder"
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 transition text-base">
                  ⚔️
                </button>
              )}
              <button onClick={() => setRatingModal(true)} title="Değerlendir"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-500 transition text-base">
                ⭐
              </button>
              <div className="relative">
                <button onClick={() => setDotMenuOpen(v => !v)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-600 dark:text-gray-400 font-bold text-sm">
                  ···
                </button>
                {dotMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setDotMenuOpen(false)} />
                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-[101] overflow-hidden py-1">
                      {followsMe && (
                        <button onClick={handleRemoveFollower} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                          👤 Takipçiyi Çıkar
                        </button>
                      )}
                      <button onClick={() => handleBlock("RESTRICT")} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        🔇 {blockStatus === "RESTRICT" ? "Kısıtlamayı Kaldır" : "Kısıtla"}
                      </button>
                      <button onClick={() => handleBlock("BLOCK")} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                        🚫 {blockStatus === "BLOCK" ? "Engeli Kaldır" : "Engelle"}
                      </button>
                      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                      <button onClick={() => { setDotMenuOpen(false); setReportModal(true); }} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition">
                        🚩 Şikayet Et
                      </button>
                    </div>
                  </>
                )}
              </div>
              {blockStatus === "BLOCK" && (
                <span className="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-900/20 px-2.5 py-1 rounded-full">🚫 Engellendi</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── ABOUT ── */}
      <div className="px-2 pt-3 pb-6 space-y-3">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {badges.length > 0 && badges.map((b) => <BadgeChip key={b.id} badge={b} />)}
          {(profile as any).currentStreak > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
              🔥 {(profile as any).currentStreak} günlük seri
            </span>
          )}
        </div>

        {/* Rating */}
        {profile.avgRating !== null && profile.avgRating !== undefined && (
          <div className="flex items-center gap-2">
            <StarRating value={Math.round(profile.avgRating)} />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {profile.avgRating.toFixed(1)} ({profile.ratingCount} değerlendirme)
            </span>
          </div>
        )}

        {/* Trainer info */}
        {(profile as any).trainerProfile?.isVerified && (
          <div className="flex flex-wrap gap-1.5">
            {(profile as any).trainerProfile.specialization && (
              <span className="inline-flex items-center bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                🎯 {(profile as any).trainerProfile.specialization}
              </span>
            )}
            {(profile as any).trainerProfile.experience && (
              <span className="inline-flex items-center bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                🏆 {(profile as any).trainerProfile.experience} Yıl Deneyim
              </span>
            )}
            {(profile as any).trainerProfile.hourlyRate && (
              <span className="inline-flex items-center bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                💰 {(profile as any).trainerProfile.hourlyRate}₺/sa
              </span>
            )}
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{profile.bio}</p>
        )}

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
          <span>📅 {joinDate} tarihinden beri</span>
        </div>

        {/* Sports */}
        {profile.sports.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {profile.sports.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-1 rounded-full font-medium">
                {s.icon} {s.name}
              </span>
            ))}
          </div>
        )}

        {/* Clubs */}
        {(profile as any).clubs?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(profile as any).clubs.map((c: { id: string; name: string; role: string; sport?: { icon?: string | null } | null }) => (
              <span key={c.id} className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-xs px-2.5 py-1 rounded-full font-medium">
                {c.sport?.icon ?? "🏅"} {c.name}
                {c.role === "CAPTAIN" && <span className="ml-0.5 text-amber-500">👑</span>}
              </span>
            ))}
          </div>
        )}

        {/* Follow status chips */}
        {followsMe && (
          <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-900/20 rounded-full px-2.5 py-1">
            👤 Seni takip ediyor
          </span>
        )}
      </div>

      {/* ── STICKY TABS ──────────────────────────────────── */}
      <div className="sticky top-[60px] z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 overflow-hidden mt-2">
        <div className="flex">
          {[
            { key: "posts",    label: "📸 Gönderiler" },
            { key: "listings", label: `📋 İlanlar ${profile.activeListings.length > 0 ? `(${profile.activeListings.length})` : ""}` },
            { key: "ratings",  label: `⭐ Değerlendirmeler ${ratings.length > 0 ? `(${ratings.length})` : ""}` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as typeof activeTab)}
              className={`flex-1 py-3 text-xs sm:text-sm font-semibold transition-colors relative ${
                activeTab === t.key
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t.label}
              {activeTab === t.key && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-emerald-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
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
