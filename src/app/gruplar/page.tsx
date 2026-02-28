"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface Group {
  id: string;
  name: string;
  description?: string | null;
  isPublic: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  sport?: { id: string; name: string; icon: string | null } | null;
  city?: { id: string; name: string } | null;
  creator: { id: string; name: string; avatarUrl?: string | null };
  _count: { members: number; listings: number };
}

export default function GruplarPage() {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroupIds, setMyGroupIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    isPublic: true,
  });
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const fetchGroups = async (q = "") => {
    setLoading(true);
    try {
      const res = await fetch(`/api/groups${q ? `?search=${encodeURIComponent(q)}` : ""}`);
      const json = await res.json();
      if (json.success) setGroups(json.groups ?? []);
    } catch {
      toast.error("Gruplar yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyGroups = async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (json.success) {
        const ids = new Set<string>(
          (json.data.myGroups ?? []).map((m: { groupId: string }) => m.groupId)
        );
        setMyGroupIds(ids);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchGroups();
    fetchMyGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGroups(search);
  };

  const handleJoin = async (groupId: string) => {
    if (!session) { toast.error("Giriş yapmanız gerekiyor"); return; }
    setJoiningId(groupId);
    try {
      const isMember = myGroupIds.has(groupId);
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: isMember ? "DELETE" : "POST",
      });
      const json = await res.json();
      if (json.success) {
        setMyGroupIds((prev) => {
          const next = new Set(prev);
          isMember ? next.delete(groupId) : next.add(groupId);
          return next;
        });
        toast.success(isMember ? "Gruptan ayrıldınız" : "Gruba katıldınız!");
        setGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? { ...g, _count: { ...g._count, members: g._count.members + (isMember ? -1 : 1) } }
              : g
          )
        );
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
    if (!session) { toast.error("Giriş yapmanız gerekiyor"); return; }
    if (!createForm.name.trim()) { toast.error("Grup adı gereklidir"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("✅ Grup oluşturuldu!");
        setShowCreate(false);
        setCreateForm({ name: "", description: "", isPublic: true });
        setGroups((prev) => [json.group, ...prev]);
        setMyGroupIds((prev) => new Set([...prev, json.group.id]));
      } else {
        toast.error(json.error ?? "Grup oluşturulamadı");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">👥 Spor Grupları</h1>
        {session && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            + Grup Oluştur
          </button>
        )}
      </div>

      {/* Arama */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Grup ara..."
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
        />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          Ara
        </button>
      </form>

      {/* Grup oluşturma formu */}
      {showCreate && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-3">Yeni Grup Oluştur</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <input
              required
              type="text"
              placeholder="Grup adı *"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              maxLength={60}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <textarea
              placeholder="Açıklama (opsiyonel)"
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              rows={2}
              maxLength={500}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.isPublic}
                onChange={(e) => setCreateForm({ ...createForm, isPublic: e.target.checked })}
                className="rounded accent-emerald-600"
              />
              Herkese açık grup (üyeliğe istek gerekmez)
            </label>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={creating}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                {creating ? "Oluşturuluyor..." : "Oluştur"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Listesi */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">👥</p>
          <p>Henüz grup yok. İlk grubu sen oluştur!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => {
            const isMember = myGroupIds.has(g.id);
            return (
              <div
                key={g.id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{g.name}</h3>
                      {isMember && (
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                          ✓ Üyesiniz
                        </span>
                      )}
                      {!g.isPublic && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">
                          🔒 Kapalı
                        </span>
                      )}
                    </div>
                    {g.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{g.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                      {g.sport && <span>{g.sport.icon} {g.sport.name}</span>}
                      {g.city && <span>📍 {g.city.name}</span>}
                      <span>👥 {g._count.members} üye</span>
                      <span>📋 {g._count.listings} ilan</span>
                    </div>
                  </div>
                  {session && (
                    <button
                      onClick={() => handleJoin(g.id)}
                      disabled={joiningId === g.id || (!g.isPublic && !isMember)}
                      className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition disabled:opacity-50 ${
                        isMember
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-red-100 hover:text-red-600"
                          : g.isPublic
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {joiningId === g.id
                        ? "..."
                        : isMember
                        ? "Ayrıl"
                        : g.isPublic
                        ? "Katıl"
                        : "Kapalı"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
