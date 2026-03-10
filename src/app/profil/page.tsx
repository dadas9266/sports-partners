"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, isAfter, startOfToday } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";
import { useProfile } from "@/hooks/useProfile";
import { useLocations, useSports } from "@/hooks/useLocations";
import { deleteListing, updateProfile } from "@/services/api";
import type { ListingWithResponses, ResponseWithListing, Match, ProfileEditForm } from "@/types";
import { STATUS_LABELS } from "@/types";

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ProfileCompletionRing from "@/components/ProfileCompletionRing";
import ProfileStatsBar from "@/components/profile/ProfileStatsBar";
import ProfileStreakCard from "@/components/profile/ProfileStreakCard";
import ProfileSportsStrip from "@/components/profile/ProfileSportsStrip";
import RatingModal from "@/components/profile/RatingModal";
import ProfileHeaderView from "@/components/profile/ProfileHeaderView";
import ProfileEditFormPanel from "@/components/profile/ProfileEditForm";
import CreatePostBox from "@/components/profile/CreatePostBox";
import PostCard from "@/components/profile/PostCard";
import FollowListModal from "@/components/profile/FollowListModal";

// Eksik alanları tespit eden fonksiyon
function getMissingProfileFields(user: any) {
  const missing: string[] = [];
  if (!user.avatarUrl) missing.push("Profil fotoğrafı");
  if (!user.phone) missing.push("Telefon numarası");
  if (!user.birthDate) missing.push("Doğum tarihi");
  if (user.userType === "VENUE") {
    // venueProfile ilişkili model üzerinden kontrol (User'da doğrudan alan yok)
    if (!user.venueProfile?.name) missing.push("Tesis adı");
    if (!user.venueProfile?.address) missing.push("Tesis adresi");
  }
  if (user.userType === "TRAINER" && (!user.trainerProfile?.specializations || user.trainerProfile.specializations.length === 0)) {
    missing.push("Branş ve/veya sertifika");
  }
  return missing;
}

