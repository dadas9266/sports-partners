"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  avatarUrl: string | null;
  createdAt: string;
  sport: { id: string; name: string; icon: string | null } | null;
  city: { id: string; name: string } | null;
  _count: { members: number };
}

interface Member {
  id: string;
  role: string;
  status: string;
  joinedAt: string;
  user: { id: string; name: string | null; avatarUrl: string | null; totalMatches: number };
}

export default function GroupVitrinPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const groupId = (params?.groupId ?? "") as string;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [myMembership, setMyMembership] = useState<{ id: string; role: string; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "posts">("members");
  const [posts, setPosts] = useState<{ id: string; content: string | null; images: string[]; createdAt: string; user: { id: string; name: string | null; avatarUrl: string | null }; _count: { likes: number; comments: number } }[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [submittingPost, setSubmittingPost] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const json = await res.json();
      if (json.success) setGroup(json.data);
      else { toast.error("Grup bulunamadı"); router.push("/gruplar"); }
    } catch { toast.error("Yüklenemedi"); }
  }, [groupId, router]);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members?status=APPROVED`);
      const json = await res.json();
      if (json.success) {
        const list: Member[] = json.members ?? [];
        setMembers(list);
        if (session?.user?.id) {
          const mine = list.find((m) => m.user.id === session.user?.id);
          if (mine) setMyMembership({ id: mine.id, role: mine.role, status: mine.status });
        }
      }
    } catch { /* ignore */ }
  }, [groupId, session]);

  const checkPending = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members?status=PENDING`);
      const json = await res.json();
      if (json.success) {
        const mine = (json.members ?? []).find((m: Member) => m.user.id === session.user?.id);
        if (mine) setMyMembership({ id: mine.id, role: mine.role, status: "PENDING" });
      }
    } catch { /* ignore */ }
  }, [groupId, session]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchGroup(), fetchMembers()]);
      await checkPending();
      setLoading(false);
    };
    load();
  }, [fetchGroup, fetchMembers, checkPending]);

  useEffect(() => {
    if (activeTab !== "posts") return;
    setPostsLoading(true);
    fetch(`/api/posts?groupId=${groupId}`)
      .then(r => r.json())
      .then(json => { if (Array.isArray(json.posts)) setPosts(json.posts); })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [activeTab, groupId]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setSubmittingPost(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPost, groupId }),
      });
      const json = await res.json();
      if (json.post) {
        setPosts(prev => [json.post, ...prev]);
        setNewPost("");
        toast.success("Gönderi paylaşıldı!");
      } else {
        toast.error(json.error ?? "Hata oluştu");
      }
    } catch { toast.error("Sunucu hatası"); }
    finally { setSubmittingPost(false); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("type", "post");
      fd.append("file", file);
      fd.append("resourceId", groupId);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.url) { toast.error(uploadJson.error ?? "Yükleme başarısız"); return; }
      const patchRes = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: uploadJson.url }),
      });
      const patchJson = await patchRes.json();
      if (patchJson.success) {
        setGroup(prev => prev ? { ...prev, avatarUrl: uploadJson.url } : prev);
        toast.success("Grup fotoğrafı güncellendi!");
      } else {
        toast.error(patchJson.error ?? "Güncellenemedi");
      }
    } catch { toast.error("Sunucu hatası"); }
    finally { setUploadingAvatar(false); e.target.value = ""; }
  };

  const handleJoin = async () => {
    if (!session) { router.push("/auth/giris"); return; }
    setJoining(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "İşlem başarısız"); return; }
      toast.success(json.message ?? "Gruba katıldınız!");
      await fetchMembers();
      await checkPending();
    } catch { toast.error("Sunucu hatası"); }
    finally { setJoining(false); }
  };

  const handleLeave = async () => {
    if (!confirm("Gruptan ayrılmak istediğinize emin misiniz?")) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "İşlem başarısız"); return; }
      toast.success("Gruptan ayrıldınız");
      setMyMembership(null);
      await fetchMembers();
    } catch { toast.error("Sunucu hatası"); }
    finally { setJoining(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) return null;

  const isAdmin = myMembership?.role === "ADMIN" && myMembership?.status === "APPROVED";
  const isMember = myMembership?.status === "APPROVED";
  const isPending = myMembership?.status === "PENDING";
  const admins = members.filter((m) => m.role === "ADMIN");
  const regularMembers = members.filter((m) => m.role !== "ADMIN");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-indigo-800 dark:to-violet-900">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <button
            onClick={() => router.push("/gruplar")}
            className="text-indigo-200 hover:text-white text-sm mb-4 flex items-center gap-1 transition"
          >
            ← Tüm Gruplar
          </button>
          <div className="flex items-start gap-5">
            <div className="relative w-20 h-20 flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-4xl shadow-lg overflow-hidden">
                {group.avatarUrl ? (
                  <img src={group.avatarUrl} alt={group.name} className="w-full h-full object-cover" />
                ) : (
                  group.sport?.icon ?? "👥"
                )}
              </div>
              {isAdmin && (
                <label className="absolute inset-0 rounded-2xl cursor-pointer flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                  <input type="file" accept="image/*" hidden onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                  <span className="text-white text-xs font-semibold">{uploadingAvatar ? "⏳" : "📷"}</span>
                </label>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{group.name}</h1>
                {!group.isPublic && (
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">🔒 Özel</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-indigo-100 text-sm flex-wrap">
                {group.sport && <span>{group.sport.icon} {group.sport.name}</span>}
                {group.city && <span>📍 {group.city.name}</span>}
                <span>👥 {group._count.members} üye</span>
              </div>
              {group.description && (
                <p className="text-indigo-50 text-sm mt-2 line-clamp-2">{group.description}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 mt-6 flex-wrap">
            {session ? (
              <>
                {isAdmin && (
                  <Link
                    href={`/grup-yonet/${groupId}`}
                    className="bg-white text-indigo-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-indigo-50 transition shadow"
                  >
                    ⚙️ Yönet
                  </Link>
                )}
                {isMember && !isAdmin && (
                  <button
                    onClick={handleLeave}
                    disabled={joining}
                    className="bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-lg text-sm transition disabled:opacity-60"
                  >
                    {joining ? "..." : "Ayrıl"}
                  </button>
                )}
                {isPending && (
                  <span className="bg-yellow-400/30 text-yellow-100 px-4 py-2 rounded-lg text-sm font-medium">
                    ⏳ Onay Bekleniyor
                  </span>
                )}
                {!myMembership && (
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="bg-white text-indigo-700 font-semibold px-5 py-2 rounded-lg text-sm hover:bg-indigo-50 transition shadow disabled:opacity-60"
                  >
                    {joining ? "..." : !group.isPublic ? "🔒 Başvur" : "Katıl"}
                  </button>
                )}
              </>
            ) : (
              <Link
                href="/auth/giris"
                className="bg-white text-indigo-700 font-semibold px-5 py-2 rounded-lg text-sm hover:bg-indigo-50 transition shadow"
              >
                Katılmak için Giriş Yap
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">

          {/* Tab Navigation */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("members")}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${activeTab === "members" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}
            >
              👥 Üyeler
            </button>
            <button
              onClick={() => setActiveTab("posts")}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${activeTab === "posts" ? "border-indigo-500 text-indigo-600 dark:text-indigo-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}
            >
              📸 Gönderiler
            </button>
          </div>

          {activeTab === "posts" && (
            <div className="space-y-4">
              {isMember && (
                <form onSubmit={handlePostSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                  <textarea
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    placeholder="Grup üyeleriyle bir şey paylaş…"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={submittingPost || !newPost.trim()}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition"
                    >
                      {submittingPost ? "Paylaşılıyor…" : "Paylaş"}
                    </button>
                  </div>
                </form>
              )}
              {postsLoading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}
              {!postsLoading && posts.length === 0 && <p className="text-center text-gray-400 dark:text-gray-500 py-8">Henüz gönderi yok.</p>}
              {posts.map(post => (
                <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    {post.user.avatarUrl
                      ? <img src={post.user.avatarUrl} alt={post.user.name ?? ""} className="w-9 h-9 rounded-full object-cover" />
                      : <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-700 font-bold text-sm">{(post.user.name ?? "?")[0]}</div>
                    }
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{post.user.name}</p>
                      <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString("tr-TR")}</p>
                    </div>
                  </div>
                  {post.content && <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{post.content}</p>}
                  {post.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      {post.images.slice(0, 4).map((img, i) => <img key={i} src={img} alt="" className="rounded-lg object-cover w-full aspect-square" />)}
                    </div>
                  )}
                  <div className="flex gap-4 mt-3 text-xs text-gray-400">
                    <span>❤️ {post._count.likes}</span>
                    <span>💬 {post._count.comments}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "members" && (<>
          {/* Admins */}
          {admins.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">👑 Yönetici{admins.length > 1 ? "ler" : ""}</h2>
              <div className="flex flex-wrap gap-3">
                {admins.map((m) => (
                  <Link
                    key={m.id}
                    href={`/profil/${m.user.id}`}
                    className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-xl px-3 py-2 hover:shadow-md transition"
                  >
                    {m.user.avatarUrl ? (
                      <img src={m.user.avatarUrl} alt={m.user.name ?? ""} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-violet-400 flex items-center justify-center text-white font-bold text-sm">
                        {(m.user.name ?? "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{m.user.name}</p>
                      <p className="text-xs text-gray-400">{m.user.totalMatches} maç</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Members */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">👤 Üyeler ({regularMembers.length})</h2>
            {regularMembers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                {isMember ? "Henüz başka üye yok." : "İlk katılan siz olun!"}
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {regularMembers.slice(0, 12).map((m) => (
                  <Link
                    key={m.id}
                    href={`/profil/${m.user.id}`}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                  >
                    {m.user.avatarUrl ? (
                      <img src={m.user.avatarUrl} alt={m.user.name ?? ""} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-sm flex-shrink-0">
                        {(m.user.name ?? "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{m.user.name}</p>
                      <p className="text-xs text-gray-400">{m.user.totalMatches} maç</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {regularMembers.length > 12 && (
              <p className="text-center text-sm text-gray-400 mt-3">+{regularMembers.length - 12} daha...</p>
            )}
          </div>
          </>)}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">ℹ️ Hakkında</h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {group.sport && (
                <div className="flex items-center gap-2">
                  <span className="text-base">{group.sport.icon}</span>
                  <span>{group.sport.name}</span>
                </div>
              )}
              {group.city && (
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span>{group.city.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span>{group._count.members} üye</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{group.isPublic ? "🌍" : "🔒"}</span>
                <span>{group.isPublic ? "Herkese açık" : "Özel grup"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>
                  {new Date(group.createdAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long" })} kuruldu
                </span>
              </div>
            </div>
          </div>

          {!session && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-700 p-4 text-center">
              <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium mb-2">Bu gruba katılmak ister misin?</p>
              <Link
                href="/auth/giris"
                className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium inline-block transition"
              >
                Giriş Yap
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
