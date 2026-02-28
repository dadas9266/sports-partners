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
  });
  const [creating, setCreating] = useState(false);

  // Fetch sports + cities once
  useEffect(() => {
    fetch("/api/sports").then(r => r.json()).then(d => setSports(d.sports ?? d.data ?? [])).catch(() => {});
    fetch("/api/locations").then(r => r.json()).then(d => setCities(d.cities ?? d.data ?? [])).catch(() => {});
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
          ...form,
          sportId: form.sportId || undefined,
          cityId:  form.cityId  || undefined,
          description: form.description || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Topluluk oluşturuldu!");
      setShowCreate(false);
      setForm({ type: "GROUP", name: "", description: "", isPrivate: false, sportId: "", cityId: "" });
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
      {showCreate && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Yeni Topluluk Oluştur</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tür</label>
              <div className="flex gap-2">
                {TYPES.slice(1).map(t => (
                  <button
                    key={t.value}
                    onClick={() => setForm(f => ({ ...f, type: t.value as CommunityType }))}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      form.type === t.value
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                        : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                İsim <span className="text-red-500">*</span>
              </label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                maxLength={80}
                placeholder="Topluluk adı"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                maxLength={500}
                placeholder="Topluluk hakkında kısa açıklama..."
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spor</label>
                <select
                  value={form.sportId}
                  onChange={e => setForm(f => ({ ...f, sportId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Seçiniz</option>
                  {sports.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Şehir</label>
                <select
                  value={form.cityId}
                  onChange={e => setForm(f => ({ ...f, cityId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Seçiniz</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPrivate}
                onChange={e => setForm(f => ({ ...f, isPrivate: e.target.checked }))}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">🔒 Özel topluluk (onaylı üyelik)</span>
            </label>

            <button
              onClick={handleCreate}
              disabled={creating || !form.name.trim()}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              {creating ? "Oluşturuluyor..." : "Oluştur"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}