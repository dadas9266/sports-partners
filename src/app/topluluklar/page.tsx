"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import CommunityCard, { CommunityCardData, CommunityType } from "@/components/CommunityCard";

const TYPES: { value: CommunityType | ""; label: string }[] = [
  { value: "", label: "🌐 Tümü" },
  { value: "GROUP", label: "👥 Gruplar" },
  { value: "CLUB", label: "🏛️ Kulüpler" },
  { value: "TEAM", label: "⚽ Takımlar" },
];

interface Sport { id: string; name: string; icon?: string | null }
interface City  { id: string; name: string }

interface CommunityWithStatus extends CommunityCardData {
  myStatus?: "APPROVED" | "PENDING" | null;
}

export default function ToplulukPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [communities, setCommunities] = useState<CommunityWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<CommunityType | "">((searchParams?.get("type") as CommunityType) ?? "");
  const [search, setSearch] = useState("");
  const [sportId, setSportId] = useState("");
  const [cityId, setCityId] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [joining, setJoining] = useState<string | null>(null);

  const [sports, setSports] = useState<Sport[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    type: "GROUP" as CommunityType,
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
      const allCities = (d.data ?? []).flatMap((country: any) => country.cities ?? []);
      setCities(allCities);
    }).catch(() => {});
  }, []);

  const fetchCommunities = useCallback(async () => {
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

  useEffect(() => { fetchCommunities(); }, [fetchCommunities]);

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
      fetchCommunities();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setCreating(false);
    }
  };

  const LIMIT = 12;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Topluluklar</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Gruplar, kulüpler ve takımları keşfet
            </p>
          </div>
          {session && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
            >
              + Oluştur
            </button>
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
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        ) : communities.length === 0 ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            <div className="text-5xl mb-3">🏟️</div>
            <p className="font-medium">Topluluk bulunamadı</p>
            <p className="text-sm mt-1">İlk topluluğu sen oluştur!</p>
          </div>
        ) : (
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
        )}

        {/* Pagination */}
        {totalPages > 1 && (
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
                  {form.type === "CLUB" ? "🏛️" : form.type === "TEAM" ? "⚽" : "👥"}
                </span>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">Yeni Topluluk Oluştur</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 leading-tight">
                    {form.type === "CLUB" ? "Resmi spor kulübü" : form.type === "TEAM" ? "Maç odaklı küçük takım" : "Herkese açık spor grubu"}
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
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { value: "GROUP", icon: "👥", label: "Grup",  badge: "Açık",   badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
                    { value: "CLUB",  icon: "🏛️", label: "Kulüp", badge: "Onaylı", badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
                    { value: "TEAM",  icon: "⚽", label: "Takım", badge: "Maç",    badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300" },
                  ] as const).map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t.value, isPrivate: t.value === "CLUB" ? true : f.isPrivate }))}
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
                  </p>
                </div>
              </div>

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

              {/* Submit */}
              <button
                onClick={handleCreate}
                disabled={creating || !form.name.trim()}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
              >
                {creating
                  ? <span className="flex items-center justify-center gap-2"><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />Oluşturuluyor...</span>
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