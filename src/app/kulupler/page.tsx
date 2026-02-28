"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface Club {
  id: string;
  name: string;
  description?: string | null;
  website?: string | null;
  sport?: { id: string; name: string; icon: string | null } | null;
  city?: { id: string; name: string } | null;
  _count: { members: number };
}

export default function KuluplerimPage() {
  const { data: session } = useSession();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [myClubIds, setMyClubIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", website: "" });
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchClubs = async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clubs${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      const json = await res.json();
      if (json.success) setClubs(json.data ?? []);
    } catch {
      toast.error("Kulüpler yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClubs = async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (json.success) {
        const ids = new Set<string>((json.data.myClubs ?? []).map((m: any) => m.clubId));
        setMyClubIds(ids);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchClubs();
    fetchMyClubs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchClubs(search);
  };

  const handleJoin = async (clubId: string) => {
    if (!session) { toast.error("Giriş yapmanız gerekiyor"); return; }
    setJoiningId(clubId);
    try {
      const isMember = myClubIds.has(clubId);
      const res = await fetch(`/api/clubs/${clubId}/members`, {
        method: isMember ? "DELETE" : "POST",
      });
      const json = await res.json();
      if (json.success) {
        setMyClubIds((prev) => {
          const next = new Set(prev);
          isMember ? next.delete(clubId) : next.add(clubId);
          return next;
        });
        toast.success(isMember ? "Kulüpten ayrıldınız" : "Kulübe katıldınız!");
      } else {
        toast.error(json.error ?? "İşlem başarısız");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setJoiningId(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) { toast.error("Kulüp adı gerekli"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Kulüp oluşturuldu!");
        setShowCreate(false);
        setCreateForm({ name: "", description: "", website: "" });
        setClubs((prev) => [json.data, ...prev]);
        setMyClubIds((prev) => new Set([...prev, json.data.id]));
      } else {
        toast.error(json.error ?? "Kulüp oluşturulamadı");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">🏅 Spor Kulüpleri</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Kulübüne katıl veya yeni bir kulüp oluştur</p>
        </div>
        {session && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl transition text-sm"
          >
            + Kulüp Oluştur
          </button>
        )}
      </div>

      {/* Kulüp Oluştur Formu */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-5 space-y-3"
        >
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">Yeni Kulüp</h2>
          <input
            required
            type="text"
            placeholder="Kulüp adı *"
            value={createForm.name}
            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
          />
          <textarea
            placeholder="Açıklama (opsiyonel)"
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            rows={2}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none text-sm"
          />
          <input
            type="url"
            placeholder="Web sitesi (opsiyonel)"
            value={createForm.website}
            onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={creating}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              {creating ? "Oluşturuluyor..." : "Oluştur"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700 transition"
            >
              İptal
            </button>
          </div>
        </form>
      )}

      {/* Arama */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <input
          type="text"
          placeholder="Kulüp ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
        />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition"
        >
          Ara
        </button>
      </form>

      {/* Kulüp Listesi */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
        </div>
      ) : clubs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">🏅</p>
          <p className="font-medium">Henüz kulüp yok</p>
          <p className="text-sm mt-1">İlk kulübü sen oluştur!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clubs.map((club) => {
            const isMember = myClubIds.has(club.id);
            return (
              <div
                key={club.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4 shadow-sm"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-xl flex-shrink-0">
                  {club.sport?.icon ?? "🏅"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">{club.name}</h3>
                    {isMember && (
                      <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">
                        ✓ Üyesiniz
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex-wrap">
                    {club.sport && <span>{club.sport.name}</span>}
                    {club.city && <span>📍 {club.city.name}</span>}
                    <span>👥 {club._count.members} üye</span>
                  </div>
                  {club.description && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">{club.description}</p>
                  )}
                </div>
                {session && (
                  <button
                    onClick={() => handleJoin(club.id)}
                    disabled={joiningId === club.id}
                    className={`flex-shrink-0 text-sm font-semibold px-3 py-1.5 rounded-lg transition disabled:opacity-60 ${
                      isMember
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    }`}
                  >
                    {joiningId === club.id ? "..." : isMember ? "Ayrıl" : "Katıl"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
