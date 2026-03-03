"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

const SPORT_OPTIONS = [
  "Futbol", "Basketbol", "Tenis", "Voleybol", "Yüzme",
  "Fitness", "Boks", "Badminton", "Padel", "Squash",
  "Masa Tenisi", "Yoga", "Pilates", "Koşu",
];

type SportDetailField = { label: string; key: string } & (
  | { type: "select"; options: string[] }
  | { type: "number"; placeholder?: string }
);

const SPORT_DETAILS_CONFIG: Record<string, SportDetailField[]> = {
  Futbol:    [
    { key: "sahaType",  label: "Saha Tipi",   type: "select",  options: ["Halı", "Çim", "Toprak", "Sentetik"] },
    { key: "sahaCount", label: "Saha Sayısı", type: "number", placeholder: "2" },
  ],
  Tenis:     [
    { key: "kortType",  label: "Kort Tipi",   type: "select",  options: ["Sert", "Toprak", "Çim"] },
    { key: "kortCount", label: "Kort Sayısı", type: "number", placeholder: "4" },
  ],
  Basketbol: [
    { key: "kortType",  label: "Kort Tipi",   type: "select",  options: ["İç Mekan", "Dış Mekan"] },
    { key: "potaCount", label: "Pota Sayısı", type: "number", placeholder: "2" },
  ],
  Voleybol:  [
    { key: "sahaType",  label: "Saha Tipi",   type: "select",  options: ["İç Mekan", "Dış Mekan", "Plaj"] },
    { key: "sahaCount", label: "Saha Sayısı", type: "number", placeholder: "2" },
  ],
  "Yüzme":   [
    { key: "havuzType",  label: "Havuz Tipi",   type: "select",  options: ["Açık", "Kapalı"] },
    { key: "seritCount", label: "Şerit Sayısı", type: "number", placeholder: "8" },
  ],
  Padel:     [{ key: "kortCount", label: "Kort Sayısı", type: "number", placeholder: "4" }],
  Squash:    [{ key: "kortCount", label: "Kort Sayısı", type: "number", placeholder: "2" }],
  Badminton: [{ key: "kortCount", label: "Kort Sayısı", type: "number", placeholder: "4" }],
};

const AMENITY_OPTIONS = [
  "☕ Kafeterya", "♨️ Sauna", "🛍 Soyunma Odası", "🚶 Duş",
  "🅿️ Otopark", "📶 Wi-Fi", "🚿 Tuvalet", "🚴 Bisiklet Parkı",
  "💊 İlk Yardım", "🎯 Ekipman Kiralama",
];

type VenueProfile = {
  id: string;
  businessName: string;
  address: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  capacity: number | null;
  sports: string[];
  images: string[];
  openingHours: string | null;
  logoUrl: string | null;
  isVerified: boolean;
};

type Stats = { approvedMatches: number };

type Listing = {
  id: string;
  type: string;
  status: string;
  dateTime: string;
  sport: { name: string; icon: string | null };
  _count?: { responses: number };
};

const inputClass =
  "w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition text-sm";

