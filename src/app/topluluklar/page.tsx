"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import CommunityCard, { CommunityCardData, CommunityType } from "@/components/CommunityCard";

type DiscoveryType = CommunityType | "VENUE" | "";
type CreateType = CommunityType | "VENUE";

const TYPES: { value: DiscoveryType; label: string }[] = [
  { value: "", label: "🌐 Tümü" },
  { value: "GROUP", label: "👥 Gruplar" },
  { value: "CLUB", label: "🏛️ Kulüpler" },
  { value: "TEAM", label: "⚽ Takımlar" },
  { value: "VENUE", label: "🏟️ İşletmeler" },
];

interface Sport { id: string; name: string; icon?: string | null }
interface City  { id: string; name: string }

interface VenueCommunityCardData {
  id: string;
  businessName: string;
  address: string | null;
  description: string | null;
  sports: string[];
  images: string[];
  openingHours: string | null;
  capacity: number | null;
  isVerified: boolean;
  user: { id: string; name: string | null; avatarUrl: string | null };
  _count: { facilities: number };
}

interface CommunityWithStatus extends CommunityCardData {
  myStatus?: "APPROVED" | "PENDING" | null;
}

const isDiscoveryType = (value: string | null): value is Exclude<DiscoveryType, ""> => {
  return value === "GROUP" || value === "CLUB" || value === "TEAM" || value === "VENUE";
};

