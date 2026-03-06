"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, differenceInYears } from "date-fns";
import { tr } from "date-fns/locale";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { getPublicProfile, submitRating, getUserRatings, toggleFollow, getFollowStats, getLeaderboard, startDirectConversation, removeFollower } from "@/services/api";
import { APIError } from "@/services/api";
import type { PublicProfile, Rating, Badge, UserStoryGroup } from "@/types";
import { LEVEL_LABELS, LEVEL_COLORS } from "@/types";
import BadgeComp from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import StoryViewer from "@/components/StoryViewer";
import TrainerBadgePopup from "@/components/profile/TrainerBadgePopup";
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
  const [profileAccessError, setProfileAccessError] = useState<"blocked" | "private" | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingModal, setRatingModal] = useState(false);
  const [ratingScore, setRatingScore] = useState(5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [activeTab, setActiveTab] = useState<"listings" | "ratings" | "posts" | "stats">("posts");
  const [statsData, setStatsData] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsView, setPostsView] = useState<"grid" | "list">("grid");

  // Story state
  const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([]);
  const [storyViewerOpen, setStoryViewerOpen] = useState(false);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [pendingFollow, setPendingFollow] = useState(false);
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
        setPendingFollow(res.data.pending ?? false);
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
          // Pending follow isteği
          if ((p.data as any).pendingFollow) setPendingFollow(true);
          // Sizi engelleyen kullanıcı ise blockStatus'u BLOCK olarak ayarla
          if ((p.data as any).isBlockedByThem) {
            setBlockStatus("BLOCK");
          }
        } else if ((p as any).code === "BLOCKED") {
          // Hedef kullanıcı bizi engellemişÇ profil görüntülenemiyor
          setBlockStatus("BLOCK");
        }
        if (r.success && r.data) setRatings(r.data);
        if (lb.success && lb.data) {
          const entry = lb.data.find((e) => e.id === id);
          if (entry) setBadges(entry.badges);
        }
      })
      .catch((err) => {
        if (err instanceof APIError && err.status === 403) {
          // 403: engellendi veya gizli profil
          setProfileAccessError("blocked");
        } else {
          toast.error("Profil yüklenemedi");
        }
      })
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
    if (activeTab !== "stats") return;
    setStatsLoading(true);
    fetch(`/api/users/${id}/stats`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setStatsData(json.data); })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [id, activeTab]);

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
    // Pending istek varsa iptal et
    if (pendingFollow) {
      setFollowLoading(true);
      try {
        await toggleFollow(id);
        setPendingFollow(false);
        toast.success("Takip isteği geri alındı");
      } catch { toast.error("Hata oluştu"); }
      finally { setFollowLoading(false); }
      return;
    }
    // Optimistic update — hemen butonu güncelle
    const next = !isFollowing;
    if (!profile?.isPrivateProfile) {
      setIsFollowing(next);
      setFollowerCount((prev) => next ? prev + 1 : prev - 1);
    }
    setFollowLoading(true);
    try {
      const res = await toggleFollow(id) as any;
      const actualFollowing = res.following ?? res.data?.following ?? next;
      const actualPending = res.pending ?? false;
      setIsFollowing(actualFollowing);
      setPendingFollow(actualPending);
      setFollowerCount((prev) => {
        const diff = actualFollowing !== next ? (actualFollowing ? 1 : -1) : 0;
        return prev + diff;
      });
      if (actualPending) {
        toast.success("⏳ Takip isteği gönderildi");
      } else {
        toast.success(actualFollowing ? "✓ Takip edildi" : "Takipten çıkıldı");
      }
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
    if (profileAccessError === "blocked") {
      return (
        <div className="text-center py-16 max-w-sm mx-auto">
          <span className="text-6xl">🚫</span>
          <p className="mt-4 font-semibold text-gray-700 dark:text-gray-300">Bu profili görüntüleme izniniz yok</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Bu kullanıcı profilini gizlemiş veya sizi engellemiş olabilir.</p>
        </div>
      );
    }
    return (
      <div className="text-center py-16">
        <span className="text-6xl">😕</span>
        <p className="mt-4 text-gray-500 dark:text-gray-400">Kullanıcı bulunamadı</p>
      </div>
    );
  }

  const joinDate = format(new Date(profile.createdAt), "MMMM yyyy", { locale: tr });

  // restricted state: kapalı profil ve takip etmiyoruz
  const isRestricted = (profile as any).isRestricted;

  // Gizlilik kontrolü: mesaj gönderme izni var mı?
  const whoCanMessage = (profile as any).whoCanMessage ?? "EVERYONE";
  const canMessage =
    !isRestricted && (
      whoCanMessage === "EVERYONE" ||
      (whoCanMessage === "FOLLOWERS" && isFollowing)
    );

  // Gizlilik kontrolü: teklif gönderme izni var mı?
  const whoCanChallenge = (profile as any).whoCanChallenge ?? "EVERYONE";
  const canChallenge =
    !isRestricted && (
      whoCanChallenge === "EVERYONE" ||
      (whoCanChallenge === "FOLLOWERS" && isFollowing)
    );

  return (
    <div className="max-w-2xl mx-auto pb-24">

      {/* ── COVER ─────────────────────────────────────────── */}
      <div className="relative">
        <div className="h-40 sm:h-48 bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500 overflow-hidden">
          {(profile as any).coverUrl && (
            <img src={(profile as any).coverUrl} alt="Kapak" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Edit on own profile */}
        {profile.isOwnProfile && (
          <Link href="/ayarlar/profil"
            className="absolute top-3 right-3 z-10 text-xs font-semibold px-3 py-1.5 rounded-full bg-black/40 text-white hover:bg-black/55 backdrop-blur-sm transition">
            ✏️ Düzenle
          </Link>
        )}
      </div>

      {/* ── PROFILE INFO ──────────────────────────────────── */}
      <div className="px-4 sm:px-5">
        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-10 sm:-mt-12 mb-3">
          <button
            onClick={() => storyGroups.length > 0 ? setStoryViewerOpen(true) : undefined}
            disabled={storyGroups.length === 0}
            className={`relative block w-20 h-20 sm:w-24 sm:h-24 rounded-full border-[3px] border-white dark:border-gray-900 shadow-md overflow-visible shrink-0 ${storyGroups.length > 0 ? "cursor-pointer" : ""}`}
          >
            {storyGroups.length > 0 && (
              <span className={`absolute inset-[-3px] rounded-full ${storyGroups[0].hasUnread ? "bg-gradient-to-br from-pink-500 via-orange-400 to-yellow-300" : "bg-gray-300 dark:bg-gray-600"}`} />
            )}
            <span className="absolute inset-0 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 z-[1] flex items-center justify-center text-2xl sm:text-3xl font-bold text-emerald-600">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name} className="w-full h-full object-cover" />
              ) : profile.name.charAt(0).toUpperCase()}
            </span>
          </button>

          {/* Actions — right side */}
          <div className="flex items-center gap-2 pb-1">
            {session && !profile.isOwnProfile && blockStatus !== "BLOCK" && (
              <button
                onClick={pendingFollow ? undefined : handleFollow}
                disabled={followLoading}
                className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition ${
                  pendingFollow
                    ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 cursor-default"
                    : isFollowing
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
              >
                {followLoading ? "..." : pendingFollow ? "⏳ İstek Gönderildi" : isFollowing ? "Takip Ediliyor" : "Takip Et"}
              </button>
            )}
            {!profile.isOwnProfile && (
              <div className="flex items-center gap-1.5">
                {/* Mesaj butonu: gizlilik ayarına göre gizle */}
                {session && blockStatus !== "BLOCK" && canMessage && (
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
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm"
                  >💬</button>
                )}
                {/* Teklif butonu: engellenmemiş VE gizlilik izni varsa göster */}
                {session && blockStatus !== "BLOCK" && canChallenge && (
                  <button
                    onClick={() => setShowChallengeModal(true)}
                    title="Teklif Gönder"
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition text-sm text-orange-600 dark:text-orange-400"
                  >⚔️</button>
                )}
                {session && !isRestricted && (
                  <button
                    onClick={() => setRatingModal(true)}
                    title="Değerlendir"
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition text-sm text-yellow-600 dark:text-yellow-400"
                  >⭐</button>
                )}
                <button
                  onClick={() => setDotMenuOpen(v => !v)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-500 dark:text-gray-400 text-sm font-bold">
                  ···
                </button>
              </div>
            )}
            {dotMenuOpen && (
              <>
                      <div className="fixed inset-0 z-[100]" onClick={() => setDotMenuOpen(false)} />
                      <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-[101] overflow-hidden py-1">
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
                        <button onClick={() => { setDotMenuOpen(false); setReportModal(true); }} className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition">
                          🚩 Şikayet Et
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
            {blockStatus === "BLOCK" && (
              <span className="text-xs text-red-500 font-medium">🚫 Engellendi</span>
            )}
          </div>
        </div>

        {/* Name + info */}
        <div className="mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">{profile.name}</h1>
            {(profile as any).trainerProfile?.isVerified && (
              <TrainerBadgePopup
                trainerProfile={(profile as any).trainerProfile}
                user={{
                  name: profile.name,
                  avatarUrl: profile.avatarUrl,
                  birthDate: (profile as any).birthDate,
                  city: profile.city as any,
                }}
                isOwn={profile.isOwnProfile}
              />
            )}
            {(profile as any).userType === "VENUE" && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">🏟️ Tesis</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            {profile.city && (
              <span>{profile.city.name}{profile.city.country ? `, ${profile.city.country.name}` : ""}</span>
            )}
            {profile.birthDate && profile.city && <span>·</span>}
            {profile.birthDate && (
              <span>{differenceInYears(new Date(), new Date(profile.birthDate))} yaşında</span>
            )}
          </div>
          {followsMe && (
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 inline-block">Seni takip ediyor</span>
          )}
        </div>

        {/* Social links */}
        {(() => {
          const socialLinks = [
            { key: "instagram", color: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400", url: `https://instagram.com/${(profile as any).instagram}`, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg> },
            { key: "tiktok",    color: "bg-black dark:bg-white dark:text-black", url: `https://tiktok.com/@${(profile as any).tiktok}`,    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.79a8.18 8.18 0 004.78 1.52V6.85a4.85 4.85 0 01-1.01-.16z"/></svg> },
            { key: "facebook",  color: "bg-[#1877F2]",      url: `https://facebook.com/${(profile as any).facebook}`, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
            { key: "twitterX",  color: "bg-black dark:bg-white dark:text-black", url: `https://x.com/${(profile as any).twitterX}`,        icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
            { key: "vk",        color: "bg-[#4C75A3]",      url: `https://vk.com/${(profile as any).vk}`,             icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2zm3.08 13.5h-1.64c-.63 0-.82-.52-1.93-1.63-.96-.96-1.39-.96-1.39 0 0 1.63-.43 1.63-1.08 1.63-1.67 0-3.52-1.04-4.82-2.84-1.96-2.73-2.5-4.72-2.5-5.12 0-.18.15-.35.35-.35h1.64c.26 0 .35.15.44.38.51 1.57 1.39 2.95 1.74 2.95.14 0 .2-.06.2-.38V9.35c-.04-.62-.35-.67-.35-.89 0-.15.12-.3.3-.3h2.57c.22 0 .3.12.3.35v2.74c0 .22.09.3.16.3.14 0 .27-.08.55-.38.87-.99 1.5-2.51 1.5-2.51.09-.2.25-.38.5-.38h1.64c.49 0 .6.25.49.56-.21.64-2.08 2.66-2.08 2.66-.16.24-.22.35 0 .61.16.2.69.74 1.05 1.17.65.73 1.14 1.35 1.27 1.78.14.42-.08.64-.49.64z"/></svg> },
          ].filter(s => !!(profile as any)[s.key]);
          return socialLinks.length > 0 ? (
            <div className="flex items-center gap-1.5 mb-3">
              {socialLinks.map(s => (
                <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer"
                  className={`w-8 h-8 flex items-center justify-center rounded-full ${s.color} text-white hover:opacity-80 transition-opacity shadow-sm`}>
                  {s.icon}
                </a>
              ))}
            </div>
          ) : null;
        })()}

        {/* Stats — clean inline row */}
        <div className="flex items-center gap-4 text-sm mb-3">
          <span><strong className="text-gray-900 dark:text-white">{profile.totalMatches}</strong> <span className="text-gray-500 dark:text-gray-400">maç</span></span>
          <button onClick={() => !isRestricted && setActiveTab("stats")} className="hover:opacity-80 transition">
            <strong className="text-gray-900 dark:text-white">{followerCount}</strong> <span className="text-gray-500 dark:text-gray-400">takipçi</span>
          </button>
          <button onClick={() => !isRestricted && setActiveTab("stats")} className="hover:opacity-80 transition">
            <strong className="text-gray-900 dark:text-white">{followingCount}</strong> <span className="text-gray-500 dark:text-gray-400">takip</span>
          </button>
          {profile.avgRating !== null && profile.avgRating !== undefined && (
            <span><strong className="text-gray-900 dark:text-white">{profile.avgRating.toFixed(1)}</strong> <span className="text-gray-500 dark:text-gray-400">★ ({profile.ratingCount})</span></span>
          )}
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">{profile.bio}</p>
        )}

        {/* Sports + badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {profile.sports.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2.5 py-1 rounded-full">
              {s.icon} {s.name}
            </span>
          ))}
          {badges.length > 0 && badges.map((b) => <BadgeChip key={b.id} badge={b} />)}
          {(profile as any).currentStreak > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20">
              🔥 {(profile as any).currentStreak} gün seri
            </span>
          )}
        </div>

        {/* Clubs */}
        {(profile as any).clubs?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(profile as any).clubs.map((c: { id: string; name: string; role: string; sport?: { icon?: string | null } | null }) => (
              <span key={c.id} className="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                {c.sport?.icon ?? "🏅"} {c.name}{c.role === "CAPTAIN" ? " 👑" : ""}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">📅 {joinDate} tarihinden beri üye</p>
      </div>

      {/* ── TABS ──────────────────────────────────────────── */}
      <div className="sticky top-[56px] z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="flex max-w-2xl mx-auto">
          {[
            { key: "posts",    label: "Gönderiler" },
            { key: "listings", label: `İlanlar${profile.activeListings.length > 0 ? ` (${profile.activeListings.length})` : ""}` },
            { key: "ratings",  label: `Değerlendirmeler${ratings.length > 0 ? ` (${ratings.length})` : ""}` },
            { key: "stats",    label: "İstatistikler" },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as typeof activeTab)}
              className={`flex-1 py-3 text-xs sm:text-sm font-medium transition-colors relative ${
                activeTab === t.key
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {t.label}
              {activeTab === t.key && (
                <span className="absolute bottom-0 inset-x-0 h-0.5 bg-emerald-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ───────────────────────────────────── */}
      <div className="px-4 sm:px-5 pt-4">

      {/* ── RESTRICTED OVERLAY ────────────────────────────── */}
      {isRestricted && (
        <div className="py-16 px-6 text-center bg-gray-50 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-emerald-600 dark:text-emerald-400">🔒</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Bu Profil Gizli</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[240px] mx-auto leading-relaxed">
            Paylaşımları ve detayları görmek için bu kullanıcıyı takip etmelisin.
          </p>
          {!session && (
            <button 
              onClick={() => router.push("/auth/login")}
              className="mt-5 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
            >
              Giriş Yap ve Takip Et
            </button>
          )}
        </div>
      )}

      {/* Posts Tab */}
      {!isRestricted && activeTab === "posts" && (
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
      {!isRestricted && activeTab === "listings" && (
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
      {!isRestricted && activeTab === "ratings" && (
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

      {/* İstatistikler */}
      {!isRestricted && activeTab === "stats" && (
        <div className="space-y-5 pb-8">
          {statsLoading ? (
            <div className="flex justify-center py-14"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
          ) : !statsData ? (
            <p className="text-center text-gray-400 dark:text-gray-500 py-12">İstatistikler yüklenemedi</p>
          ) : (
            <>
              {/* Özet kartlar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Toplam Maç", value: statsData.totalMatches, icon: "⚔️" },
                  { label: "Tamamlanan", value: statsData.completedMatches, icon: "✅" },
                  { label: "Günlük Seri", value: `${statsData.currentStreak} 🔥`, icon: "📅" },
                  { label: "Rekor Seri",  value: `${statsData.longestStreak} 🏆`, icon: "🌟" },
                ].map((card) => (
                  <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 text-center">
                    <p className="text-2xl mb-1">{card.icon}</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{card.value}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{card.label}</p>
                  </div>
                ))}
              </div>

              {/* Ortalama puan */}
              {statsData.avgRating !== null && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
                  <span className="text-3xl">⭐</span>
                  <div>
                    <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{statsData.avgRating}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{statsData.ratingCount} değerlendirme</p>
                  </div>
                </div>
              )}

              {/* Spora göre dağılım */}
              {statsData.bySport.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Spora Göre Maçlar</h3>
                  <div className="space-y-2">
                    {statsData.bySport.map((s: any) => {
                      const max = statsData.bySport[0]?.matchCount || 1;
                      return (
                        <div key={s.id}>
                          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-0.5">
                            <span>{s.icon || "🏅"} {s.name}</span>
                            <span className="font-semibold">{s.matchCount} maç{s.avgRating ? ` · ⭐${s.avgRating}` : ""}</span>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${Math.round((s.matchCount / max) * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Aylık aktivite */}
              {statsData.monthly.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Son 12 Ay Aktivitesi</h3>
                  <div className="flex items-end gap-1 h-20">
                    {statsData.monthly.map((m: any) => {
                      const maxM = Math.max(...statsData.monthly.map((x: any) => x.count), 1);
                      const heightPct = Math.round((m.count / maxM) * 100);
                      const label = m.month.slice(5); // MM only
                      return (
                        <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5" title={`${m.month}: ${m.count} maç`}>
                          <div className="w-full flex flex-col justify-end h-16">
                            <div
                              className={`w-full rounded-sm transition-all duration-500 ${m.count > 0 ? "bg-emerald-500" : "bg-gray-100 dark:bg-gray-700"}`}
                              style={{ height: m.count > 0 ? `${Math.max(heightPct, 8)}%` : "4px" }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      </div>{/* end tab content */}

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
