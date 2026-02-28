"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";

interface PostUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface Post {
  id: string;
  content?: string | null;
  images: string[];
  createdAt: string;
  liked: boolean;
  user: PostUser;
  _count: { likes: number; comments: number };
}

export default function SosyalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Post oluşturma
  const [newContent, setNewContent] = useState("");
  const [newImages, setNewImages] = useState<string[]>([]);
  const [posting, setPosting] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Yorum genişletme
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});

  const fetchPosts = useCallback(async (cursor?: string) => {
    try {
      const url = cursor ? `/api/posts?cursor=${cursor}&limit=10` : `/api/posts?limit=10`;
      const res = await fetch(url);
      const json = await res.json();
      if (cursor) {
        setPosts((prev) => [...prev, ...(json.posts ?? [])]);
      } else {
        setPosts(json.posts ?? []);
      }
      setNextCursor(json.nextCursor ?? null);
    } catch {
      toast.error("Gönderiler yüklenemedi");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // IntersectionObserver ile sonsuz kaydırma
  useEffect(() => {
    if (!nextCursor || loadingMore) return;
    const node = loadMoreRef.current;
    if (!node) return;
    const observer = new window.IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLoadingMore(true);
          fetchPosts(nextCursor);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [nextCursor, loadingMore, fetchPosts]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/giris");
    if (status === "authenticated") fetchPosts();
  }, [status, router, fetchPosts]);

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("type", "post");
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) setNewImages((p) => [...p, json.url]);
      else toast.error(json.error || "Görsel yüklenemedi");
    } finally {
      setUploadingImg(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handlePost = async () => {
    if (!newContent.trim() && newImages.length === 0) {
      toast.error("Bir şey yaz veya görsel ekle");
      return;
    }
    setPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent.trim() || undefined, images: newImages }),
      });
      const json = await res.json();
      if (res.ok) {
        setPosts((p) => [
          {
            ...json,
            liked: false,
            _count: { likes: 0, comments: 0 },
            user: {
              id: session?.user?.id ?? "",
              name: session?.user?.name ?? "",
              avatarUrl: (session?.user as any)?.avatarUrl ?? null,
            },
          },
          ...p,
        ]);
        setNewContent("");
        setNewImages([]);
        toast.success("Gönderi paylaşıldı 🎉");
      } else {
        toast.error(json.error || "Gönderi paylaşılamadı");
      }
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    // Optimistic
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              liked: !p.liked,
              _count: { ...p._count, likes: p.liked ? p._count.likes - 1 : p._count.likes + 1 },
            }
          : p
      )
    );
    try {
      await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    } catch {
      // Revert on error
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? {
                ...p,
                liked: !p.liked,
                _count: { ...p._count, likes: p.liked ? p._count.likes - 1 : p._count.likes + 1 },
              }
            : p
        )
      );
    }
  };

  const toggleComments = async (postId: string) => {
    const newSet = new Set(expandedComments);
    if (newSet.has(postId)) {
      newSet.delete(postId);
      setExpandedComments(newSet);
      return;
    }
    newSet.add(postId);
    setExpandedComments(newSet);

    if (!comments[postId]) {
      setCommentsLoading((p) => ({ ...p, [postId]: true }));
      try {
        const res = await fetch(`/api/posts/${postId}/comments`);
        const json = await res.json();
        // API may return array directly or { comments: [...] }
        const arr = Array.isArray(json) ? json : (json.comments ?? []);
        setComments((p) => ({ ...p, [postId]: arr }));
      } catch {
        //
      } finally {
        setCommentsLoading((p) => ({ ...p, [postId]: false }));
      }
    }
  };

  const handleComment = async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) return;
    setSubmittingComment(postId);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const json = await res.json();
      if (res.ok) {
        setComments((p) => ({ ...p, [postId]: [...(p[postId] ?? []), json] }));
        setCommentText((p) => ({ ...p, [postId]: "" }));
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } }
              : p
          )
        );
      } else {
        toast.error(json.error || "Yorum eklenemedi");
      }
    } finally {
      setSubmittingComment(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Başlık */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sosyal Akış</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Takip ettiklerinin ve senin paylaşımların
          </p>
        </div>
        <Link
          href="/profil"
          className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
        >
          Profilim →
        </Link>
      </div>

      {/* Gönderi Oluştur */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 mb-6">
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-base font-bold text-emerald-700 dark:text-emerald-300 shrink-0 overflow-hidden">
            {(session?.user as any)?.avatarUrl ? (
              <img src={(session?.user as any).avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              session?.user?.name?.charAt(0)?.toUpperCase() ?? "?"
            )}
          </div>
          <div className="flex-1">
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Antrenmanını, başarını veya motivasyonunu paylaş..."
              rows={3}
              maxLength={1000}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
            {/* Önizleme görseller */}
            {newImages.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {newImages.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
                    <button
                      onClick={() => setNewImages((p) => p.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingImg || newImages.length >= 4}
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition flex items-center gap-1 disabled:opacity-40"
                >
                  {uploadingImg ? "⏳" : "📷"} Görsel
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
              </div>
              <button
                onClick={handlePost}
                disabled={posting || (!newContent.trim() && newImages.length === 0)}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition"
              >
                {posting ? "Paylaşılıyor..." : "Paylaş"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      {posts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
          <p className="text-4xl mb-3">🏃</p>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Henüz gönderi yok</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Sporcu takip et veya ilk gönderiyi kendin paylaş!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              sessionUserId={session?.user?.id}
              expandedComments={expandedComments}
              comments={comments}
              commentText={commentText}
              commentsLoading={commentsLoading}
              submittingComment={submittingComment}
              onLike={handleLike}
              onToggleComments={toggleComments}
              onCommentChange={(postId, text) => setCommentText((p) => ({ ...p, [postId]: text }))}
              onComment={handleComment}
              onDeletePost={(postId) => setPosts((p) => p.filter((x) => x.id !== postId))}
            />
          ))}

          {nextCursor && (
            <div ref={loadMoreRef} className="w-full flex justify-center py-4">
              <span className="text-emerald-600 dark:text-emerald-400 text-sm animate-pulse">
                {loadingMore ? "Yükleniyor..." : "Daha fazla yükleniyor..."}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Post Kartı Bileşeni ───────────────────────────────────────────────────────
function PostCard({
  post,
  sessionUserId,
  expandedComments,
  comments,
  commentText,
  commentsLoading,
  submittingComment,
  onLike,
  onToggleComments,
  onCommentChange,
  onComment,
  onDeletePost,
}: {
  post: Post;
  sessionUserId?: string;
  expandedComments: Set<string>;
  comments: Record<string, any[]>;
  commentText: Record<string, string>;
  commentsLoading: Record<string, boolean>;
  submittingComment: string | null;
  onLike: (id: string) => void;
  onToggleComments: (id: string) => void;
  onCommentChange: (id: string, text: string) => void;
  onComment: (id: string) => void;
  onDeletePost: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Gönderiyi silmek istiyor musun?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
      if (res.ok) {
        onDeletePost(post.id);
        toast.success("Gönderi silindi");
      } else {
        toast.error("Silinemedi");
      }
    } finally {
      setDeleting(false);
    }
  };

  const isOwn = post.user.id === sessionUserId;

  return (
    <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Gönderi başlık */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <Link href={`/profil/${post.user.id}`}>
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center font-bold text-emerald-700 dark:text-emerald-300 text-sm overflow-hidden shrink-0">
            {post.user.avatarUrl ? (
              <img src={post.user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              post.user.name?.charAt(0)?.toUpperCase()
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profil/${post.user.id}`} className="font-semibold text-sm text-gray-800 dark:text-gray-100 hover:text-emerald-600 dark:hover:text-emerald-400 transition">
            {post.user.name}
          </Link>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {format(new Date(post.createdAt), "d MMM yyyy, HH:mm", { locale: tr })}
          </p>
        </div>
        {isOwn && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition text-sm disabled:opacity-40"
            title="Sil"
          >
            🗑️
          </button>
        )}
      </div>

      {/* İçerik */}
      {post.content && (
        <p className="px-4 pb-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Görseller */}
      {post.images.length > 0 && (
        <div className={`grid gap-1 ${post.images.length === 1 ? "grid-cols-1" : post.images.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {post.images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              className="w-full aspect-square object-cover"
            />
          ))}
        </div>
      )}

      {/* Aksiyonlar */}
      <div className="px-4 py-3 flex items-center gap-4 border-t border-gray-50 dark:border-gray-700">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-1.5 text-sm font-medium transition ${
            post.liked
              ? "text-rose-500 dark:text-rose-400"
              : "text-gray-400 dark:text-gray-500 hover:text-rose-400 dark:hover:text-rose-400"
          }`}
        >
          {post.liked ? "❤️" : "🤍"} {post._count.likes}
        </button>
        <button
          onClick={() => onToggleComments(post.id)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition"
        >
          💬 {post._count.comments}
        </button>
      </div>

      {/* Yorumlar */}
      {expandedComments.has(post.id) && (
        <div className="px-4 pb-4 border-t border-gray-50 dark:border-gray-700 pt-3 space-y-3">
          {commentsLoading[post.id] ? (
            <div className="flex justify-center py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500" />
            </div>
          ) : (
            (comments[post.id] ?? []).length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-1">Henüz yorum yok. İlk yorumu sen yap!</p>
            ) : (
              (comments[post.id] ?? []).map((c: any) => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-400 shrink-0 overflow-hidden">
                    {c.user?.avatarUrl ? (
                      <img src={c.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      c.user?.name?.charAt(0)?.toUpperCase()
                    )}
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-xl px-3 py-2 flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">{c.user?.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))
            )
          )}
          {/* Yorum gir */}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="Yorum yaz..."
              value={commentText[post.id] ?? ""}
              onChange={(e) => onCommentChange(post.id, e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && onComment(post.id)}
              maxLength={300}
              className="flex-1 text-sm px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-gray-200 placeholder:text-gray-400"
            />
            <button
              onClick={() => onComment(post.id)}
              disabled={!commentText[post.id]?.trim() || submittingComment === post.id}
              className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-semibold disabled:opacity-40 transition"
            >
              {submittingComment === post.id ? "..." : "↩"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
