"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, isAfter, startOfToday, differenceInYears } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";
import { useProfile } from "@/hooks/useProfile";
import { useLocations, useSports } from "@/hooks/useLocations";
import { deleteListing, updateProfile } from "@/services/api";
import type { ListingWithResponses, ResponseWithListing, Match, ProfileEditForm } from "@/types";
import { STATUS_LABELS, GENDER_LABELS } from "@/types";

const GENDER_ICONS: Record<string, string> = {
  MALE: "♂️",
  FEMALE: "♀️",
};

import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import ProfileCompletionRing from "@/components/ProfileCompletionRing";

// Eksik alanları tespit eden fonksiyon
function getMissingProfileFields(user: any) {
  const missing: string[] = [];
  if (!user.avatarUrl) missing.push("Profil fotoğrafı");
  if (!user.phone) missing.push("Telefon numarası");
  if (!user.birthDate) missing.push("Doğum tarihi");
  if (user.userType === "VENUE") {
    if (!user.venueName) missing.push("Tesis adı");
    if (!user.venueAddress) missing.push("Tesis adresi");
  }
  if (user.userType === "TRAINER" && (!user.trainerBranches || user.trainerBranches.length === 0)) {
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
  const [activeTab, setActiveTab] = useState<"listings" | "responses" | "matches" | "calendar" | "templates" | "posts">("posts");
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [ratingModal, setRatingModal] = useState<{ matchId: string; partnerName: string } | null>(null);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsView, setPostsView] = useState<"grid" | "list">("grid");
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
      sportIds: sports.map((s) => s.id),
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
    <div className="max-w-4xl mx-auto">
      {/* Profil Tamamlanma Çemberi */}
      <div className="mb-4">
        <ProfileCompletionRing
          user={data.user as any}
          listings={data.myListings}
          matches={data.myMatches}
        />
      </div>
      {/* Profil başlığı */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 overflow-hidden">
        {/* Kapak Fotoğrafı */}
        <div className="relative h-32 bg-gradient-to-r from-emerald-400 to-teal-500 group">
          {(data.user as any)?.coverUrl && (
            <img src={(data.user as any).coverUrl} alt="Kapak" className="w-full h-full object-cover" />
          )}
          <label className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition cursor-pointer">
            <span className="text-white text-sm font-semibold bg-black/40 px-3 py-1.5 rounded-lg">
              {uploadingCover ? "Yükleniyor..." : "📷 Kapak fotoğrafı değiştir"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingCover}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadingCover(true);
                try {
                  const fd = new FormData();
                  fd.append("type", "cover");
                  fd.append("file", file);
                  const res = await fetch("/api/upload", { method: "POST", body: fd });
                  const json = await res.json();
                  if (json.url) { refresh(); toast.success("Kapak fotoğrafı güncellendi"); }
                  else toast.error(json.error || "Yüklenemedi");
                } finally { setUploadingCover(false); }
              }}
            />
          </label>
        </div>

        <div className="p-6">
        {!editMode ? (
          <>
            <div className="flex items-center gap-6">
              {/* Avatar + upload */}
              <div className="relative -mt-14 group">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-3xl overflow-hidden border-4 border-white dark:border-gray-800 shadow">
                  {data.user?.avatarUrl ? (
                    <img src={data.user.avatarUrl} alt={data.user.name} className="w-full h-full object-cover" />
                  ) : (
                    data.user?.name?.charAt(0)?.toUpperCase() || "?"
                  )}
                </div>
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer">
                  <span className="text-white text-xs">📷</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingAvatar}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingAvatar(true);
                      try {
                        const fd = new FormData();
                        fd.append("type", "avatar");
                        fd.append("file", file);
                        const res = await fetch("/api/upload", { method: "POST", body: fd });
                        const json = await res.json();
                        if (json.url) { refresh(); toast.success("Profil fotoğrafı güncellendi"); }
                        else toast.error(json.error || "Yüklenemedi");
                      } finally { setUploadingAvatar(false); }
                    }}
                  />
                </label>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.user?.name}</h1>
                  {(data.user as any).trainerProfile?.isVerified && (
                    <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-700 whitespace-nowrap">
                      ✓ Verified Pro
                    </span>
                  )}
                  {/* Seviye Rozeti */}
                  {(() => {
                    const lvl = (data.user as any).userLevel || "BEGINNER";
                    const cfg: Record<string, { label: string; cls: string }> = {
                      BEGINNER: { label: "Acemi", cls: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-700 dark:text-gray-300" },
                      AMATEUR: { label: "Amatör", cls: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300" },
                      SEMI_PRO: { label: "Yarı Pro", cls: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300" },
                      PRO: { label: "⚡ Pro", cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300" },
                    };
                    const c = cfg[lvl] || cfg.BEGINNER;
                    return <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${c.cls}`}>{c.label}</span>;
                  })()}
                  <div className="flex items-center gap-1.5 text-sm">
                    {(() => {
                      const u = data.user as any;
                      return (
                        <>
                          {u.gender && (
                            <span title={GENDER_LABELS[u.gender as keyof typeof GENDER_LABELS]}>
                              {GENDER_ICONS[u.gender] || "👤"}
                            </span>
                          )}
                          {u.birthDate && (
                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs font-bold text-gray-600 dark:text-gray-400">
                              {differenceInYears(new Date(), new Date(u.birthDate))} Yaş
                            </span>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
                <p className="text-gray-500 dark:text-gray-400">{data.user?.email}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  {data.user?.phone && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">📞 {data.user.phone}</p>
                  )}
                  {(data.user as any).city && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      📍 {(data.user as any).city.name}, {(data.user as any).district?.name || ""}
                    </p>
                  )}
                </div>
                {/* Sosyal İstatistikler */}
                <div className="flex gap-4 mt-2">
                  <div className="text-sm">
                    <span className="font-bold text-gray-800 dark:text-gray-100">{(data.user as any)._count?.followers || 0}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1">Takipçi</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-gray-800 dark:text-gray-100">{(data.user as any)._count?.following || 0}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1">Takip Edilen</span>
                  </div>
                </div>
                {/* Bio */}
                {(data.user as any).bio && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed line-clamp-3">{(data.user as any).bio}</p>
                )}
                {/* Trainer Badges */}
                {(data.user as any).trainerProfile?.isVerified && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(data.user as any).trainerProfile?.specialization && (
                      <span className="inline-flex items-center bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                        🎯 {(data.user as any).trainerProfile.specialization}
                      </span>
                    )}
                    {(data.user as any).trainerProfile?.experience && (
                      <span className="inline-flex items-center bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded-full">
                        🏆 {(data.user as any).trainerProfile.experience} Yıl Deneyim
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {/* Sosyal Medya İkonları */}
                {((data.user as any).instagram || (data.user as any).tiktok || (data.user as any).facebook || (data.user as any).twitterX || (data.user as any).vk) && (
                  <div className="flex items-center gap-1.5">
                    {(data.user as any).instagram && (
                      <a href={`https://instagram.com/${(data.user as any).instagram}`} target="_blank" rel="noopener noreferrer" title="Instagram"
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white hover:opacity-80 transition-opacity">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                      </a>
                    )}
                    {(data.user as any).tiktok && (
                      <a href={`https://tiktok.com/@${(data.user as any).tiktok}`} target="_blank" rel="noopener noreferrer" title="TikTok"
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-black text-white hover:opacity-80 transition-opacity">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.79a8.18 8.18 0 004.78 1.52V6.85a4.85 4.85 0 01-1.01-.16z"/></svg>
                      </a>
                    )}
                    {(data.user as any).facebook && (
                      <a href={`https://facebook.com/${(data.user as any).facebook}`} target="_blank" rel="noopener noreferrer" title="Facebook"
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white hover:opacity-80 transition-opacity">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      </a>
                    )}
                    {(data.user as any).twitterX && (
                      <a href={`https://x.com/${(data.user as any).twitterX}`} target="_blank" rel="noopener noreferrer" title="X (Twitter)"
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-black text-white hover:opacity-80 transition-opacity">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                      </a>
                    )}
                    {(data.user as any).vk && (
                      <a href={`https://vk.com/${(data.user as any).vk}`} target="_blank" rel="noopener noreferrer" title="VK"
                        className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-500 text-white hover:opacity-80 transition-opacity">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2zm3.08 13.5h-1.64c-.63 0-.82-.52-1.93-1.63-.96-.96-1.39-.96-1.39 0 0 1.63-.43 1.63-1.08 1.63-1.67 0-3.52-1.04-4.82-2.84-1.96-2.73-2.5-4.72-2.5-5.12 0-.18.15-.35.35-.35h1.64c.26 0 .35.15.44.38.51 1.57 1.39 2.95 1.74 2.95.14 0 .2-.06.2-.38V9.35c-.04-.62-.35-.67-.35-.89 0-.15.12-.3.3-.3h2.57c.22 0 .3.12.3.35v2.74c0 .22.09.3.16.3.14 0 .27-.08.55-.38.87-.99 1.5-2.51 1.5-2.51.09-.2.25-.38.5-.38h1.64c.49 0 .6.25.49.56-.21.64-2.08 2.66-2.08 2.66-.16.24-.22.35 0 .61.16.2.69.74 1.05 1.17.65.73 1.14 1.35 1.27 1.78.14.42-.08.64-.49.64z"/></svg>
                      </a>
                    )}
                  </div>
                )}
                <Button variant="secondary" size="sm" onClick={handleEditProfile}>
                  Düzenle
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Profili Düzenle</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ad Soyad</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hakkımda</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                maxLength={300}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                placeholder="Kendinizden bahsedin..."
              />
              <p className="text-xs text-gray-400 mt-1">{editForm.bio?.length ?? 0}/300</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Konum</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={locations.find(l => l.cities?.some(c => c.id === editForm.cityId))?.id || ""}
                  onChange={(e) => {
                    const country = locations.find(l => l.id === e.target.value);
                    if (country?.cities?.[0]) {
                      setEditForm({ ...editForm, cityId: country.cities[0].id, districtId: "" });
                    }
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Ülke Seçin...</option>
                  {locations.sort((a,b) => a.code === "TR" ? -1 : b.code === "TR" ? 1 : a.name.localeCompare(b.name)).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={editForm.cityId}
                  onChange={(e) => setEditForm({ ...editForm, cityId: e.target.value, districtId: "" })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Şehir Seçin...</option>
                  {locations.flatMap(l => l.cities || []).filter(c => {
                    const country = locations.find(loc => loc.cities?.some(city => city.id === c.id));
                    const selectedCountry = locations.find(loc => loc.cities?.some(city => city.id === editForm.cityId));
                    return !selectedCountry || (country?.id === selectedCountry.id);
                  }).sort((a,b) => a.name.localeCompare(b.name)).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <select
                  value={editForm.districtId}
                  onChange={(e) => setEditForm({ ...editForm, districtId: e.target.value })}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  disabled={!editForm.cityId}
                >
                  <option value="">İlçe Seçin...</option>
                  {locations.flatMap(l => l.cities || []).find(c => c.id === editForm.cityId)?.districts?.sort((a,b) => a.name.localeCompare(b.name)).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cinsiyet</label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">Belirtilmemiş</option>
                  <option value="MALE">Erkek</option>
                  <option value="FEMALE">Kadın</option>
                  <option value="PREFER_NOT_TO_SAY">Belirtmek İstemiyorum</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Doğum Tarihi</label>
                <input
                  type="date"
                  value={editForm.birthDate}
                  onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sporlarım (max 5)</label>
              <div className="flex flex-wrap gap-2">
                {sports.map((s) => {
                  const selected = editForm.sportIds?.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        const cur = editForm.sportIds ?? [];
                        if (selected) {
                          setEditForm({ ...editForm, sportIds: cur.filter((id) => id !== s.id) });
                        } else if (cur.length < 5) {
                          setEditForm({ ...editForm, sportIds: [...cur, s.id] });
                        } else {
                          toast.error("En fazla 5 spor seçebilirsiniz");
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${
                        selected
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-emerald-400"
                      }`}
                    >
                      {s.icon} {s.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefon</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="05551234567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mevcut Şifre (değiştirmek için)</label>
              <input
                type="password"
                value={editForm.currentPassword}
                onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yeni Şifre</label>
              <input
                type="password"
                value={editForm.newPassword}
                onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                placeholder="Min 8 karakter, büyük/küçük harf, rakam, özel karakter"
              />
            </div>
            {/* Sosyal Medya */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sosyal Medya Hesapları</label>
              <div className="grid grid-cols-1 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white text-xs">IG</span>
                  <input type="text" value={editForm.instagram ?? ""} onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    placeholder="Instagram kullanıcı adı" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-black text-white text-xs">TT</span>
                  <input type="text" value={editForm.tiktok ?? ""} onChange={(e) => setEditForm({ ...editForm, tiktok: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    placeholder="TikTok kullanıcı adı" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-600 text-white text-xs">FB</span>
                  <input type="text" value={editForm.facebook ?? ""} onChange={(e) => setEditForm({ ...editForm, facebook: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    placeholder="Facebook profil adı veya URL" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-black text-white text-xs font-bold">X</span>
                  <input type="text" value={editForm.twitterX ?? ""} onChange={(e) => setEditForm({ ...editForm, twitterX: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    placeholder="X (Twitter) kullanıcı adı" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-blue-500 text-white text-xs">VK</span>
                  <input type="text" value={editForm.vk ?? ""} onChange={(e) => setEditForm({ ...editForm, vk: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    placeholder="VK kullanıcı adı veya URL" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveProfile} loading={saving}>Kaydet</Button>
              <Button variant="secondary" onClick={() => setEditMode(false)}>Vazgeç</Button>
            </div>
          </div>
        )}
        {/* Athlete Stats */}
        <div className="flex gap-3 mt-4">
          <div className="flex-1 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-800">
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{data.myMatches?.length || 0}</p>
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">Maç</p>
          </div>
          <div className="flex-1 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-3 text-center border border-amber-100 dark:border-amber-800">
            <p className="text-2xl font-black text-amber-700 dark:text-amber-300">
              {(data.user as any).avgRating ? `${(data.user as any).avgRating} ⭐` : "—"}
            </p>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mt-0.5">Puan</p>
          </div>
          <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-800">
            <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{(data.user as any)._count?.followers || 0}</p>
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5">Takipçi</p>
          </div>
          <div className="flex-1 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl p-3 text-center border border-violet-100 dark:border-violet-800">
            {(() => {
              const xp = (data.user as any).totalPoints || 0;
              const tiers = [
                { icon: "🔒", label: "Başlangıç", min: 0, max: 50 },
                { icon: "🥉", label: "Bronz", min: 50, max: 100 },
                { icon: "🥈", label: "Gümüş", min: 100, max: 200 },
                { icon: "🥇", label: "Altın", min: 200, max: 400 },
                { icon: "💎", label: "Diamond", min: 400, max: null },
              ];
              const tier = tiers.slice().reverse().find(t => xp >= t.min) || tiers[0];
              const pct = tier.max !== null ? Math.min(100, Math.round(((xp - tier.min) / (tier.max - tier.min)) * 100)) : 100;
              return (
                <>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-lg">{tier.icon}</span>
                    <p className="text-xl font-black text-violet-700 dark:text-violet-300">{xp}</p>
                  </div>
                  <p className="text-xs font-medium text-violet-600 dark:text-violet-400 mt-0.5">XP · {tier.label}</p>
                  <div className="mt-1 h-1.5 bg-violet-200 dark:bg-violet-900 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  {tier.max !== null && (
                    <p className="text-[10px] text-violet-500 dark:text-violet-400 mt-0.5">{tier.max - xp} XP kaldı</p>
                  )}
                </>
              );
            })()}
          </div>
        </div>
        {/* Streak Kartı */}
        {(() => {
          const streak = (data.user as any).currentStreak || 0;
          const longest = (data.user as any).longestStreak || 0;
          const streakEmoji = streak >= 7 ? "🔥" : streak >= 3 ? "⚡" : "✨";
          const weekProgress = streak % 7;
          const filledDots = streak > 0 && weekProgress === 0 ? 7 : weekProgress;
          const nextMilestone = streak < 3 ? 3 : streak < 7 ? 7 : streak < 14 ? 14 : streak < 30 ? 30 : null;
          const toNext = nextMilestone !== null ? nextMilestone - streak : 0;
          return (
            <div className="mt-3 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-2xl select-none ${streak >= 7 ? "animate-bounce" : ""}`}>{streakEmoji}</span>
                  <div>
                    <p className="text-sm font-bold text-orange-800 dark:text-orange-200">{streak} Günlük Seri</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">Rekor: {longest} gün</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1,2,3,4,5,6,7].map(d => (
                    <div key={d} className={`w-5 h-5 rounded-full border-2 transition-colors duration-300 ${d <= filledDots ? "bg-orange-500 border-orange-600 shadow-sm shadow-orange-300 dark:shadow-orange-800" : "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600"}`} />
                  ))}
                </div>
              </div>
              {nextMilestone !== null && (
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-orange-600 dark:text-orange-400 mb-1">
                    <span>{streak} / {nextMilestone} gün</span>
                    <span>🎯 {toNext} gün kaldı</span>
                  </div>
                  <div className="h-1.5 bg-orange-200 dark:bg-orange-900/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, (streak / nextMilestone) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {nextMilestone === null && (
                <p className="mt-1.5 text-xs font-semibold text-orange-700 dark:text-orange-300 text-center">🌋 Efsane Seri! {streak} gün kesintisiz!</p>
              )}
            </div>
          );
        })()}
        </div>
      </div>

      {/* Sporlar + Hedefler / Tercihler Şeridi */}
      {(() => {
        const u = data.user as any;
        const userSports = (data.user as any).sports ?? [];
        const timeLabels: Record<string, string> = { morning: "🌅 Sabah", evening: "🌙 Akşam", anytime: "⏰ Her Zaman" };
        const styleLabels: Record<string, string> = { competitive: "🏆 Rekabetçi", casual: "😊 Eğlenceli", both: "⚡ Her İkisi" };
        const hasPrefs = u.preferredTime || u.preferredStyle || userSports.length > 0;
        if (!hasPrefs) return null;
        return (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 px-5 py-4 mb-4 shadow-sm">
            <div className="flex flex-wrap gap-2 items-center">
              {userSports.map((s: any) => (
                <span key={s.id} className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-100 dark:border-emerald-800">
                  {s.icon} {s.name}
                </span>
              ))}
              {u.preferredTime && (
                <span className="inline-flex items-center gap-1 bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-sky-100 dark:border-sky-800">
                  {timeLabels[u.preferredTime] ?? u.preferredTime}
                </span>
              )}
              {u.preferredStyle && (
                <span className="inline-flex items-center gap-1 bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-violet-100 dark:border-violet-800">
                  {styleLabels[u.preferredStyle] ?? u.preferredStyle}
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-gray-200 dark:border-gray-700 mb-4" role="tablist">
        {[
          { key: "posts", label: "📸 Gönderiler" },
          { key: "listings", label: "İlanlarım" },
          { key: "responses", label: "Gönderdiğim Karşılıklar" },
          { key: "matches", label: "Eşleşmeler" },
          { key: "calendar", label: "📅 Takvim" },
          { key: "templates", label: "🔁 Şablonlar" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`px-4 py-3 text-sm font-medium transition border-b-2 ${
              activeTab === tab.key
                ? "border-emerald-600 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

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
                      {listing.match.user2?.phone && (
                        <span> · 📞 {listing.match.user2.phone}</span>
                      )}
                      {listing.match.user2?.email && (
                        <span> · ✉️ {listing.match.user2.email}</span>
                      )}
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
                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                      {partner?.phone && <p>📞 {partner.phone}</p>}
                      <p>✉️ {partner?.email}</p>
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
              <PostCard key={post.id} post={post} onLikeToggle={(id, liked, count) => {
                setPosts((prev) => prev.map((p) => p.id === id ? { ...p, _count: { ...p._count, likes: count }, likedByMe: liked } : p));
              }} />
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">Maçı Değerlendir</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{ratingModal.partnerName}</span> ile oynadığın maça puan ver
            </p>
            {/* Star Picker */}
            <div className="flex justify-center gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingScore(star)}
                  className={`text-4xl transition-transform hover:scale-110 ${
                    star <= ratingScore ? "text-amber-400" : "text-gray-200 dark:text-gray-600"
                  }`}
                  aria-label={`${star} yıldız`}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Yorum ekle (isteğe bağlı)..."
              rows={3}
              maxLength={300}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-4"
            />
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  if (!ratingScore) { toast.error("Lütfen puan seç"); return; }
                  setSubmittingRating(true);
                  try {
                    const res = await fetch("/api/ratings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ matchId: ratingModal.matchId, score: ratingScore, comment: ratingComment || undefined }),
                    });
                    const json = await res.json();
                    if (json.success || res.ok) {
                      toast.success("Değerlendirme kaydedildi!");
                      setRatingModal(null);
                      setRatingScore(0);
                      setRatingComment("");
                    } else {
                      toast.error(json.error || "Kaydedilemedi");
                    }
                  } catch { toast.error("Bağlantı hatası"); }
                  finally { setSubmittingRating(false); }
                }}
                loading={submittingRating}
                disabled={!ratingScore}
              >Gönder</Button>
              <Button variant="secondary" onClick={() => { setRatingModal(null); setRatingScore(0); setRatingComment(""); }}>Vazgeç</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CreatePostBox ── */
function CreatePostBox({ onCreated }: { onCreated: (post: any) => void }) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    setImages(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return;
    setSubmitting(true);
    try {
      // Upload images first
      const uploadedUrls: string[] = [];
      for (const file of images) {
        const fd = new FormData();
        fd.append("type", "post");
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (json.url) uploadedUrls.push(json.url);
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), images: uploadedUrls }),
      });
      const json = await res.json();
      if (json.post) {
        onCreated(json.post);
        setContent("");
        setImages([]);
        setPreviews([]);
        toast.success("Gönderi paylaşıldı!");
      } else {
        toast.error(json.error || "Gönderi oluşturulamadı");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Ne düşünüyorsun? Paylaş..."
        rows={3}
        className="w-full resize-none bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none text-sm"
      />
      {previews.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {previews.map((src, i) => (
            <img key={i} src={src} alt="" className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
        <label className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition">
          <span>🖼️ Fotoğraf Ekle</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
        </label>
        <Button size="sm" onClick={handleSubmit} loading={submitting} disabled={!content.trim() && images.length === 0}>
          Paylaş
        </Button>
      </div>
    </div>
  );
}

/* ── PostCard ── */
function PostCard({ post, onLikeToggle }: { post: any; onLikeToggle: (id: string, liked: boolean, count: number) => void }) {
  const [toggling, setToggling] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<any[]>(post.comments ?? []);
  const [commentCount, setCommentCount] = useState(post._count?.comments ?? 0);
  const [addingComment, setAddingComment] = useState(false);

  const handleLike = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      const json = await res.json();
      onLikeToggle(post.id, json.liked, json.likeCount);
    } finally {
      setToggling(false);
    }
  };

  const loadComments = async () => {
    const res = await fetch(`/api/posts/${post.id}/comments`);
    const json = await res.json();
    if (Array.isArray(json.comments)) setComments(json.comments);
  };

  const handleToggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) loadComments();
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setAddingComment(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const json = await res.json();
      if (json.comment) {
        setComments((prev) => [...prev, json.comment]);
        setCommentCount((n: number) => n + 1);
        setCommentText("");
      }
    } finally {
      setAddingComment(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden flex items-center justify-center text-lg">
          {post.user?.avatarUrl ? (
            <img src={post.user.avatarUrl} alt={post.user.name} className="w-full h-full object-cover" />
          ) : (
            post.user?.name?.charAt(0)?.toUpperCase() || "?"
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{post.user?.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {format(new Date(post.createdAt), "d MMM yyyy, HH:mm", { locale: tr })}
          </p>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="text-gray-800 dark:text-gray-100 text-sm whitespace-pre-wrap mb-3">{post.content}</p>
      )}

      {/* Images */}
      {post.images?.length > 0 && (
        <div className={`grid gap-1.5 mb-3 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {post.images.slice(0, 4).map((url: string, i: number) => (
            <img key={i} src={url} alt="" className="w-full h-48 object-cover rounded-lg" />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={handleLike}
          disabled={toggling}
          className={`flex items-center gap-1.5 text-sm transition ${
            post.likedByMe ? "text-red-500 font-semibold" : "text-gray-500 dark:text-gray-400 hover:text-red-500"
          }`}
        >
          {post.likedByMe ? "❤️" : "🤍"} {post._count?.likes ?? 0}
        </button>
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
        >
          💬 {commentCount}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 space-y-2">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 text-sm">
              <span className="font-semibold text-gray-700 dark:text-gray-300 shrink-0">{c.user?.name}:</span>
              <span className="text-gray-600 dark:text-gray-400">{c.content}</span>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
              placeholder="Yorum yaz..."
              className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Button size="sm" onClick={handleAddComment} loading={addingComment} disabled={!commentText.trim()}>
              Gönder
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
