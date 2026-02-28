"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  userType: "INDIVIDUAL" | "TRAINER" | "VENUE";
  isAdmin: boolean;
  isBanned: boolean;
  noShowCount: number;
  warnCount: number;
  createdAt: string;
}

interface VenueProfileAdmin {
  id: string;
  businessName: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  sports: string[];
  isVerified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  images: string[];
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const USER_TYPE_LABELS: Record<string, string> = {
  INDIVIDUAL: "Bireysel",
  TRAINER: "Eğitmen",
  VENUE: "Mekan",
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "venues">("users");
  const [venueProfiles, setVenueProfiles] = useState<VenueProfileAdmin[]>([]);
  const [venueLoading, setVenueLoading] = useState(false);
  const [dbStats, setDbStats] = useState<{
    users: { total: number; new30d: number; new7d: number; banned: number };
    listings: { total: number; open: number };
    matches: { total: number; completed: number };
    clubs: { total: number };
    groups: { total: number };
    ratings: { total: number };
  } | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        if (data.success) setDbStats(data.stats);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchVenues = useCallback(async (filterStatus = "PENDING") => {
    setVenueLoading(true);
    try {
      const res = await fetch(`/api/admin/venues?status=${filterStatus}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setVenueProfiles(data.data ?? []);
      }
    } catch {
      toast.error("Mekan profilleri yüklenemedi");
    } finally {
      setVenueLoading(false);
    }
  }, []);

  const handleVenueAction = async (profileId: string, action: "approve" | "reject") => {
    setActionLoading(`venue-${profileId}`);
    try {
      const res = await fetch("/api/admin/venues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "İşlem başarısız");
      toast.success(action === "approve" ? "Mekan onaylandı ✅" : "Mekan reddedildi");
      setVenueProfiles((prev) =>
        prev.map((p) =>
          p.id === profileId ? { ...p, isVerified: action === "approve" } : p
        )
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Hata");
    } finally {
      setActionLoading(null);
    }
  };

  // Admin değilse yönlendir
  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.isAdmin) {
      router.replace("/");
    }
  }, [session, status, router]);

  const fetchUsers = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?page=${p}&limit=20`);
      if (!res.ok) throw new Error("Yetki hatası");
      const data = await res.json();
      setUsers(data.users ?? []);
      setPagination(data.pagination ?? null);
    } catch {
      toast.error("Kullanıcılar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.isAdmin) fetchUsers(page);
  }, [session, page, fetchUsers]);

  useEffect(() => {
    if (session?.user?.isAdmin) fetchStats();
  }, [session, fetchStats]);

  useEffect(() => {
    if (session?.user?.isAdmin && activeTab === "venues") fetchVenues();
  }, [session, activeTab, fetchVenues]);

  const handleAction = async (
    userId: string,
    field: "isBanned" | "isAdmin",
    value: boolean
  ) => {
    setActionLoading(`${userId}-${field}`);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "İşlem başarısız");

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, [field]: value } : u
        )
      );
      toast.success(
        field === "isBanned"
          ? value
            ? "Kullanıcı yasaklandı"
            : "Yasak kaldırıldı"
          : value
          ? "Admin yetkisi verildi"
          : "Admin yetkisi alındı"
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Hata oluştu");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = search.trim()
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  if (status === "loading" || (status === "authenticated" && !session?.user?.isAdmin)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            🛡️ Admin Paneli
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Toplam {pagination?.total ?? "–"} kullanıcı
          </p>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg">
          {session?.user?.name} — Admin
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Toplam Kullanıcı"
          value={dbStats?.users.total ?? pagination?.total ?? 0}
          color="blue"
          icon="👥"
        />
        <StatCard
          label="Son 30 Gün"
          value={dbStats?.users.new30d ?? 0}
          color="emerald"
          icon="👤✨"
        />
        <StatCard
          label="Yasaklı Kullanıcı"
          value={dbStats?.users.banned ?? 0}
          color="red"
          icon="🚫"
        />
        <StatCard
          label="Üyeler (7g)"
          value={dbStats?.users.new7d ?? 0}
          color="purple"
          icon="👤"
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Aktif İlanlar" value={dbStats?.listings.open ?? 0} color="emerald" icon="📋" />
        <StatCard label="Toplam Maç" value={dbStats?.matches.total ?? 0} color="blue" icon="⚔️" />
        <StatCard label="Tamamlanan" value={dbStats?.matches.completed ?? 0} color="emerald" icon="✅" />
        <StatCard label="Kulüpler / Gruplar" value={(dbStats?.clubs.total ?? 0) + (dbStats?.groups.total ?? 0)} color="purple" icon="🏛️" />
      </div>

      {/* Sekme Butonları */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        {([["users", "👥 Kullanıcılar"], ["venues", "🏙️ Mekan Onayları"]] as const).map(([tab, label]) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors ${
              activeTab === tab
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {label}
            {tab === "venues" && venueProfiles.filter(v => !v.isVerified).length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {venueProfiles.filter(v => !v.isVerified).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Mekan Onayları Sekmesi ─────────────────────────────────────── */}
      {activeTab === "venues" && (
        <div>
          <div className="flex gap-2 mb-4">
            {(["PENDING", "ALL"] as const).map((s) => (
              <button key={s} onClick={() => fetchVenues(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                {s === "PENDING" ? "⏳ Bekleyenler" : "📋 Tümü"}
              </button>
            ))}
          </div>
          {venueLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          ) : venueProfiles.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <span className="text-4xl">🏙️</span>
              <p className="mt-3 text-sm">Bekleyen mekan başvurusu yok</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {venueProfiles.map((venue) => (
                <div key={venue.id} className={`bg-white dark:bg-gray-800 rounded-2xl border p-5 shadow-sm ${
                  venue.isVerified ? "border-emerald-200 dark:border-emerald-800" : "border-orange-200 dark:border-orange-800/50"
                }`}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex gap-3 items-start">
                      {venue.user.avatarUrl ? (
                        <img src={venue.user.avatarUrl} className="w-10 h-10 rounded-full object-cover border" alt={venue.user.name} />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-sm font-bold text-emerald-600">
                          {venue.user.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{venue.businessName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{venue.user.name} — {venue.user.email}</p>
                        {venue.address && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">📍 {venue.address}</p>}
                        {venue.sports.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {venue.sports.map((s) => (
                              <span key={s} className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">{s}</span>
                            ))}
                          </div>
                        )}
                        <p className="text-[11px] text-gray-400 mt-2">
                          Başvuru: {format(new Date(venue.createdAt), "d MMM yyyy HH:mm", { locale: tr })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {venue.isVerified ? (
                        <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg font-medium">
                          ✅ Onaylı
                        </span>
                      ) : (
                        <>
                          <button
                            disabled={actionLoading === `venue-${venue.id}`}
                            onClick={() => handleVenueAction(venue.id, "approve")}
                            className="text-xs px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 rounded-lg font-medium transition disabled:opacity-50"
                          >
                            {actionLoading === `venue-${venue.id}` ? "..." : "✅ Onayla"}
                          </button>
                          <button
                            disabled={actionLoading === `venue-${venue.id}`}
                            onClick={() => handleVenueAction(venue.id, "reject")}
                            className="text-xs px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-800/40 rounded-lg font-medium transition disabled:opacity-50"
                          >
                            {actionLoading === `venue-${venue.id}` ? "..." : "❌ Reddet"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Kullanıcı Yönetimi Sekmesi ────────────────────────────────── */}
      {activeTab === "users" && <>
      {/* Arama */}
      <div className="mb-5">
        <input
          type="text"
          placeholder="İsim veya e-posta ile ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Kullanıcı Tablosu */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-500">
            Kullanıcı bulunamadı
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  {["Kullanıcı", "Tür", "Kayıt", "No-Show / Uyarı", "Durum", "İşlemler"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase text-xs tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                      user.isBanned ? "opacity-60" : ""
                    }`}
                  >
                    {/* Kullanıcı */}
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                          {user.name}
                          {user.isAdmin && (
                            <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-full">
                              Admin
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs mt-0.5">{user.email}</div>
                      </div>
                    </td>

                    {/* Tür */}
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                        {USER_TYPE_LABELS[user.userType] ?? user.userType}
                      </span>
                    </td>

                    {/* Kayıt Tarihi */}
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {format(new Date(user.createdAt), "d MMM yyyy", { locale: tr })}
                    </td>

                    {/* Sayaçlar */}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            user.noShowCount > 0
                              ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                          }`}
                        >
                          NS:{user.noShowCount}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            user.warnCount > 0
                              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600"
                              : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                          }`}
                        >
                          W:{user.warnCount}
                        </span>
                      </div>
                    </td>

                    {/* Durum */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${
                          user.isBanned
                            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                            : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {user.isBanned ? "🚫 Yasaklı" : "✅ Aktif"}
                      </span>
                    </td>

                    {/* İşlemler */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* Ban / Unban */}
                        <button
                          disabled={actionLoading === `${user.id}-isBanned`}
                          onClick={() => handleAction(user.id, "isBanned", !user.isBanned)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50 ${
                            user.isBanned
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 hover:bg-emerald-200 dark:hover:bg-emerald-800/40"
                              : "bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-800/40"
                          }`}
                        >
                          {actionLoading === `${user.id}-isBanned`
                            ? "..."
                            : user.isBanned
                            ? "Yasağı Kaldır"
                            : "Yasakla"}
                        </button>

                        {/* Admin Toggle */}
                        <button
                          disabled={
                            user.id === session?.user?.id ||
                            actionLoading === `${user.id}-isAdmin`
                          }
                          onClick={() => handleAction(user.id, "isAdmin", !user.isAdmin)}
                          title={
                            user.id === session?.user?.id
                              ? "Kendi hesabınızı değiştiremezsiniz"
                              : undefined
                          }
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                            user.isAdmin
                              ? "bg-gray-100 dark:bg-gray-700 text-gray-600 hover:bg-gray-200"
                              : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 hover:bg-purple-200"
                          }`}
                        >
                          {actionLoading === `${user.id}-isAdmin`
                            ? "..."
                            : user.isAdmin
                            ? "Admin Al"
                            : "Admin Yap"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            ← Önceki
          </button>
          <span className="text-sm text-gray-500 dark:text-gray-400 px-2">
            {page} / {pagination.totalPages}
          </span>
          <button
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            Sonraki →
          </button>
        </div>
      )}
      {/* ── Kullanıcı sekmesi sonu ── */}
      </>}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: "blue" | "red" | "purple" | "emerald";
  icon: string;
}) {
  const colorMap = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
    emerald:
      "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400",
  };

  return (
    <div className={`rounded-xl p-4 ${colorMap[color]}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value.toLocaleString("tr-TR")}</div>
      <div className="text-xs font-medium mt-0.5 opacity-80">{label}</div>
    </div>
  );
}
