"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import toast from "react-hot-toast";

interface Member {
  id: string;
  role: string;
  status: string;
  joinedAt: string;
  user: { id: string; name: string | null; avatarUrl: string | null };
}

interface Community {
  id: string;
  type: "GROUP" | "CLUB" | "TEAM";
  name: string;
  description: string | null;
  avatarUrl: string | null;
  website: string | null;
  isPrivate: boolean;
  createdAt: string;
  sport: { id: string; name: string; icon: string | null } | null;
  city: { id: string; name: string } | null;
  creator: { id: string; name: string | null; avatarUrl: string | null };
  _count: { members: number };
}

const TYPE_LABELS: Record<string, { label: string; color: string; emoji: string }> = {
  GROUP: { label: "Grup", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", emoji: "👥" },
  CLUB:  { label: "Kulüp", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", emoji: "🏛️" },
  TEAM:  { label: "Takım", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300", emoji: "⚽" },
};

export default function CommunityDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const router = useRouter();
  const { data: session } = useSession();

  const [community, setCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingMembers, setPendingMembers] = useState<Member[]>([]);
  const [myStatus, setMyStatus] = useState<"APPROVED" | "PENDING" | null>(null);
  const [myRole, setMyRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "manage">("overview");
  const [memberActionLoading, setMemberActionLoading] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", website: "", isPrivate: false });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [cRes, mRes] = await Promise.all([
          fetch(`/api/communities/${id}`),
          fetch(`/api/communities/${id}/members`),
        ]);
        const cJson = await cRes.json();
        const mJson = await mRes.json();

        if (!cRes.ok) { toast.error(cJson.error ?? "Topluluk yüklenemedi"); return; }
        const comm: Community = cJson.data;
        setCommunity(comm);

        if (mRes.ok) {
          const memberList: Member[] = mJson.data ?? [];
          setMembers(memberList.filter((m) => m.status === "APPROVED"));
          if (session?.user?.id) {
            const mine = memberList.find((m) => m.user.id === session.user.id);
            if (mine) {
              setMyStatus(mine.status as "APPROVED" | "PENDING");
              setMyRole(mine.role as "ADMIN" | "MEMBER");
            }
          }
        }

        // Fetch pending if creator/admin
        if (session?.user?.id) {
          const pendingRes = await fetch(`/api/communities/${id}/members?status=PENDING`);
          if (pendingRes.ok) {
            const pendingJson = await pendingRes.json();
            setPendingMembers(pendingJson.data ?? []);
          }
        }
      } catch {
        toast.error("Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session?.user?.id]);

  // Keep edit form synced with community
  useEffect(() => {
    if (community) {
      setEditForm({
        name: community.name,
        description: community.description ?? "",
        website: community.website ?? "",
        isPrivate: community.isPrivate,
      });
    }
  }, [community]);

  const handleJoin = async () => {
    if (!session) { router.push("/auth/giris"); return; }
    setJoining(true);
    try {
      const res = await fetch(`/api/communities/${id}/members`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      const status = json.data?.status === "PENDING" ? "PENDING" : "APPROVED";
      setMyStatus(status);
      toast.success(status === "PENDING" ? "Katılma talebiniz gönderildi" : "Topluluğa katıldınız!");
      if (community) setCommunity({ ...community, _count: { members: community._count.members + 1 } });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/communities/${id}/members`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMyStatus(null);
      setMembers((prev) => prev.filter((m) => m.user.id !== session?.user?.id));
      if (community) setCommunity({ ...community, _count: { members: Math.max(0, community._count.members - 1) } });
      toast.success("Topluluktan ayrıldınız");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setJoining(false);
    }
  };

  const handleMemberAction = useCallback(async (membershipId: string, action: "approve" | "reject" | "remove" | "makeAdmin" | "makeMemb") => {
    setMemberActionLoading(membershipId);
    try {
      if (action === "remove") {
        const res = await fetch(`/api/communities/${id}/members/${membershipId}`, { method: "DELETE" });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setMembers(prev => prev.filter(m => m.id !== membershipId));
        if (community) setCommunity({ ...community, _count: { members: Math.max(0, community._count.members - 1) } });
        toast.success("Üye çıkarıldı");
      } else if (action === "approve" || action === "reject") {
        const res = await fetch(`/api/communities/${id}/members/${membershipId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action === "approve" ? "APPROVED" : "REJECTED" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        const pending = pendingMembers.find(m => m.id === membershipId);
        setPendingMembers(prev => prev.filter(m => m.id !== membershipId));
        if (action === "approve" && pending) {
          setMembers(prev => [...prev, { ...pending, status: "APPROVED" }]);
          if (community) setCommunity({ ...community, _count: { members: community._count.members + 1 } });
        }
        toast.success(action === "approve" ? "Üye onaylandı" : "Talep reddedildi");
      } else if (action === "makeAdmin" || action === "makeMemb") {
        const res = await fetch(`/api/communities/${id}/members/${membershipId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: action === "makeAdmin" ? "ADMIN" : "MEMBER" }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setMembers(prev => prev.map(m => m.id === membershipId ? { ...m, role: action === "makeAdmin" ? "ADMIN" : "MEMBER" } : m));
        toast.success(action === "makeAdmin" ? "Admin yapıldı" : "Üye yapıldı");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setMemberActionLoading(null);
    }
  }, [id, community, pendingMembers]);

  const handleSaveSettings = async () => {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/communities/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name || undefined,
          description: editForm.description || null,
          website: editForm.website || null,
          isPrivate: editForm.isPrivate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCommunity(json.data);
      setEditMode(false);
      toast.success("Ayarlar kaydedildi");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Bir hata oluştu");
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center gap-4">
        <div className="text-5xl">😕</div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">Topluluk bulunamadı</p>
        <Link href="/topluluklar" className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm hover:bg-emerald-600 transition-colors">
          Tüm Topluluklara Dön
        </Link>
      </div>
    );
  }

  const typeInfo = TYPE_LABELS[community.type] ?? TYPE_LABELS.GROUP;
  const isCreator = session?.user?.id === community.creator.id;
  const isAdmin = isCreator || myRole === "ADMIN";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back */}
        <Link
          href="/topluluklar"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-6 transition-colors"
        >
          ← Tüm Topluluklar
        </Link>

        {/* Header card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-4xl overflow-hidden">
              {community.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={community.avatarUrl} alt={community.name} className="w-full h-full object-cover" />
              ) : (
                typeInfo.emoji
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${typeInfo.color}`}>
                  {typeInfo.emoji} {typeInfo.label}
                </span>
                {community.isPrivate && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                    🔒 Gizli
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{community.name}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                {community.sport && (
                  <span>{community.sport.icon} {community.sport.name}</span>
                )}
                {community.city && (
                  <span>📍 {community.city.name}</span>
                )}
                <span>👤 {community._count.members} üye</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-2">
              {!isCreator && (
                myStatus === "APPROVED" ? (
                  <button
                    onClick={handleLeave}
                    disabled={joining}
                    className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {joining ? "..." : "Ayrıl"}
                  </button>
                ) : myStatus === "PENDING" ? (
                  <span className="px-4 py-2 rounded-xl bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 text-sm font-medium">
                    ⏳ Onay Bekleniyor
                  </span>
                ) : (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {joining ? "..." : community.isPrivate ? "Katılma Talebi Gönder" : "Katıl"}
                  </button>
                )
              )}
              {isCreator && (
                <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs font-bold">
                  👑 Kurucu
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {community.description && (
            <p className="mt-4 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">{community.description}</p>
          )}

          {/* Website */}
          {community.website && (
            <a
              href={community.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              🌐 {community.website.replace(/^https?:\/\//, "")}
            </a>
          )}

          {/* Creator */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs overflow-hidden">
              {community.creator.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={community.creator.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (community.creator.name?.[0] ?? "?").toUpperCase()
              )}
            </div>
            <span>
              Oluşturan:{" "}
              <Link href={`/profil/${community.creator.id}`} className="hover:text-emerald-500 transition-colors">
                {community.creator.name ?? "Kullanıcı"}
              </Link>
            </span>
            <span className="ml-auto">
              {new Date(community.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Tabs — show "Yönet" only for admin/creator */}
        {isAdmin && (
          <div className="flex gap-1 mb-4 bg-white dark:bg-gray-900 p-1 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            {[
              { key: "overview", label: "👥 Genel Bakış" },
              { key: "manage",   label: `⚙️ Yönet${pendingMembers.length > 0 ? ` (${pendingMembers.length})` : ""}` },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as typeof activeTab)}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === t.key
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Üyeler{members.length > 0 && <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">({members.length})</span>}
            </h2>

            {members.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Henüz üye yok</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {members.map((m) => (
                  <Link
                    key={m.id}
                    href={`/profil/${m.user.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-semibold overflow-hidden flex-shrink-0">
                      {m.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (m.user.name?.[0] ?? "?").toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {m.user.name ?? "Kullanıcı"}
                        {m.user.id === community.creator.id && (
                          <span className="ml-1.5 text-xs text-yellow-600 dark:text-yellow-400">👑 Kurucu</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {m.role === "ADMIN" ? "Yönetici" : "Üye"} · {new Date(m.joinedAt).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "manage" && isAdmin && (
          <div className="space-y-4">
            {/* Pending Requests */}
            {community.isPrivate && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  ⏳ Bekleyen Talepler
                  {pendingMembers.length > 0 && (
                    <span className="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">{pendingMembers.length}</span>
                  )}
                </h2>
                {pendingMembers.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-2">Bekleyen katılım talebi yok</p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {pendingMembers.map(m => (
                      <div key={m.id} className="flex items-center gap-3 py-3">
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
                          {m.user.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (m.user.name?.[0] ?? "?").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.user.name ?? "Kullanıcı"}</p>
                          <p className="text-xs text-gray-400">{new Date(m.joinedAt).toLocaleDateString("tr-TR")}</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            disabled={memberActionLoading === m.id}
                            onClick={() => handleMemberAction(m.id, "approve")}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition disabled:opacity-50"
                          >
                            {memberActionLoading === m.id ? "..." : "Onayla"}
                          </button>
                          <button
                            disabled={memberActionLoading === m.id}
                            onClick={() => handleMemberAction(m.id, "reject")}
                            className="px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-semibold transition disabled:opacity-50"
                          >
                            Reddet
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Member Management */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">👥 Üye Yönetimi</h2>
              {members.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 py-2">Henüz üye yok</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {members.map(m => {
                    const isSelf = m.user.id === session?.user?.id;
                    const isCom = m.user.id === community.creator.id;
                    return (
                      <div key={m.id} className="flex items-center gap-3 py-3">
                        <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold overflow-hidden flex-shrink-0">
                          {m.user.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (m.user.name?.[0] ?? "?").toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {m.user.name ?? "Kullanıcı"}
                            {isCom && <span className="ml-1 text-xs text-yellow-600">👑</span>}
                          </p>
                          <p className="text-xs text-gray-400">{m.role === "ADMIN" ? "Yönetici" : "Üye"}</p>
                        </div>
                        {!isSelf && !isCom && (
                          <div className="flex gap-1.5 shrink-0">
                            {isCreator && (
                              m.role === "MEMBER" ? (
                                <button
                                  disabled={memberActionLoading === m.id}
                                  onClick={() => handleMemberAction(m.id, "makeAdmin")}
                                  className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-medium transition disabled:opacity-50"
                                  title="Admin yap"
                                >
                                  ↑ Admin
                                </button>
                              ) : (
                                <button
                                  disabled={memberActionLoading === m.id}
                                  onClick={() => handleMemberAction(m.id, "makeMemb")}
                                  className="px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100 text-xs font-medium transition disabled:opacity-50"
                                  title="Üye yap"
                                >
                                  ↓ Üye
                                </button>
                              )
                            )}
                            <button
                              disabled={memberActionLoading === m.id}
                              onClick={() => handleMemberAction(m.id, "remove")}
                              className="px-2.5 py-1 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 text-xs font-medium transition disabled:opacity-50"
                              title="Çıkar"
                            >
                              {memberActionLoading === m.id ? "..." : "Çıkar"}
                            </button>
                          </div>
                        )}
                        {(isSelf || isCom) && <span className="text-xs text-gray-400 shrink-0">{isSelf ? "(Sen)" : ""}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Community Settings */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">🛠️ Topluluk Ayarları</h2>
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                  >
                    Düzenle
                  </button>
                )}
              </div>

              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Topluluk Adı</label>
                    <input
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Açıklama</label>
                    <textarea
                      rows={3}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                      value={editForm.description}
                      onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">Website (opsiyonel)</label>
                    <input
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      value={editForm.website}
                      placeholder="https://"
                      onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-gray-100 dark:border-gray-800">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">🔒 Gizli Topluluk</p>
                      <p className="text-xs text-gray-400 mt-0.5">Açık ise herkese açık, kapalı ise onay gerekir</p>
                    </div>
                    <button
                      onClick={() => setEditForm(f => ({ ...f, isPrivate: !f.isPrivate }))}
                      className={`relative w-10 h-5.5 rounded-full transition-colors ${editForm.isPrivate ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
                      style={{ minWidth: "40px", height: "22px" }}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editForm.isPrivate ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleSaveSettings}
                      disabled={editSaving}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50"
                    >
                      {editSaving ? "Kaydediliyor..." : "Kaydet"}
                    </button>
                    <button
                      onClick={() => { setEditMode(false); setEditForm({ name: community.name, description: community.description ?? "", website: community.website ?? "", isPrivate: community.isPrivate }); }}
                      className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-sm font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Üyelik tipi</p>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${community.isPrivate ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"}`}>
                      {community.isPrivate ? "🔒 Onay Gerekli" : "🌍 Herkese Açık"}
                    </span>
                  </div>
                  {community.description && (
                    <div className="py-2 border-b border-gray-100 dark:border-gray-800">
                      <p className="text-xs text-gray-400 mb-1">Açıklama</p>
                      <p className="text-sm text-gray-700 dark:text-gray-200">{community.description}</p>
                    </div>
                  )}
                  {community.website && (
                    <div className="py-2">
                      <p className="text-xs text-gray-400 mb-1">Website</p>
                      <a href={community.website} target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">{community.website}</a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