export default function ProfilePage() {
  const { data, loading, error, status, session, refresh, setData } = useProfile();
  const { locations } = useLocations();
  const { sports } = useSports();
  const allCities = locations.flatMap((c) => c.cities ?? []).sort((a, b) => {
    // Türkiye şehirlerini en üste al (code="TR")
    const isATurkey = locations.find(l => l.cities?.some(city => city.id === a.id))?.code === "TR";
    const isBTurkey = locations.find(l => l.cities?.some(city => city.id === b.id))?.code === "TR";
    if (isATurkey && !isBTurkey) return -1;
    if (!isATurkey && isBTurkey) return 1;
    return a.name.localeCompare(b.name);
  });
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"listings" | "responses" | "matches" | "calendar" | "templates" | "posts" | "challenges">("posts");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [followListOpen, setFollowListOpen] = useState<null | "followers" | "following">(null);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [ratingModal, setRatingModal] = useState<{ matchId: string; partnerName: string } | null>(null);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsView, setPostsView] = useState<"grid" | "list">("grid");
  const [challenges, setChallenges] = useState<any[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [otpFlow, setOtpFlow] = useState<Record<string, { step: "idle" | "requested" | "verifying"; code: string; generated?: string; loading: boolean }>>({});

  const requestOtp = async (matchId: string) => {
    setOtpFlow(p => ({ ...p, [matchId]: { step: "requested", code: "", loading: true } }));
    try {
      const res = await fetch(`/api/matches/${matchId}/otp`, { method: "POST" });
      const json = await res.json();
      if (json.code) {
        setOtpFlow(p => ({ ...p, [matchId]: { step: "requested", code: "", generated: json.code, loading: false } }));
      } else {
        toast.error(json.error || "OTP oluşturulamadı");
        setOtpFlow(p => ({ ...p, [matchId]: { step: "idle", code: "", loading: false } }));
      }
    } catch { setOtpFlow(p => ({ ...p, [matchId]: { step: "idle", code: "", loading: false } })); }
  };

  const verifyOtp = async (matchId: string) => {
    const flow = otpFlow[matchId];
    if (!flow) return;
    setOtpFlow(p => ({ ...p, [matchId]: { ...flow, loading: true } }));
    try {
      const res = await fetch(`/api/matches/${matchId}/otp`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: flow.code }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Maç doğrulandı! ✓");
        setOtpFlow(p => ({ ...p, [matchId]: { step: "idle", code: "", loading: false } }));
        refresh();
      } else {
        toast.error(json.error || "Geçersiz kod");
        setOtpFlow(p => ({ ...p, [matchId]: { ...flow, loading: false } }));
      }
    } catch { setOtpFlow(p => ({ ...p, [matchId]: { ...flow, loading: false } })); }
  };

  // Profile edit states
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<ProfileEditForm>({
    name: "", phone: "", currentPassword: "", newPassword: "",
    bio: "", cityId: "", districtId: "", gender: "", birthDate: "", sportIds: [],
    instagram: "", tiktok: "", facebook: "", twitterX: "", vk: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/giris");
    }
  }, [status, router]);

  useEffect(() => {
    if (activeTab !== "challenges") return;
    setChallengesLoading(true);
    Promise.all([
      fetch("/api/challenges?direction=received").then(r => r.json()),
      fetch("/api/challenges?direction=sent").then(r => r.json()),
    ]).then(([rec, sent]) => {
      const recList = Array.isArray(rec.data) ? rec.data.map((c: any) => ({ ...c, direction: "received" })) : [];
      const sentList = Array.isArray(sent.data) ? sent.data.map((c: any) => ({ ...c, direction: "sent" })) : [];
      setChallenges([...recList, ...sentList]);
    }).catch(() => {})
      .finally(() => setChallengesLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "posts" || !session?.user) return;
    setPostsLoading(true);
    fetch(`/api/posts?userId=${session.user.id}`)
      .then((r) => r.json())
      .then((json) => { if (Array.isArray(json.posts)) setPosts(json.posts); })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [activeTab, session?.user]);

  if (status === "unauthenticated") return null;

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16" role="alert">
        <p className="text-red-500">{error}</p>
        <button
          onClick={refresh}
          className="mt-4 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  if (!session || !data) return null;

  const pendingResponsesCount = data.myListings?.reduce(
    (acc: number, l: ListingWithResponses) =>
      acc + (l.responses?.filter((r) => r.status === "PENDING")?.length || 0),
    0
  );

  const handleDeleteListing = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await deleteListing(deleteModal);
      toast.success("İlan silindi");
      setData((prev) => prev ? { ...prev, myListings: prev.myListings?.filter((l: any) => l.id !== deleteModal) } : prev);
    } finally {
      setDeleting(false);
      setDeleteModal(null);
    }
  };

  // Handler to enter edit mode and populate the edit form
  const handleEditProfile = () => {
    const profileUser = data.user as typeof data.user & {
      bio?: string | null;
      cityId?: string | null;
      districtId?: string | null;
      gender?: string | null;
      birthDate?: string | null;
    };
    setEditForm({
      name: data.user.name || "",
      phone: data.user.phone || "",
      currentPassword: "",
      newPassword: "",
      bio: profileUser.bio ?? "",
      cityId: profileUser.cityId ?? "",
      districtId: profileUser.districtId ?? "",
      gender: profileUser.gender ?? "",
      birthDate: profileUser.birthDate ? format(new Date(profileUser.birthDate), "yyyy-MM-dd") : "",
      sportIds: (data.user.sports ?? []).map((s) => s.id),
      instagram: (data.user as any).instagram ?? "",
      tiktok: (data.user as any).tiktok ?? "",
      facebook: (data.user as any).facebook ?? "",
      twitterX: (data.user as any).twitterX ?? "",
      vk: (data.user as any).vk ?? "",
    });
    setEditMode(true);
  };

  const handleSaveProfile = async () => {
    // Client-side validation
    if (!editForm.name.trim()) {
      toast.error("Ad Soyad boş olamaz");
      return;
    }
    if (editForm.name.trim().length < 2) {
      toast.error("Ad Soyad en az 2 karakter olmalıdır");
      return;
    }
    if (editForm.phone && !/^[0-9+\-\s()]{7,15}$/.test(editForm.phone)) {
      toast.error("Geçerli bir telefon numarası girin");
      return;
    }
    if (editForm.newPassword) {
      if (!editForm.currentPassword) {
        toast.error("Mevcut şifrenizi girin");
        return;
      }
      const pwErrors = [
        editForm.newPassword.length < 8 && "en az 8 karakter",
        !/[A-Z]/.test(editForm.newPassword) && "büyük harf",
        !/[a-z]/.test(editForm.newPassword) && "küçük harf",
        !/[0-9]/.test(editForm.newPassword) && "rakam",
        !/[^A-Za-z0-9]/.test(editForm.newPassword) && "özel karakter",
      ].filter(Boolean);
      if (pwErrors.length > 0) {
        toast.error(`Yeni şifre gereksinimleri: ${pwErrors.join(", ")}`);
        return;
      }
    }

    setSaving(true);
    try {
      const profileUser = data.user as typeof data.user & { 
        bio?: string | null; 
        cityId?: string | null;
        districtId?: string | null;
        gender?: string | null;
        birthDate?: string | null;
      };
      const currentSports = (data as typeof data & { sports?: Array<{ id: string }> }).sports ?? [];
      const payload: Record<string, unknown> = {};
      
      if (editForm.name !== data.user.name) payload.name = editForm.name;
      if (editForm.phone !== (data.user.phone || "")) payload.phone = editForm.phone || null;
      if (editForm.bio !== (profileUser.bio ?? "")) payload.bio = editForm.bio || null;
      if (editForm.cityId !== (profileUser.cityId ?? "")) payload.cityId = editForm.cityId || null;
      if (editForm.districtId !== (profileUser.districtId ?? "")) payload.districtId = editForm.districtId || null;
      if (editForm.gender !== (profileUser.gender ?? "")) payload.gender = editForm.gender || null;
      
      const currentBirthDateStr = profileUser.birthDate ? format(new Date(profileUser.birthDate), "yyyy-MM-dd") : "";
      if (editForm.birthDate !== currentBirthDateStr) payload.birthDate = editForm.birthDate || null;

      const sortFn = (a: string, b: string) => a.localeCompare(b);
      const currentSportIds = currentSports.map((s) => s.id);
      if (JSON.stringify([...(editForm.sportIds ?? [])].sort(sortFn)) !== JSON.stringify([...currentSportIds].sort(sortFn))) {
        payload.sportIds = editForm.sportIds ?? [];
      }
      if (editForm.newPassword) {
        payload.currentPassword = editForm.currentPassword;
        payload.newPassword = editForm.newPassword;
      }
      // Sosyal medya
      const u = data.user as any;
      if ((editForm.instagram ?? "") !== (u.instagram ?? "")) payload.instagram = editForm.instagram || null;
      if ((editForm.tiktok ?? "") !== (u.tiktok ?? "")) payload.tiktok = editForm.tiktok || null;
      if ((editForm.facebook ?? "") !== (u.facebook ?? "")) payload.facebook = editForm.facebook || null;
      if ((editForm.twitterX ?? "") !== (u.twitterX ?? "")) payload.twitterX = editForm.twitterX || null;
      if ((editForm.vk ?? "") !== (u.vk ?? "")) payload.vk = editForm.vk || null;
      if (Object.keys(payload).length === 0) {
        setEditMode(false);
        return;
      }
      await updateProfile(payload);
      toast.success("Profil güncellendi");
      setEditMode(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const missingFields = getMissingProfileFields(data.user);

  // Eksik alan tamamlandığında güven puanı artır
  async function handleFieldCompleted(field: string) {
    try {
      await fetch("/api/profile/trust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field }),
      });
      // refresh(); // Gerekirse puan güncellemesi için
    } catch {}
  }

  return (
    <div className="max-w-2xl mx-auto pb-24">
      {/* Profil Tamamlanma Çemberi */}
      <div className="mb-4">
        <ProfileCompletionRing
          user={data.user as any}
          listings={data.myListings}
          matches={data.myMatches}
        />
      </div>
      {/* Profil başlığı */}
      <div className="mb-4">
        {!editMode ? (
          <ProfileHeaderView
            user={data.user as any}
            uploadingAvatar={uploadingAvatar}
            uploadingCover={uploadingCover}
            setUploadingAvatar={setUploadingAvatar}
            setUploadingCover={setUploadingCover}
            onEditClick={handleEditProfile}
            onUploadSuccess={refresh}
            onFollowerClick={() => setFollowListOpen("followers")}
            onFollowingClick={() => setFollowListOpen("following")}
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <ProfileEditFormPanel
              editForm={editForm}
              setEditForm={setEditForm}
              sports={sports}
              locations={locations}
              saving={saving}
              onSave={handleSaveProfile}
              onCancel={() => setEditMode(false)}
            />
          </div>
        )}
        {/* Athlete Stats — XP bar */}
        <ProfileStatsBar
          matchCount={data.myMatches?.length || 0}
          avgRating={(data.user as any).avgRating}
          followerCount={(data.user as any)._count?.followers || 0}
          totalPoints={(data.user as any).totalPoints || 0}
        />
        {/* Streak */}
        <ProfileStreakCard
          currentStreak={(data.user as any).currentStreak || 0}
          longestStreak={(data.user as any).longestStreak || 0}
        />
        {/* Sports strip */}
        <ProfileSportsStrip
          sports={(data.user as any).sports ?? []}
          preferredTime={(data.user as any).preferredTime}
          preferredStyle={(data.user as any).preferredStyle}
        />
        {/* Antrenör Hızlı Erişim */}
        {(session?.user as any)?.userType === "TRAINER" && (
          <a
            href="/antrenor/derslerim"
            className="mt-3 flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl p-3 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/40 dark:hover:to-indigo-900/40 transition"
          >
            <span className="text-2xl">📚</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Ders Takibi</p>
              <p className="text-xs text-blue-500 dark:text-blue-400">Öğrenci kayıtlarını ve dersleri yönet</p>
            </div>
            <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          </a>
        )}
      </div>

      {/* Tabs */}
      {(() => {
        const pendingIncoming = data.myListings?.reduce((acc: number, l: ListingWithResponses) => acc + (l.responses?.filter(r => r.status === "PENDING").length ?? 0), 0) ?? 0;
        const myResponsesCount = data.myResponses?.length ?? 0;
        const matchesCount = data.myMatches?.length ?? 0;
        const isMoreActive = activeTab === "calendar" || activeTab === "templates";
        return (
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 mb-4" role="tablist">
            <div className="flex items-center flex-1 min-w-0 overflow-x-auto scrollbar-hide">
              {([
                { key: "posts", label: "📸 Gönderiler", badge: 0 },
                { key: "listings", label: "📋 İlanlarım", badge: pendingIncoming },
                { key: "responses", label: "📩 Başvurularım", badge: myResponsesCount },
                { key: "matches", label: "🤝 Eşleşmeler", badge: matchesCount },
                { key: "challenges", label: "⚔️ Tekliflerim", badge: 0 },
              ] as { key: string; label: string; badge: number }[]).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key as typeof activeTab); setMoreMenuOpen(false); }}
                  role="tab"
                  aria-selected={activeTab === tab.key}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition border-b-2 whitespace-nowrap ${
                    activeTab === tab.key
                      ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                      : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {tab.label}
                  {tab.badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* ··· Daha dropdown — outside scroll container so it's not clipped */}
            <div className="relative shrink-0">
              <button
                onClick={() => setMoreMenuOpen((v) => !v)}
                className={`flex items-center gap-1 px-4 py-3 text-sm font-medium transition border-b-2 whitespace-nowrap ${
                  isMoreActive
                    ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                ··· Daha
              </button>
              {moreMenuOpen && (
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setMoreMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-[91] overflow-hidden py-1">
                    <button
                      onClick={() => { setActiveTab("calendar"); setMoreMenuOpen(false); }}
                      className={`w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm transition ${activeTab === "calendar" ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                    >
                      📅 Takvim
                    </button>
                    <button
                      onClick={() => { setActiveTab("templates"); setMoreMenuOpen(false); }}
                      className={`w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm transition ${activeTab === "templates" ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20" : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"}`}
                    >
                      🔁 Şablonlar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}

      {/* İlanlarım */}
      {activeTab === "listings" && (
        <div className="space-y-4" role="tabpanel">
          {data.myListings?.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <p className="text-lg">Henüz ilan oluşturmadınız</p>
              <Link
                href="/ilan/olustur"
                className="inline-block mt-3 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
              >
                İlan Oluştur
              </Link>
            </div>
          ) : (
            data.myListings?.map((listing: ListingWithResponses) => (
              <div key={listing.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/ilan/${listing.id}`}
                      className="text-lg font-semibold text-gray-800 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                    >
                      {listing.sport?.icon} {listing.sport?.name}
                    </Link>
                    <div className="flex gap-2 mt-1">
                      <Badge variant={listing.type === "RIVAL" ? "orange" : listing.type === "TRAINER" ? "blue" : listing.type === "EQUIPMENT" ? "purple" : "emerald"}>
                        {listing.type === "RIVAL" ? "Rakip" : listing.type === "TRAINER" ? "Eğitmen" : listing.type === "EQUIPMENT" ? "Satılık" : "Partner"}
                      </Badge>
                      <Badge variant={
                        listing.status === "OPEN" ? "blue" :
                        listing.status === "MATCHED" ? "green" : "gray"
                      }>
                        {STATUS_LABELS[listing.status]?.label}
                      </Badge>
                    </div>
                  </div>
                  {listing.status === "OPEN" && (
                    <Button variant="danger" size="sm" onClick={() => setDeleteModal(listing.id)}>
                      🗑️ Sil
                    </Button>
                  )}
                </div>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  📍 {listing.district?.city?.name}, {listing.district?.name} ·{" "}
                  📅 {format(new Date(listing.dateTime), "d MMM yyyy HH:mm", { locale: tr })}
                </div>

                {listing.responses?.length > 0 && (
                  <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Gelen Karşılıklar ({listing.responses.length})
                    </p>
                    {listing.responses.map((resp) => (
                      <div key={resp.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                        <div>
                          <Link href={`/profil/${resp.userId}`} className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-emerald-600 transition">
                            {resp.user?.name}
                          </Link>
                          {resp.message && (
                            <span className="text-sm text-gray-400 ml-2">- {resp.message.slice(0, 50)}</span>
                          )}
                        </div>
                        <Badge variant={
                          resp.status === "PENDING" ? "yellow" :
                          resp.status === "ACCEPTED" ? "green" : "red"
                        }>
                          {STATUS_LABELS[resp.status]?.label}
                        </Badge>
                      </div>
                    ))}
                    {listing.status === "OPEN" && (
                      <Link
                        href={`/ilan/${listing.id}`}
                        className="text-sm text-emerald-600 dark:text-emerald-400 font-medium hover:underline mt-2 inline-block"
                      >
                        Detay & Kabul/Red →
                      </Link>
                    )}
                  </div>
                )}

                {listing.match && (
                  <div className="mt-3 bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                    <p className="text-sm text-green-700 dark:text-green-300">
                      ✅ Eşleşme: <Link href={`/profil/${listing.match.user2.id}`} className="font-semibold hover:underline">{listing.match.user2?.name}</Link>
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Gönderdiğim Karşılıklar */}
      {activeTab === "responses" && (
        <div className="space-y-4" role="tabpanel">
          {data.myResponses?.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <p className="text-lg">Henüz karşılık göndermediniz</p>
            </div>
          ) : (
            data.myResponses?.map((resp: ResponseWithListing) => (
              <div key={resp.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <div className="flex items-start justify-between">
                  <Link href={`/ilan/${resp.listingId}`} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition">
                    <span className="font-semibold text-gray-800 dark:text-gray-100">
                      {resp.listing?.sport?.icon} {resp.listing?.sport?.name}
                    </span>
                    <span className="text-sm text-gray-400 ml-2">
                      (<Link href={`/profil/${resp.listing?.user.id}`} className="hover:underline">{resp.listing?.user?.name}</Link>)
                    </span>
                  </Link>
                  <Badge variant={
                    resp.status === "PENDING" ? "yellow" :
                    resp.status === "ACCEPTED" ? "green" : "red"
                  }>
                    {STATUS_LABELS[resp.status]?.label}
                  </Badge>
                </div>
                {resp.message && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{resp.message}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Eşleşmeler */}
      {activeTab === "matches" && (
        <div className="space-y-4" role="tabpanel">
          {data.myMatches?.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <p className="text-lg">Henüz eşleşmeniz yok</p>
            </div>
          ) : (
            data.myMatches?.map((match: Match) => {
              const partner = match.user1Id === session?.user?.id
                ? match.user2
                : match.user1;
              return (
                <div key={match.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-green-200 dark:border-green-800 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/ilan/${match.listingId}`}
                        className="font-semibold text-gray-800 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                      >
                        {match.listing?.sport?.icon} {match.listing?.sport?.name}
                      </Link>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Partner: <Link href={`/profil/${partner?.id}`} className="font-semibold hover:text-emerald-600 transition">{partner?.name}</Link>
                      </p>
                    </div>
                  </div>
                  {match.listing?.venue && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      🏟️ {match.listing.venue.name}
                    </p>
                  )}
                  {/* Trust Score + OTP Doğrulama */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                    {typeof (match as any).trustScore === "number" && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              (match as any).trustScore >= 70 ? "bg-emerald-500" :
                              (match as any).trustScore >= 40 ? "bg-amber-500" : "bg-red-400"
                            }`}
                            style={{ width: `${Math.min((match as any).trustScore, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-16 text-right">
                          {(match as any).trustScore}% güven
                        </span>
                      </div>
                    )}
                    {((match as any).status === "SCHEDULED" || (match as any).status === "ONGOING") && (() => {
                      const flow = otpFlow[match.id] || { step: "idle", code: "", loading: false };
                      if (flow.step === "idle") return (
                        <button onClick={() => requestOtp(match.id)} disabled={flow.loading}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition flex items-center gap-1">
                          {flow.loading ? "..." : "🔐 OTP Doğrulama Başlat"}
                        </button>
                      );
                      return (
                        <div className="space-y-1.5">
                          {flow.generated && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Kodun: <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">{flow.generated}</span> — Rakibine ver
                            </p>
                          )}
                          <div className="flex gap-2">
                            <input type="text" maxLength={6} placeholder="Rakibin kodunu gir" value={flow.code}
                              onChange={e => setOtpFlow(p => ({ ...p, [match.id]: { ...flow, code: e.target.value } }))}
                              className="flex-1 text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                            />
                            <button onClick={() => verifyOtp(match.id)} disabled={flow.loading || flow.code.length < 6}
                              className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition">
                              {flow.loading ? "..." : "Onayla"}
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                    {!((data as any).ratedMatchIds ?? []).includes(match.id) && (
                      <button
                        onClick={() => {
                          const partner = match.user1Id === session?.user?.id ? match.user2 : match.user1;
                          setRatingModal({ matchId: match.id, partnerName: partner?.name ?? "Partner" });
                          setRatingScore(0);
                          setRatingComment("");
                        }}
                        className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition flex items-center gap-1"
                      >
                        ⭐ Puan Ver
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Takvim */}
      {activeTab === "calendar" && (
        <div className="space-y-6" role="tabpanel">
          {(() => {
            const today = startOfToday();
            const upcoming = (data.myMatches ?? []).filter((m: Match) => {
              const dt = (m.listing as typeof m.listing & { dateTime?: string })?.dateTime;
              return dt && isAfter(new Date(dt), today);
            });
            if (upcoming.length === 0) {
              return (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <p className="text-5xl mb-3">📅</p>
                  <p className="text-lg">Yaklaşan etkinlik yok</p>
                  <p className="text-sm mt-1">Bir ilana katıldığında burada görünecek.</p>
                </div>
              );
            }
            const sorted = [...upcoming].sort((a, b) => {
              const da = (a.listing as typeof a.listing & { dateTime?: string })?.dateTime ?? "";
              const db = (b.listing as typeof b.listing & { dateTime?: string })?.dateTime ?? "";
              return da < db ? -1 : 1;
            });
            // Group by date string
            const groups: Record<string, typeof sorted> = {};
            sorted.forEach((m) => {
              const dt = (m.listing as typeof m.listing & { dateTime?: string })?.dateTime;
              const key = dt ? format(new Date(dt), "yyyy-MM-dd") : "?";
              if (!groups[key]) groups[key] = [];
              groups[key].push(m);
            });
            return Object.entries(groups).map(([dateKey, items]) => (
              <div key={dateKey}>
                <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
                  {dateKey !== "?"
                    ? format(new Date(dateKey), "d MMMM yyyy EEEE", { locale: tr })
                    : "Tarih bilinmiyor"}
                </h3>
                <div className="space-y-2">
                  {items.map((match: Match) => {
                    const partner = match.user1Id === session?.user?.id ? match.user2 : match.user1;
                    const dt = (match.listing as typeof match.listing & { dateTime?: string })?.dateTime;
                    return (
                      <div key={match.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                        <div>
                          <Link href={`/ilan/${match.listingId}`} className="font-semibold text-gray-800 dark:text-gray-100 hover:text-emerald-600 transition">
                            {match.listing?.sport?.icon} {match.listing?.sport?.name}
                          </Link>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            👤 <Link href={`/profil/${partner?.id}`} className="hover:text-emerald-600 transition">{partner?.name}</Link>
                          </p>
                          {match.listing?.venue && (
                            <p className="text-sm text-gray-400 dark:text-gray-500">🏟️ {match.listing.venue.name}</p>
                          )}
                        </div>
                        <div className="text-right text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                          {dt ? format(new Date(dt), "HH:mm") : ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Şablonlar (Tekrarlayan İlanlar) */}
      {activeTab === "templates" && (
        <div className="space-y-4" role="tabpanel">
          {(() => {
            const templates = (data.myListings ?? []).filter(
              (l: ListingWithResponses) => (l as ListingWithResponses & { isRecurring?: boolean }).isRecurring
            );
            if (templates.length === 0) {
              return (
                <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <p className="text-5xl mb-3">🔁</p>
                  <p className="text-lg">Henüz tekrarlayan şablon yok</p>
                  <p className="text-sm mt-1">İlan oluştururken &ldquo;Tekrarlayan Etkinlik&rdquo; seçeneğini işaretle.</p>
                  <Link href="/ilan/olustur" className="inline-block mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
                    + Şablon Oluştur
                  </Link>
                </div>
              );
            }
            const DAY_LABELS: Record<string, string> = {
              MON: "Pzt", TUE: "Sal", WED: "Çar", THU: "Per", FRI: "Cum", SAT: "Cmt", SUN: "Paz",
            };
            return templates.map((listing: ListingWithResponses) => {
              const ext = listing as ListingWithResponses & { isRecurring?: boolean; recurringDays?: string };
              const days = (ext.recurringDays ?? "").split(",").filter(Boolean);
              return (
                <div key={listing.id} className="bg-white dark:bg-gray-800 rounded-xl border border-emerald-200 dark:border-emerald-800 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <Link href={`/ilan/${listing.id}`} className="font-semibold text-gray-800 dark:text-gray-100 hover:text-emerald-600 transition">
                        🔁 {listing.sport?.icon} {listing.sport?.name}
                      </Link>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        📍 {listing.district?.city?.name ?? ""}
                        {listing.venue ? ` · ${listing.venue.name}` : ""}
                      </p>
                    </div>
                    <span className="text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                      Tekrarlayan
                    </span>
                  </div>
                  {days.length > 0 && (
                    <div className="flex gap-1 mt-3 flex-wrap">
                      {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
                        <span
                          key={d}
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            days.includes(d)
                              ? "bg-emerald-500 text-white"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                          }`}
                        >
                          {DAY_LABELS[d]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Tekliflerim */}
      {activeTab === "challenges" && (
        <div className="space-y-4" role="tabpanel">
          {challengesLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <p className="text-4xl mb-2">⚔️</p>
              <p className="text-lg font-medium">Aktif teklif yok</p>
              <p className="text-sm mt-1">Birine teklif gönder veya tekliflerini bekle.</p>
            </div>
          ) : (
            challenges.map((c: any) => (
              <div key={c.id} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 ${c.direction === "received" ? "border-indigo-200 dark:border-indigo-800" : "border-emerald-200 dark:border-emerald-800"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                      {c.direction === "received" ? (
                        c.challenger?.avatarUrl
                          ? <img src={c.challenger.avatarUrl} alt={c.challenger.name} className="w-full h-full object-cover" />
                          : <span className="text-lg font-bold">{c.challenger?.name?.[0]}</span>
                      ) : (
                        c.target?.avatarUrl
                          ? <img src={c.target.avatarUrl} alt={c.target.name} className="w-full h-full object-cover" />
                          : <span className="text-lg font-bold">{c.target?.name?.[0]}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
                        {c.direction === "received" ? (
                          <><span className="text-indigo-600 dark:text-indigo-400">📨 Gelen:</span> {c.challenger?.name}</>
                        ) : (
                          <><span className="text-emerald-600 dark:text-emerald-400">📤 Gönderilen:</span> {c.target?.name}</>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {c.sport?.icon} {c.sport?.name}
                        {c.district ? ` · ${c.district.city?.name}, ${c.district.name}` : ""}
                        {c.proposedDateTime ? ` · ${new Date(c.proposedDateTime).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : ""}
                      </p>
                      {c.message && <p className="text-xs text-gray-400 mt-1 italic">&quot;{c.message}&quot;</p>}
                    </div>
                  </div>
                  {c.direction === "received" && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/challenges/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept" }) });
                          if (res.ok) { setChallenges(prev => prev.filter(ch => ch.id !== c.id)); toast.success("Teklif kabul edildi!"); }
                        }}
                        className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg font-semibold transition"
                      >✓ Kabul</button>
                      <button
                        onClick={async () => {
                          const res = await fetch(`/api/challenges/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject" }) });
                          if (res.ok) { setChallenges(prev => prev.filter(ch => ch.id !== c.id)); toast.success("Teklif reddedildi."); }
                        }}
                        className="text-xs bg-gray-200 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-600 dark:text-gray-400 hover:text-red-600 px-3 py-1.5 rounded-lg font-semibold transition"
                      >✕ Reddet</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Gönderiler */}
      {activeTab === "posts" && (
        <div className="space-y-4" role="tabpanel">
          {/* Yeni Gönderi Oluştur */}
          <CreatePostBox onCreated={(post) => setPosts((prev) => [post, ...prev])} />
          {/* View Toggle */}
          {posts.length > 0 && (
            <div className="flex justify-end gap-1 -mt-2">
              <button
                onClick={() => setPostsView("grid")}
                title="Grid Görünüm"
                className={`p-2 rounded-lg text-lg leading-none transition ${
                  postsView === "grid"
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                    : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >⊞</button>
              <button
                onClick={() => setPostsView("list")}
                title="Liste Görünüm"
                className={`p-2 rounded-lg text-lg leading-none transition ${
                  postsView === "list"
                    ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                    : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >☰</button>
            </div>
          )}
          {postsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">
              <p className="text-4xl mb-2">📸</p>
              <p className="text-lg font-medium">Henüz gönderi yok</p>
              <p className="text-sm mt-1">İlk gönderini oluştur!</p>
            </div>
          ) : postsView === "grid" ? (
            <div className="grid grid-cols-3 gap-0.5 rounded-lg overflow-hidden">
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => setPostsView("list")}
                  className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700 group"
                >
                  {post.images?.[0] ? (
                    <img
                      src={post.images[0]}
                      alt=""
                      className="w-full h-full object-cover group-hover:opacity-80 transition duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-2 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-5 text-center leading-relaxed font-medium">
                        {post.content}
                      </p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition duration-200 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                    <span className="text-white text-xs font-bold drop-shadow">❤️ {post._count?.likes ?? 0}</span>
                    <span className="text-white text-xs font-bold drop-shadow">💬 {post._count?.comments ?? 0}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                sessionUserId={session?.user?.id}
                onLikeToggle={(id, liked, count) => {
                  setPosts((prev) => prev.map((p) => p.id === id ? { ...p, _count: { ...p._count, likes: count }, likedByMe: liked } : p));
                }}
                onDeletePost={(id) => {
                  setPosts((prev) => prev.filter((p) => p.id !== id));
                }}
              />
            ))
          )}
        </div>
      )}

      {/* Delete Modal */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={handleDeleteListing}
        title="İlanı Sil"
        description="Bu ilanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
        confirmText="İlanı Sil"
        variant="danger"
        loading={deleting}
      />

      {/* Rating Modal */}
      {ratingModal && (
        <RatingModal
          matchId={ratingModal.matchId}
          partnerName={ratingModal.partnerName}
          onClose={() => setRatingModal(null)}
          onSuccess={refresh}
        />
      )}

      {/* Follow List Modal */}
      <FollowListModal
        open={followListOpen !== null}
        type={followListOpen ?? "followers"}
        onClose={() => setFollowListOpen(null)}
        onCountChange={refresh}
      />
    </div>
  );
}