export default function ToplulukPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTypeParam = searchParams?.get("type") ?? "";

  const [communities, setCommunities] = useState<CommunityWithStatus[]>([]);
  const [venues, setVenues] = useState<VenueCommunityCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [venuesLoading, setVenuesLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<DiscoveryType>(isDiscoveryType(initialTypeParam) ? initialTypeParam : "");
  const [search, setSearch] = useState("");
  const [sportId, setSportId] = useState("");
  const [cityId, setCityId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [venueTotal, setVenueTotal] = useState(0);
  const [joining, setJoining] = useState<string | null>(null);

  const [sports, setSports] = useState<Sport[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    type: "GROUP" as CreateType,
    name: "",
    description: "",
    isPrivate: false,
    sportId: "",
    cityId: "",
    website: "",
  });
  const [creating, setCreating] = useState(false);

  // Fetch sports + cities once
  useEffect(() => {
    fetch("/api/sports").then(r => r.json()).then(d => setSports(d.sports ?? d.data ?? [])).catch(() => {});
    fetch("/api/locations").then(r => r.json()).then(d => {
      // Sadece Türkiye şehirlerini göster (TR kodu)
      const trCities = (d.data ?? []).find((c: any) => c.code === "TR")?.cities ?? [];
      setCities(trCities);
    }).catch(() => {});
  }, []);

  const fetchCommunities = useCallback(async () => {
    if (typeFilter === "VENUE") {
      setCommunities([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      if (search)     params.set("search", search);
      if (sportId)    params.set("sportId", sportId);
      if (cityId)     params.set("cityId", cityId);
      params.set("page", String(page));
      params.set("limit", "12");

      const res = await fetch(`/api/communities?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCommunities(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch {
      toast.error("Topluluklar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search, sportId, cityId, page]);

  const selectedSportName = sports.find((s) => s.id === sportId)?.name ?? "";

  const fetchVenues = useCallback(async () => {
    if (typeFilter !== "" && typeFilter !== "VENUE") {
      setVenues([]);
      setVenueTotal(0);
      setVenuesLoading(false);
      return;
    }

    setVenuesLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedSportName) params.set("sport", selectedSportName);
      params.set("page", String(page));
      params.set("limit", "12");

      const res = await fetch(`/api/mekanlar?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setVenues(json.data ?? []);
      setVenueTotal(json.total ?? 0);
    } catch {
      toast.error("İşletme toplulukları yüklenemedi");
    } finally {
      setVenuesLoading(false);
    }
  }, [typeFilter, search, selectedSportName, page]);

  useEffect(() => { fetchCommunities(); }, [fetchCommunities]);
  useEffect(() => { fetchVenues(); }, [fetchVenues]);

  const handleJoin = async (id: string) => {
    if (!session) { router.push("/auth/giris"); return; }
    setJoining(id);
    try {
      const res = await fetch(`/api/communities/${id}/members`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const status = json.data?.status === "PENDING" ? "PENDING" : "APPROVED";
      toast.success(status === "PENDING" ? "Katılma talebiniz gönderildi" : "Topluluğa katıldınız!");
      setCommunities(prev =>
        prev.map(c => c.id === id ? { ...c, myStatus: status as "PENDING" | "APPROVED" } : c)
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setJoining(null);
    }
  };

  const handleLeave = async (id: string) => {
    if (!session) return;
    setJoining(id);
    try {
      const res = await fetch(`/api/communities/${id}/members`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Topluluktan ayrıldınız");
      setCommunities(prev => prev.map(c => c.id === id ? { ...c, myStatus: null } : c));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setJoining(null);
    }
  };

  const handleCreate = async () => {
    if (form.type === "VENUE") {
      setShowCreate(false);
      toast.success("İşletme topluluk sayfası için işletme profili akışına yönlendiriliyorsunuz");
      router.push("/mekan-profil");
      return;
    }

    if (!form.name.trim()) { toast.error("İsim zorunlu"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          name: form.name.trim(),
          description: form.description || undefined,
          isPrivate: form.isPrivate,
          sportId: form.sportId || undefined,
          cityId:  form.cityId  || undefined,
          website: form.website || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Topluluk oluşturuldu!");
      setShowCreate(false);
      setForm({ type: "GROUP", name: "", description: "", isPrivate: false, sportId: "", cityId: "", website: "" });

      const createdId = json.community?.id ?? json.data?.id;
      if (createdId) {
        router.push(`/topluluklar/${createdId}?tab=manage`);
        return;
      }

      fetchCommunities();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setCreating(false);
    }
  };

  const LIMIT = 12;
  const filteredVenues = typeFilter !== "VENUE" || !cityId
    ? venues
    : venues.filter((venue) => {
        const city = cities.find((c) => c.id === cityId);
        if (!city) return true;
        return (venue.address ?? "").toLowerCase().includes(city.name.toLowerCase());
      });
  const showCommunitySection = typeFilter !== "VENUE";
  const showVenueSection = typeFilter === "" || typeFilter === "VENUE";
  const isLoadingList = (showCommunitySection && loading) || (showVenueSection && venuesLoading);
  const hasCommunityResults = showCommunitySection && communities.length > 0;
  const hasVenueResults = showVenueSection && filteredVenues.length > 0;
  const hasAnyResults = hasCommunityResults || hasVenueResults;
  const paginationTotal = typeFilter === "VENUE" ? venueTotal : total;
  const totalPages = Math.ceil(paginationTotal / LIMIT);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Topluluklar</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Gruplar, kulüpler, takımlar ve işletme topluluklarını keşfet
            </p>
          </div>
          {session ? (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Topluluk Oluştur
            </button>
          ) : (
            <a
              href="/auth/giris"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-600/20"
            >
              Giriş Yap &amp; Oluştur
            </a>
          )}
        </div>

        {/* Type tabs */}
        <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl w-fit overflow-x-auto">
          {TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => { setTypeFilter(t.value as CommunityType | ""); setPage(1); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                typeFilter === t.value
                  ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Topluluk ara..."
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={sportId}
            onChange={e => { setSportId(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Tüm sporlar</option>
            {sports.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
          <select
            value={cityId}
            onChange={e => { setCityId(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Tüm şehirler</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Grid */}
        {isLoadingList ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : !hasAnyResults ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <div className="text-5xl mb-3">🏟️</div>
            <p className="font-medium">Topluluk bulunamadı</p>
            <p className="text-sm mt-1">İlk topluluğu sen oluştur veya işletme topluluğu akışına geç</p>
          </div>
        ) : (
          <div className="space-y-6">
            {hasCommunityResults && (
              <section>
                {typeFilter === "" && (
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">Topluluk Sayfaları</h2>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{communities.length} sonuç</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {communities.map(c => (
                    <CommunityCard
                      key={c.id}
                      community={c}
                      onJoin={session ? handleJoin : handleJoin}
                      onLeave={session ? handleLeave : undefined}
                      joining={joining === c.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {hasVenueResults && (
              <section>
                {typeFilter === "" && (
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-semibold text-gray-900 dark:text-white">İşletme Topluluk Sayfaları</h2>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{filteredVenues.length} sonuç</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVenues.map((venue) => (
                    <VenueCommunityCard
                      key={venue.id}
                      venue={venue}
                      isOwner={session?.user?.id === venue.user.id}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (typeFilter === "VENUE" || typeFilter === "" || typeFilter === "GROUP" || typeFilter === "CLUB" || typeFilter === "TEAM") && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              ← Önceki
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Sonraki →
            </button>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {/* Topluluk Oluştur Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            {/* Modal header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {form.type === "CLUB" ? "🏛️" : form.type === "TEAM" ? "⚽" : form.type === "VENUE" ? "🏟️" : "👥"}
                </span>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">Yeni Topluluk Oluştur</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
                    {form.type === "CLUB" ? "Resmi spor kulübü" : form.type === "TEAM" ? "Maç odaklı küçük takım" : form.type === "VENUE" ? "İşletme topluluk sayfası" : "Herkese açık spor grubu"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-lg"
                aria-label="Kapat"
              >✕</button>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* Tür seçici */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Topluluk Türü</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    { value: "GROUP", icon: "👥", label: "Grup",  badge: "Açık",   badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
                    { value: "CLUB",  icon: "🏛️", label: "Kulüp", badge: "Onaylı", badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
                    { value: "TEAM",  icon: "⚽", label: "Takım", badge: "Maç",    badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
                    { value: "VENUE", icon: "🏟️", label: "İşletme", badge: "Panel", badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" },
                  ] as const).map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t.value as CreateType, isPrivate: t.value === "CLUB" ? true : t.value === "VENUE" ? false : f.isPrivate }))}
                      className={`relative flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 text-center transition-all ${
                        form.type === t.value
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                      }`}
                    >
                      {form.type === t.value && (
                        <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </span>
                      )}
                      <span className="text-2xl">{t.icon}</span>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t.label}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${t.badgeColor}`}>{t.badge}</span>
                    </button>
                  ))}
                </div>
                {/* Tür açıklaması */}
                <div className="mt-2 flex items-start gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl px-3 py-2.5">
                  <span className="text-base mt-0.5">
                    {form.type === "GROUP" ? "ℹ️" : form.type === "CLUB" ? "ℹ️" : "ℹ️"}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {form.type === "GROUP" && "Herkesin serbestçe katılabileceği açık bir spor grubu. Etkinlik ilanlarıyla bağlantılı çalışır."}
                    {form.type === "CLUB" && "Resmi spor kulübü. Üyelik yönetim onayı gerektirir. Web sitesi ve kurumsal bilgi eklenebilir."}
                    {form.type === "TEAM" && "Küçük ve maç odaklı takım. Belirli bir spor dalı için düzenli birlikte oynamak isteyen kişiler içindir."}
                    {form.type === "VENUE" && "İşletme topluluk sayfası için tesis profiline geçilir. Kurucu yönetim paneli /ayarlar/isletme üzerinden çalışır."}
                  </p>
                </div>
              </div>

              {form.type !== "VENUE" && (
                <>
                  {/* İsim */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      {form.type === "CLUB" ? "Kulüp Adı" : form.type === "TEAM" ? "Takım Adı" : "Grup Adı"}
                      <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      maxLength={80}
                      autoFocus
                      placeholder={form.type === "CLUB" ? "Örn: Kadıköy Tenis Kulübü" : form.type === "TEAM" ? "Örn: Pazar Sabahı FC" : "Örn: İstanbul Koşucuları"}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    />
                    <p className="text-[11px] text-gray-400 mt-1 text-right">{form.name.length}/80</p>
                  </div>

                  {/* Açıklama */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      Açıklama <span className="font-normal text-gray-400">(opsiyonel)</span>
                    </label>
                    <textarea
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      rows={3}
                      maxLength={500}
                      placeholder={
                        form.type === "CLUB" ? "Kulübün misyonu, düzenlediği etkinlikler..."
                        : form.type === "TEAM" ? "Takımın oyun tarzı, antrenman saatleri..."
                        : "Grup hakkında kısa bir açıklama..."
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none transition"
                    />
                    <p className="text-[11px] text-gray-400 mt-1 text-right">{form.description.length}/500</p>
                  </div>

                  {/* Spor + Şehir */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">🏅 Spor</label>
                      <select
                        value={form.sportId}
                        onChange={e => setForm(f => ({ ...f, sportId: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      >
                        <option value="">— Seçin —</option>
                        {sports.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">📍 Şehir</label>
                      <select
                        value={form.cityId}
                        onChange={e => setForm(f => ({ ...f, cityId: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      >
                        <option value="">— Seçin —</option>
                        {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Kulüp'e özel: Website */}
                  {form.type === "CLUB" && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        🌐 Web Sitesi <span className="font-normal text-gray-400">(opsiyonel)</span>
                      </label>
                      <input
                        value={form.website}
                        onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                        type="url"
                        placeholder="https://kulubunuz.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      />
                    </div>
                  )}

                  {/* Gizlilik toggle — Grup ve Kulüp için */}
                  {form.type !== "TEAM" && (
                    <div
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 cursor-pointer"
                      onClick={() => setForm(f => ({ ...f, isPrivate: !f.isPrivate }))}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                          {form.type === "CLUB" ? "🔒 Üyelik onay gerektirsin" : "🔒 Özel grup"}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {form.type === "CLUB" ? "Üyelik başvuruları yönetici onayına sunulur" : "Katılım isteği yönetici onayına sunulur"}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-checked={form.isPrivate}
                        role="switch"
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                          form.isPrivate ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                            form.isPrivate ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  )}
                </>
              )}

              {form.type === "VENUE" && (
                <div>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-900/20 p-4">
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">🏟️ İşletme Topluluk Sayfası</p>
                    <p className="text-xs text-emerald-700/80 dark:text-emerald-400 mt-1 leading-relaxed">
                      İşletme topluluğu, tesis profilin üzerinden oluşturulur. Bu adım sonunda kurucu paneline geçip işletmeni yönetebilirsin.
                    </p>
                    <div className="mt-3 flex gap-2 text-xs">
                      <span className="px-2 py-1 rounded-full bg-white/80 dark:bg-gray-900/40 text-emerald-700 dark:text-emerald-300">Topluluk sayfası</span>
                      <span className="px-2 py-1 rounded-full bg-white/80 dark:bg-gray-900/40 text-emerald-700 dark:text-emerald-300">Kurucu paneli</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleCreate}
                disabled={creating || (form.type !== "VENUE" && !form.name.trim())}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
              >
                {creating
                  ? <span className="flex items-center justify-center gap-2"><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Oluşturuluyor...</span>
                  : form.type === "VENUE"
                    ? "🏟️ İşletme Topluluk Sayfasına Geç"
                    : `${form.type === "CLUB" ? "🏛️ Kulübü" : form.type === "TEAM" ? "⚽ Takımı" : "👥 Grubu"} Oluştur`
                }
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VenueCommunityCard({ venue, isOwner }: { venue: VenueCommunityCardData; isOwner: boolean }) {
  const coverImage = venue.images?.[0];

  return (
    <div className="group relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 to-cyan-400" />

      <div className="relative h-36 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImage} alt={venue.businessName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl">🏟️</div>
        )}
        {venue.isVerified && (
          <span className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            ✓ Onaylı
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <Link
            href={`/mekanlar/${venue.id}`}
            className="font-semibold text-gray-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 line-clamp-1 transition-colors"
          >
            {venue.businessName}
          </Link>
          {venue.address && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">📍 {venue.address}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">🏟️ İşletme</span>
          {venue.sports.slice(0, 2).map((sport) => (
            <span key={sport} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
              {sport}
            </span>
          ))}
          {venue.sports.length > 2 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">+{venue.sports.length - 2}</span>
          )}
        </div>

        {venue.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{venue.description}</p>
        )}

        <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>🏗️ {venue._count.facilities} tesis alanı</span>
            {venue.capacity && <span>👤 {venue.capacity}</span>}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Link
              href={`/mekanlar/${venue.id}`}
              className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
            >
              Topluluk Sayfası
            </Link>
            {isOwner && (
              <Link
                href="/ayarlar/isletme"
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
              >
                Yönetim Paneli
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}