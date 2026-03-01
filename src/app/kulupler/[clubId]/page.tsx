"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

interface ClubDetail {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  isPrivate: boolean;
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

export default function ClubVitrinPage() {
    const [liking, setLiking] = useState<Record<string, boolean>>({});
    const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const clubId = (params?.clubId ?? "") as string;

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [myMembership, setMyMembership] = useState<{ id: string; role: string; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "posts">("members");
  const [posts, setPosts] = useState<{ id: string; content: string | null; images: string[]; createdAt: string; user: { id: string; name: string | null; avatarUrl: string | null }; _count: { likes: number; comments: number } }[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [submittingPost, setSubmittingPost] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
    const [openComments, setOpenComments] = useState<string | null>(null);
    const [comments, setComments] = useState<Record<string, any[]>>({});
    const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
    const [commentLoading, setCommentLoading] = useState<Record<string, boolean>>({});

  const fetchClub = useCallback(async () => {
    try {
      const res = await fetch(`/api/clubs/${clubId}`);
      const json = await res.json();
      if (json.success) setClub(json.data);
      else { toast.error("Kulüp bulunamadı"); router.push("/kulupler"); }
    } catch { toast.error("Yüklenemedi"); }
  }, [clubId, router]);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/clubs/${clubId}/members?status=APPROVED`);
      const json = await res.json();
      if (json.success) {
        setMembers(json.members ?? []);
        if (session?.user?.id) {
          const mine = (json.members ?? []).find((m: Member) => m.user.id === session.user?.id);
          setMyMembership(mine ? { id: mine.id, role: mine.role, status: mine.status } : null);
        }
      }
    } catch { /* ignore */ }
  }, [clubId, session]);

  // Also check PENDING membership
  const checkPending = useCallback(async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch(`/api/clubs/${clubId}/members?status=PENDING`);
      const json = await res.json();
      if (json.success) {
        const mine = (json.members ?? []).find((m: Member) => m.user.id === session.user?.id);
        if (mine) setMyMembership({ id: mine.id, role: mine.role, status: "PENDING" });
      }
    } catch { /* ignore */ }
  }, [clubId, session]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchClub(), fetchMembers()]);
      await checkPending();
      setLoading(false);
    };
    load();
  }, [fetchClub, fetchMembers, checkPending]);

  useEffect(() => {
    if (activeTab !== "posts") return;
    setPostsLoading(true);
    fetch(`/api/posts?clubId=${clubId}`)
      .then(r => r.json())
      .then(json => { if (Array.isArray(json.posts)) setPosts(json.posts); })
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [activeTab, clubId]);

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setSubmittingPost(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPost, clubId }),
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("type", "post");
      fd.append("file", file);
      fd.append("resourceId", clubId);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.url) { toast.error(uploadJson.error ?? "Yükleme başarısız"); return; }
      const patchRes = await fetch(`/api/clubs/${clubId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: uploadJson.url }),
      });
      const patchJson = await patchRes.json();
      if (patchJson.success) {
        setClub(prev => prev ? { ...prev, logoUrl: uploadJson.url } : prev);
        toast.success("Kulüp fotoğrafı güncellendi!");
      } else {
        toast.error(patchJson.error ?? "Güncellenemedi");
      }
    } catch { toast.error("Sunucu hatası"); }
    finally { setUploadingLogo(false); e.target.value = ""; }
  };

  const handleJoin = async () => {
    if (!session) { router.push("/auth/giris"); return; }
    setJoining(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/members`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "İşlem başarısız"); return; }
      toast.success(json.message ?? "Katıldınız!");
      await fetchMembers();
      await checkPending();
    } catch { toast.error("Sunucu hatası"); }
    finally { setJoining(false); }
  };

  const handleLeave = async () => {
    if (!confirm("Kulüpten ayrılmak istediğinize emin misiniz?")) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/clubs/${clubId}/members`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "İşlem başarısız"); return; }
      toast.success("Kulüpten ayrıldınız");
      setMyMembership(null);
      await fetchMembers();
    } catch { toast.error("Sunucu hatası"); }
    finally { setJoining(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!club) return null;

  const isCapt = myMembership?.role === "CAPTAIN" && myMembership?.status === "APPROVED";
  const isMember = myMembership?.status === "APPROVED";
  const isPending = myMembership?.status === "PENDING";
  const captains = members.filter((m) => m.role === "CAPTAIN");
  const regularMembers = members.filter((m) => m.role !== "CAPTAIN");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero / Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-800 dark:to-teal-900">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <button
            onClick={() => router.push("/kulupler")}
            className="text-emerald-200 hover:text-white text-sm mb-4 flex items-center gap-1 transition"
          >
            ← Tüm Kulüpler
          </button>
          <div className="flex items-start gap-5">
            {/* Logo */}
            <div className="relative w-20 h-20 flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center text-4xl shadow-lg overflow-hidden">
                {club.logoUrl ? (
                  <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                ) : (
                  club.sport?.icon ?? "🏅"
                )}
              </div>
              {isCapt && (
                <label className="absolute inset-0 rounded-2xl cursor-pointer flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                  <input type="file" accept="image/*" hidden onChange={handleLogoUpload} disabled={uploadingLogo} />
                  <span className="text-white text-xs font-semibold">{uploadingLogo ? "⏳" : "📷"}</span>
                </label>
              )}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{club.name}</h1>
                {club.isPrivate && (
                  <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">🔒 Özel</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 text-emerald-100 text-sm flex-wrap">
                {club.sport && <span>{club.sport.icon} {club.sport.name}</span>}
                {club.city && <span>📍 {club.city.name}</span>}
                <span>👥 {club._count.members} üye</span>
              </div>
              {club.description && (
                <p className="text-emerald-50 text-sm mt-2 line-clamp-2">{club.description}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 flex-wrap">
            {session ? (
              <>
                {isCapt && (
                  <Link
                    href={`/kulup-yonet/${clubId}`}
                    className="bg-white text-emerald-700 font-semibold px-4 py-2 rounded-lg text-sm hover:bg-emerald-50 transition shadow"
                  >
                    ⚙️ Yönet
                  </Link>
                )}
                {isMember && !isCapt && (
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
                    className="bg-white text-emerald-700 font-semibold px-5 py-2 rounded-lg text-sm hover:bg-emerald-50 transition shadow disabled:opacity-60"
                  >
                    {joining ? "..." : club.isPrivate ? "🔒 Başvur" : "Katıl"}
                  </button>
                )}
                {club.website && (
                  <a
                    href={club.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
                  >
                    🌐 Web Sitesi
                  </a>
                )}
              </>
            ) : (
              <Link
                href="/auth/giris"
                className="bg-white text-emerald-700 font-semibold px-5 py-2 rounded-lg text-sm hover:bg-emerald-50 transition shadow"
              >
                Katılmak için Giriş Yap
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left: Members / Posts */}
        <div className="md:col-span-2 space-y-6">

          {/* Tab Navigation */}
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("members")}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${activeTab === "members" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}
            >
              👥 Üyeler
            </button>
            <button
              onClick={() => setActiveTab("posts")}
              className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px ${activeTab === "posts" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700"}`}
            >
              📸 Gönderiler
            </button>
          </div>

          {activeTab === "posts" && (
            <div className="space-y-4">
              {/* New Post Input (members only) */}
              {isMember && (
                <form onSubmit={handlePostSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                  <textarea
                    value={newPost}
                    onChange={e => setNewPost(e.target.value)}
                    placeholder="Kulüp üyeleriyle bir şey paylaş…"
                    rows={3}
                    className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={submittingPost || !newPost.trim()}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition"
                    >
                      {submittingPost ? "Paylaşılıyor…" : "Paylaş"}
                    </button>
                  </div>
                </form>
              )}
              {postsLoading && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!postsLoading && posts.length === 0 && (
                <p className="text-center text-gray-400 dark:text-gray-500 py-8">Henüz gönderi yok.</p>
              )}
              {posts.map(post => (
                <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    {post.user.avatarUrl
                      ? <img src={post.user.avatarUrl} alt={post.user.name ?? ""} className="w-9 h-9 rounded-full object-cover" />
                      : <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-700 font-bold text-sm">{(post.user.name ?? "?")[0]}</div>
                    }
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{post.user.name}</p>
                      <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleDateString("tr-TR")}</p>
                    </div>
                  </div>
                  {post.content && <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">{post.content}</p>}
                  {post.images.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      {post.images.slice(0, 4).map((img, i) => (
                        <img key={i} src={img} alt="" className="rounded-lg object-cover w-full aspect-square" />
                      ))}
                    </div>
                  )}
                  {/* Medya ekleme: sadece post sahibi */}
                  {session?.user?.id === post.user.id && (
                    <form
                      className="flex gap-2 mt-2"
                      onSubmit={async e => {
                        e.preventDefault();
                        const input = e.currentTarget.elements.namedItem("mediaUrl") as HTMLInputElement | null;
                        const url = input?.value?.trim();
                        if (!url) return;
                        const res = await fetch(`/api/posts/${post.id}/media`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ url }),
                        });
                        const json = await res.json();
                        if (json.success) {
                          setPosts(ps => ps.map(p => p.id === post.id ? { ...p, images: [...p.images, url] } : p));
                          toast.success("Medya eklendi!");
                        } else {
                          toast.error(json.error ?? "Medya eklenemedi");
                        }
                        e.currentTarget.reset();
                      }}
                    >
                      <input
                        type="url"
                        name="mediaUrl"
                        placeholder="Fotoğraf/video URL ekle..."
                        className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-900"
                        required
                      />
                      <button
                        type="submit"
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg"
                      >Ekle</button>
                    </form>
                  )}
                  <div className="flex gap-4 mt-3 text-xs text-gray-400 items-center">
                    <button
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition ${likedPosts[post.id] ? "bg-emerald-100 text-emerald-700" : "hover:bg-gray-100"}`}
                      disabled={liking[post.id]}
                      onClick={async () => {
                        setLiking(l => ({ ...l, [post.id]: true }));
                        const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
                        const json = await res.json();
                        setLikedPosts(lp => ({ ...lp, [post.id]: json.liked }));
                        setPosts(ps => ps.map(p => p.id === post.id ? { ...p, _count: { ...p._count, likes: json.liked ? p._count.likes + 1 : p._count.likes - 1 } } : p));
                        setLiking(l => ({ ...l, [post.id]: false }));
                      }}
                    >
                      <span>{likedPosts[post.id] ? "❤️" : "🤍"}</span>
                      <span>{post._count.likes}</span>
                    </button>
                    <button
                      className="text-xs text-gray-400 hover:text-emerald-600 transition"
                      onClick={() => {
                        if (openComments === post.id) setOpenComments(null);
                        else {
                          setOpenComments(post.id);
                          if (!comments[post.id]) {
                            setCommentLoading(c => ({ ...c, [post.id]: true }));
                            fetch(`/api/posts/${post.id}/comments`)
                              .then(r => r.json())
                              .then(json => {
                                setComments(c => ({ ...c, [post.id]: json.comments ?? [] }));
                              })
                              .finally(() => setCommentLoading(c => ({ ...c, [post.id]: false })));
                          }
                        }
                      }}
                    >
                      💬 {post._count.comments} Yorum
                    </button>
                  </div>
                  {/* Yorumlar alanı */}
                  {openComments === post.id && (
                    <div className="mt-4 border-t pt-3">
                      {commentLoading[post.id] ? (
                        <div className="text-center text-gray-400">Yorumlar yükleniyor...</div>
                      ) : (
                        <>
                          {comments[post.id]?.length === 0 && (
                            <div className="text-gray-400 text-sm">Henüz yorum yok.</div>
                          )}
                          {comments[post.id]?.map((c, i) => (
                            <div key={c.id ?? i} className="flex items-start gap-2 mb-2">
                              {c.user?.avatarUrl ? (
                                <img src={c.user.avatarUrl} alt={c.user.name ?? ""} className="w-7 h-7 rounded-full object-cover" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-700 font-bold text-xs">{(c.user?.name ?? "?")[0]}</div>
                              )}
                              <div>
                                <p className="text-xs font-medium text-gray-800 dark:text-gray-100">{c.user?.name}</p>
                                <p className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleDateString("tr-TR")}</p>
                                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{c.content}</p>
                              </div>
                            </div>
                          ))}
                          {isMember && (
                            <form
                              onSubmit={async e => {
                                e.preventDefault();
                                const val = commentInputs[post.id]?.trim();
                                if (!val) return;
                                setCommentLoading(c => ({ ...c, [post.id]: true }));
                                const res = await fetch(`/api/posts/${post.id}/comments`, {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ content: val }),
                                });
                                const json = await res.json();
                                if (json.comment) {
                                  setComments(c => ({ ...c, [post.id]: [...(c[post.id] ?? []), json.comment] }));
                                  setCommentInputs(inp => ({ ...inp, [post.id]: "" }));
                                }
                                setCommentLoading(c => ({ ...c, [post.id]: false }));
                              }}
                              className="flex gap-2 mt-2"
                            >
                              <input
                                type="text"
                                value={commentInputs[post.id] ?? ""}
                                onChange={e => setCommentInputs(inp => ({ ...inp, [post.id]: e.target.value }))}
                                placeholder="Yorum ekle..."
                                className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm bg-gray-50 dark:bg-gray-900"
                              />
                              <button
                                type="submit"
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg"
                                disabled={commentLoading[post.id] || !(commentInputs[post.id]?.trim())}
                              >Gönder</button>
                            </form>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === "members" && (<>
          {captains.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                👑 Kaptan{captains.length > 1 ? "lar" : ""}
              </h2>
              <div className="flex flex-wrap gap-3">
                {captains.map((m) => (
                  <Link
                    key={m.id}
                    href={`/profil/${m.user.id}`}
                    className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl px-3 py-2 hover:shadow-md transition"
                  >
                    {m.user.avatarUrl ? (
                      <img src={m.user.avatarUrl} alt={m.user.name ?? ""} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-sm">
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

          {/* Members Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">
              👥 Üyeler ({regularMembers.length})
            </h2>
            {regularMembers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                {isMember ? "Henüz başka üye yok." : club.isPrivate ? "Üyelere katılın." : "İlk katılan siz olun!"}
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
                      <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-sm flex-shrink-0">
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

        {/* Right: Info sidebar */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">ℹ️ Hakkında</h2>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {club.sport && (
                <div className="flex items-center gap-2">
                  <span className="text-base">{club.sport.icon}</span>
                  <span>{club.sport.name}</span>
                </div>
              )}
              {club.city && (
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span>{club.city.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span>👥</span>
                <span>{club._count.members} üye</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{club.isPrivate ? "🔒" : "🌍"}</span>
                <span>{club.isPrivate ? "Özel kulüp" : "Herkese açık"}</span>
              </div>
              {club.website && (
                <div className="flex items-center gap-2">
                  <span>🔗</span>
                  <a href={club.website} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 hover:underline truncate">
                    Web sitesi
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span>📅</span>
                <span>
                  {new Date(club.createdAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long" })} kuruldu
                </span>
              </div>
            </div>
          </div>

          {/* Join CTA for guests */}
          {!session && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700 p-4 text-center">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium mb-2">
                Bu kulübe katılmak ister misin?
              </p>
              <Link
                href="/auth/giris"
                className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium inline-block transition"
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
