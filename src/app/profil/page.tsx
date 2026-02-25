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
  const [posts, setPosts] = useState<any[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // Profile edit states
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<ProfileEditForm>({
    name: "", phone: "", currentPassword: "", newPassword: "",
    bio: "", cityId: "", districtId: "", gender: "", birthDate: "", sportIds: [],
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
      setData((prev) => prev ? {
        ...prev,
        myListings: prev.myListings.filter((l) => l.id !== deleteModal),
      } : prev);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setDeleting(false);
      setDeleteModal(null);
    }
  };

  const handleEditProfile = () => {
    const profileUser = data.user as typeof data.user & { 
      bio?: string | null; 
      cityId?: string | null; 
      districtId?: string | null;
      gender?: string | null; 
      birthDate?: string | null;
    };
    const sports = (data as typeof data & { sports?: Array<{ id: string }> }).sports ?? [];
    setEditForm({
      name: data.user.name,
      phone: data.user.phone || "",
      currentPassword: "",
      newPassword: "",
      bio: profileUser.bio ?? "",
      cityId: profileUser.cityId ?? "",
      districtId: profileUser.districtId ?? "",
      gender: profileUser.gender ?? "",
      birthDate: profileUser.birthDate ? format(new Date(profileUser.birthDate), "yyyy-MM-dd") : "",
      sportIds: sports.map((s) => s.id),
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Onboarding banner */}
      {data.user && !(data.user as typeof data.user & { onboardingDone?: boolean }).onboardingDone && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-emerald-800 dark:text-emerald-200">👋 Profilini tamamla!</p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Tercihlerini ayarlayarak daha iyi eşleşmeler bul.</p>
          </div>
          <Link href="/onboarding" className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition">
            Hemen Tamamla
          </Link>
        </div>
      )}
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
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{data.user?.name}</h1>
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
              </div>
              <Button variant="secondary" size="sm" onClick={handleEditProfile}>
                Düzenle
              </Button>
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
            <div className="flex gap-2">
              <Button onClick={handleSaveProfile} loading={saving}>Kaydet</Button>
              <Button variant="secondary" onClick={() => setEditMode(false)}>Vazgeç</Button>
            </div>
          </div>
        )}
        <div className="flex gap-4 mt-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center flex-1">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{data.myListings?.length || 0}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">İlanlarım</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center flex-1">
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{pendingResponsesCount}</p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">Bekleyen Karşılık</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center flex-1">
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{data.myMatches?.length || 0}</p>
            <p className="text-xs text-green-600 dark:text-green-400">Eşleşmeler</p>
          </div>
        </div>
        </div>
      </div>

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
                      <Badge variant={listing.type === "RIVAL" ? "orange" : "emerald"}>
                        {listing.type === "RIVAL" ? "Rakip" : "Partner"}
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