export default function IsletmeYonetimiPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<VenueProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "edit" | "gallery" | "listings">("overview");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const [form, setForm] = useState({
    businessName: "",
    address: "",
    description: "",
    phone: "",
    website: "",
    capacity: "",
    openingHours: "",
    sports: [] as string[],
  });
  const [sportDetails, setSportDetails] = useState<Record<string, Record<string, string>>>({});
  const [amenities, setAmenities] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/giris");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/venue-profile").then(r => r.json()),
      fetch("/api/listings?mine=true").then(r => r.json()).catch(() => ({ listings: [] })),
    ]).then(([venueData, listingData]) => {
      if (venueData.profile) {
        setProfile(venueData.profile);
        setStats(venueData.stats);
        const p = venueData.profile;
        setForm({
          businessName: p.businessName || "",
          address: p.address || "",
          description: p.description || "",
          phone: p.phone || "",
          website: p.website || "",
          capacity: p.capacity?.toString() || "",
          openingHours: p.openingHours || "",
          sports: p.sports || [],
        });
        if ((p as any).sportDetails) setSportDetails((p as any).sportDetails);
        if (Array.isArray(p.amenities)) setAmenities(p.amenities);
      }
      if (listingData.listings) setListings(listingData.listings);
    }).catch(() => toast.error("Veriler yüklenemedi"))
      .finally(() => setLoading(false));
  }, [status]);

  const handleSave = async () => {
    if (!form.businessName.trim()) { toast.error("Tesis adı zorunludur"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/venue-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          capacity: form.capacity ? parseInt(form.capacity) : null,
          images: profile?.images ?? [],
          logoUrl: profile?.logoUrl,
          sportDetails,
          amenities,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setProfile(json.profile);
      toast.success("Tesis bilgileri güncellendi");
      setActiveTab("overview");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("type", "venue-logo");
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.url) throw new Error(json.error || "Yükleme başarısız");
      const putRes = await fetch("/api/venue-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, logoUrl: json.url, images: profile?.images ?? [], capacity: form.capacity ? parseInt(form.capacity) : null, amenities, sportDetails }),
      });
      const putJson = await putRes.json();
      if (!putRes.ok) throw new Error(putJson.error);
      setProfile(putJson.profile);
      toast.success("Logo güncellendi");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Logo yüklenemedi");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleGalleryUpload = async (file: File) => {
    setUploadingGallery(true);
    try {
      const fd = new FormData();
      fd.append("type", "venue-gallery");
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.url) throw new Error(json.error || "Yükleme başarısız");
      const newImages = [...(profile?.images ?? []), json.url];
      const putRes = await fetch("/api/venue-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, images: newImages, logoUrl: profile?.logoUrl, capacity: form.capacity ? parseInt(form.capacity) : null, amenities, sportDetails }),
      });
      const putJson = await putRes.json();
      if (!putRes.ok) throw new Error(putJson.error);
      setProfile(putJson.profile);
      toast.success("Fotoğraf eklendi");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Fotoğraf yüklenemedi");
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleRemoveGalleryImage = async (url: string) => {
    try {
      const newImages = (profile?.images ?? []).filter(i => i !== url);
      const res = await fetch("/api/venue-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, images: newImages, logoUrl: profile?.logoUrl, capacity: form.capacity ? parseInt(form.capacity) : null, amenities, sportDetails }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setProfile(json.profile);
      toast.success("Fotoğraf kaldırıldı");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  // Venue profili yoksa — yönlendirme
  if (!profile) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center">
        <span className="text-5xl">🏟️</span>
        <h2 className="mt-4 text-xl font-bold text-gray-800 dark:text-gray-100">İşletme Profili Bulunamadı</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-5">
          İşletme yönetim panelini kullanabilmek için önce bir tesis hesabı oluşturmanız gerekiyor.
        </p>
        <Link
          href="/ayarlar/profesyonel"
          className="inline-block px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition"
        >
          🏟️ Tesis Hesabı Oluştur
        </Link>
      </div>
    );
  }

  const activeListings = listings.filter(l => l.status === "OPEN");
  const completedListings = listings.filter(l => l.status === "MATCHED" || l.status === "CLOSED");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="relative group flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-3xl overflow-hidden border-2 border-emerald-200 dark:border-emerald-700">
              {profile.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : "🏟️"}
            </div>
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition cursor-pointer">
              {uploadingLogo ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-white text-xs font-bold text-center">📷<br/>Logo</span>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingLogo}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }}
              />
            </label>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">{profile.businessName}</h1>
              {profile.isVerified && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  🏟️ Tesis ✓
                </span>
              )}
            </div>
            {profile.address && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                📍 {profile.address}
              </p>
            )}
            {profile.phone && (
              <p className="text-sm text-gray-500 dark:text-gray-400">📞 {profile.phone}</p>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 hover:underline">
                🌐 {profile.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
            <Link
              href={`/mekanlar/${profile.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-sm font-semibold rounded-xl transition text-center"
            >
              🌐 Herkese Açık Profil
            </Link>
            <Link
              href="/ilan/olustur"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition text-center"
            >
              + İlan Oluştur
            </Link>
          </div>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Aktif İlan", value: activeListings.length, emoji: "📋", color: "text-emerald-600" },
          { label: "Tamamlanan", value: completedListings.length, emoji: "✅", color: "text-blue-600" },
          { label: "Onaylanan Maç", value: stats?.approvedMatches ?? 0, emoji: "🤝", color: "text-purple-600" },
          { label: "Galeri Fotoğrafı", value: profile.images?.length ?? 0, emoji: "📸", color: "text-orange-600" },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 text-center">
            <div className="text-2xl mb-1">{s.emoji}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto">
        {[
          { key: "overview", label: "📊 Genel Bakış" },
          { key: "edit",     label: "✏️ Tesis Bilgileri" },
          { key: "gallery",  label: "📸 Galeri" },
          { key: "listings", label: `📋 İlanlar${activeListings.length > 0 ? ` (${activeListings.length})` : ""}` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as typeof activeTab)}
            className={`flex-shrink-0 py-2 px-4 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === t.key
                ? "bg-emerald-500 text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Genel Bakış ───────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Tesis Profili</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Tesis Adı</p>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{profile.businessName}</p>
              </div>
              {profile.address && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Adres</p>
                  <p className="text-gray-700 dark:text-gray-200">{profile.address}</p>
                </div>
              )}
              {profile.phone && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Telefon</p>
                  <p className="text-gray-700 dark:text-gray-200">{profile.phone}</p>
                </div>
              )}
              {profile.capacity && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Kapasite</p>
                  <p className="text-gray-700 dark:text-gray-200">{profile.capacity} kişi</p>
                </div>
              )}
            </div>
            <div className="space-y-3">
              {profile.openingHours && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Çalışma Saatleri</p>
                  <p className="text-gray-700 dark:text-gray-200 whitespace-pre-line">{profile.openingHours}</p>
                </div>
              )}
              {profile.sports?.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">Branşlar</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.sports.map(s => (
                      <span key={s} className="text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {profile.description && (
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Açıklama</p>
                  <p className="text-gray-700 dark:text-gray-200 text-xs leading-relaxed line-clamp-4">{profile.description}</p>
                </div>
              )}
            </div>
          </div>
          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("edit")}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              ✏️ Bilgileri Düzenle
            </button>
          </div>
        </div>
      )}

      {/* ── Tesis Bilgileri Düzenleme ──────────────────────────── */}
      {activeTab === "edit" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Tesis Bilgilerini Düzenle</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Tesis Adı *</label>
              <input className={inputClass} value={form.businessName} onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))} placeholder="Tesis adı" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Telefon</label>
              <input className={inputClass} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="05XX XXX XX XX" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Adres *</label>
            <input className={inputClass} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Tesis adresi" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Açıklama</label>
            <textarea rows={4} className={`${inputClass} resize-none`} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Tesisiniz hakkında kısa bir tanıtım..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Website</label>
              <input className={inputClass} value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} placeholder="https://" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Kapasite (kişi)</label>
              <input type="number" min={1} className={inputClass} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="100" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Çalışma Saatleri</label>
            <textarea rows={3} className={`${inputClass} resize-none`} value={form.openingHours} onChange={e => setForm(f => ({ ...f, openingHours: e.target.value }))} placeholder={"Hft-İçi: 07:00–22:00\nHafta Sonu: 08:00–21:00"} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Branşlar</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SPORT_OPTIONS.map(s => {
                const sel = form.sports.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, sports: sel ? f.sports.filter(x => x !== s) : [...f.sports, s] }))}
                    className={`p-2.5 rounded-xl border-2 text-sm text-left transition ${sel ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 font-medium" : "border-gray-200 dark:border-gray-600 hover:border-emerald-300"}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dynamic sport detail fields */}
          {form.sports.filter(s => SPORT_DETAILS_CONFIG[s]).length > 0 && (
            <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-700">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Branş Detayları</label>
              {form.sports.filter(s => SPORT_DETAILS_CONFIG[s]).map(sport => (
                <div key={sport} className="bg-gray-50 dark:bg-gray-700/40 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{sport}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SPORT_DETAILS_CONFIG[sport].map(field => (
                      <div key={field.key}>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{field.label}</label>
                        {field.type === "select" ? (
                          <select
                            value={sportDetails[sport]?.[field.key] ?? ""}
                            onChange={e => setSportDetails(prev => ({
                              ...prev,
                              [sport]: { ...(prev[sport] ?? {}), [field.key]: e.target.value },
                            }))}
                            className={inputClass}
                          >
                            <option value="">Seçiniz</option>
                            {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <input
                            type="number"
                            min={1}
                            placeholder={field.placeholder ?? ""}
                            value={sportDetails[sport]?.[field.key] ?? ""}
                            onChange={e => setSportDetails(prev => ({
                              ...prev,
                              [sport]: { ...(prev[sport] ?? {}), [field.key]: e.target.value },
                            }))}
                            className={inputClass}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Amenities checkboxes */}
          <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">Tesis Olanakları</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AMENITY_OPTIONS.map(opt => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={amenities.includes(opt)}
                    onChange={e => setAmenities(prev =>
                      e.target.checked ? [...prev, opt] : prev.filter(a => a !== opt)
                    )}
                    className="w-4 h-4 accent-emerald-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{opt}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : "💾 Kaydet"}
            </button>
            <button
              onClick={() => setActiveTab("overview")}
              className="px-6 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-xl transition"
            >
              İptal
            </button>
          </div>
        </div>
      )}

      {/* ── Galeri ────────────────────────────────────────────── */}
      {activeTab === "gallery" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">📸 Tesis Galerisi</h2>
            <label className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl cursor-pointer transition">
              {uploadingGallery ? "⏳ Yükleniyor..." : "+ Fotoğraf Ekle"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingGallery}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleGalleryUpload(f); }}
              />
            </label>
          </div>

          {(!profile.images || profile.images.length === 0) ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📷</div>
              <p className="text-sm">Henüz fotoğraf yok. Tesisinizi tanıtmak için görsel ekleyin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profile.images.map((img, i) => (
                <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Galeri ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveGalleryImage(img)}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                    title="Kaldır"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── İlanlar ───────────────────────────────────────────── */}
      {activeTab === "listings" && (
        <div className="space-y-4">
          {listings.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Henüz ilan oluşturmadınız.</p>
              <Link
                href="/ilan/olustur"
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition"
              >
                + İlk İlanı Oluştur
              </Link>
            </div>
          ) : (
            <>
              {activeListings.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    🟢 Aktif İlanlar
                    <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold">{activeListings.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {activeListings.map(l => (
                      <Link key={l.id} href={`/ilan/${l.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{l.sport.icon || "🏅"}</span>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{l.sport.name}</p>
                            <p className="text-xs text-gray-400">{new Date(l.dateTime).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        </div>
                        <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-lg font-medium">
                          {l._count?.responses ?? 0} Başvuru
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {completedListings.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    ✅ Tamamlanan / Eşleşilen
                    <span className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 text-xs px-2 py-0.5 rounded-full font-bold">{completedListings.length}</span>
                  </h3>
                  <div className="space-y-2">
                    {completedListings.slice(0, 10).map(l => (
                      <Link key={l.id} href={`/ilan/${l.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">{l.sport.icon || "🏅"}</span>
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{l.sport.name}</p>
                            <p className="text-xs text-gray-400">{new Date(l.dateTime).toLocaleDateString("tr-TR")}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${l.status === "MATCHED" ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" : "bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                          {l.status === "MATCHED" ? "Eşleşildi" : "Kapandı"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
