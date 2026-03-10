"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";
import StoryBubbles from "@/components/StoryBubbles";
import StoryAddModal from "@/components/StoryAddModal";
import ReactionButton from "@/components/social/ReactionButton";
import LikesModal from "@/components/social/LikesModal";
import CommentThread from "@/components/social/CommentThread";
import { UserStoryGroup, Story } from "@/types";

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
  userReaction?: string | null;
  reactions?: Record<string, number>;
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
  const [replyingTo, setReplyingTo] = useState<Record<string, any>>({}); // postId -> { id, name }

  // Story feed
  const [storyGroups, setStoryGroups] = useState<UserStoryGroup[]>([]);
  const [showStoryModal, setShowStoryModal] = useState(false);

  const fetchStories = useCallback(async () => {
    try {
      const res = await fetch("/api/stories?feed=true");
      const json = await res.json();
      if (json.success) setStoryGroups(json.groups ?? []);
    } catch { /* ignore */ }
  }, []);

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

  // Posts + Stories ilk yükleme
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
    if (status === "authenticated") { fetchPosts(); fetchStories(); }
    if (status === "unauthenticated") fetchPosts();
  }, [status, router, fetchPosts, fetchStories]);

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
    if (!newContent.trim()) {
      toast.error("Bir şeyler yaz");
      return;
    }
    setPosting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent.trim(), images: [] }),
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
        toast.success("Gönderi paylaşıldı 🎉");
      } else {
        toast.error(json.error || "Gönderi paylaşılamadı");
      }
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string, reaction: string = "like") => {
    // Optimistic
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        const wasLiked = p.liked;
        const prevReaction = p.userReaction;
        const sameReaction = wasLiked && prevReaction === reaction;
        const newReactions = { ...(p.reactions ?? {}) };

        if (sameReaction) {
          // Geri al
          newReactions[reaction] = Math.max(0, (newReactions[reaction] ?? 1) - 1);
          if (newReactions[reaction] === 0) delete newReactions[reaction];
          return {
            ...p,
            liked: false,
            userReaction: null,
            reactions: newReactions,
            _count: { ...p._count, likes: p._count.likes - 1 },
          };
        } else if (wasLiked && prevReaction && prevReaction !== reaction) {
          // Farklı reaction'a geç
          newReactions[prevReaction] = Math.max(0, (newReactions[prevReaction] ?? 1) - 1);
          if (newReactions[prevReaction] === 0) delete newReactions[prevReaction];
          newReactions[reaction] = (newReactions[reaction] ?? 0) + 1;
          return {
            ...p,
            liked: true,
            userReaction: reaction,
            reactions: newReactions,
          };
        } else {
          // Yeni beğeni
          newReactions[reaction] = (newReactions[reaction] ?? 0) + 1;
          return {
            ...p,
            liked: true,
            userReaction: reaction,
            reactions: newReactions,
            _count: { ...p._count, likes: p._count.likes + 1 },
          };
        }
      })
    );
    try {
      await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      });
    } catch {
      // Refresh on error
      fetchPosts();
    }
  };

  const toggleComments = async (postId: string | null) => {
    if (!postId) {
      // Refresh logic call
      return;
    }
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
    const parent = replyingTo[postId];
    setSubmittingComment(postId);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: text,
          parentId: parent?.id || null 
        }),
      });
      const json = await res.json();
      if (res.ok) {
        const newComment = { ...(json.comment || json), likedByMe: false, _count: { likes: 0, replies: 0 }, replies: [] };
        if (parent) {
          setComments(prev => {
            const list = prev[postId] || [];
            const addReply = (nodes: any[]): any[] =>
              nodes.map(n => {
                if (n.id === parent.id) {
                  return { ...n, replies: [...(n.replies || []), newComment], _count: { ...n._count, replies: (n._count?.replies ?? 0) + 1 } };
                }
                if (n.replies?.length > 0) return { ...n, replies: addReply(n.replies) };
                return n;
              });
            return { ...prev, [postId]: addReply(list) };
          });
        } else {
          setComments((p) => ({ ...p, [postId]: [...(p[postId] ?? []), newComment] }));
        }
        setCommentText((p) => ({ ...p, [postId]: "" }));
        setReplyingTo(p => { const next = { ...p }; delete next[postId]; return next; });
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, _count: { ...p._count, comments: p._count.comments + 1 } } : p
          )
        );
      } else {
        const msg = typeof json.error === "string" ? json.error : "Yorum eklenemedi";
        toast.error(msg);
      }
    } finally {
      setSubmittingComment(null);
    }
  };

  const handleCommentLike = useCallback(async (postId: string, commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, { method: "POST" });
      const json = await res.json();
      if (typeof json.likeCount === "number") {
        setComments(prev => {
          const updateLike = (nodes: any[]): any[] =>
            nodes.map(n => {
              if (n.id === commentId) {
                return { ...n, _count: { ...n._count, likes: json.likeCount }, likedByMe: json.liked };
              }
              if (n.replies?.length > 0) return { ...n, replies: updateLike(n.replies) };
              return n;
            });
          return { ...prev, [postId]: updateLike(prev[postId] ?? []) };
        });
      }
    } catch { /* ignore */ }
  }, []);

  if (status === "loading" || loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Skeleton post cards */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 skeleton rounded-full" />
              <div className="flex-1">
                <div className="h-4 skeleton rounded w-28 mb-1.5" />
                <div className="h-3 skeleton rounded w-20" />
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="h-3 skeleton rounded w-full" />
              <div className="h-3 skeleton rounded w-4/5" />
              <div className="h-3 skeleton rounded w-2/3" />
            </div>
            <div className="flex gap-4 pt-3 border-t border-gray-50 dark:border-gray-700">
              <div className="h-5 skeleton rounded w-12" />
              <div className="h-5 skeleton rounded w-12" />
            </div>
          </div>
        ))}
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

      {/* Story Bandı */}
      {(storyGroups.length > 0 || session) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 px-4 py-3 mb-4">
          <StoryBubbles
            groups={storyGroups}
            showAddButton={!!session}
            onAddStory={() => setShowStoryModal(true)}
          />
        </div>
      )}

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
            {/* Image previews removed — text-only posts */}
            <div className="flex items-center justify-end mt-2">
              <button
                onClick={handlePost}
                disabled={posting || !newContent.trim()}
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
        <div className="space-y-4 stagger-fade">
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
              onComment={(postId) => handleComment(postId)}
              onDeletePost={(postId) => setPosts((p) => p.filter((x) => x.id !== postId))}
              replyingToGlobal={replyingTo[post.id]}
              setReplyingToGlobal={(p) => setReplyingTo(prev => ({ ...prev, [post.id]: p }))}
              onCommentLike={(pId, cId) => handleCommentLike(pId, cId)}
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

      {/* Story Ekleme Modalı */}
      {showStoryModal && (
        <StoryAddModal
          onClose={() => setShowStoryModal(false)}
          onCreated={(_story: Story) => {
            fetchStories();
            setShowStoryModal(false);
          }}
        />
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
  replyingToGlobal,
  setReplyingToGlobal,
  onCommentLike,
}: {
  post: Post;
  sessionUserId?: string;
  expandedComments: Set<string>;
  comments: Record<string, any[]>;
  commentText: Record<string, string>;
  commentsLoading: Record<string, boolean>;
  submittingComment: string | null;
  onLike: (id: string, reaction?: string) => void;
  onToggleComments: (id: string | null) => void;
  onCommentChange: (id: string, text: string) => void;
  onComment: (id: string) => void;
  onDeletePost: (id: string) => void;
  replyingToGlobal: any;
  setReplyingToGlobal: (p: any) => void;
  onCommentLike: (postId: string, commentId: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likesList, setLikesList] = useState<any[]>([]);
  const [likesLoading, setLikesLoading] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);

  const currentReply = replyingToGlobal;
  const setReply = setReplyingToGlobal;

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

  const loadLikesList = async () => {
    setLikesLoading(true);
    setShowLikesModal(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/likes`);
      const json = await res.json();
      if (json.success) setLikesList(json.data);
    } catch { /* ignore */ }
    finally { setLikesLoading(false); }
  };

  // Comment like is handled by parent via onCommentLike prop

  const isOwn = post.user.id === sessionUserId;

  return (
    <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Likes Modal */}
      {showLikesModal && (
        <LikesModal likes={likesList} loading={likesLoading} onClose={() => setShowLikesModal(false)} />
      )}

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
          <Link href={`/posts/${post.id}`} className="text-xs text-gray-400 dark:text-gray-500 hover:underline">
            {format(new Date(post.createdAt), "d MMM yyyy, HH:mm", { locale: tr })}
          </Link>
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
        <div className="px-4 pb-3">
            <Link href={`/posts/${post.id}`} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap block hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors p-1 rounded-lg">
                {post.content}
            </Link>
        </div>
      )}

      {/* Görseller */}
      {post.images.length > 0 && (
        <Link href={`/posts/${post.id}`} className={`grid gap-1 ${post.images.length === 1 ? "grid-cols-1" : post.images.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {post.images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt=""
              className="w-full aspect-square object-cover"
            />
          ))}
        </Link>
      )}

      {/* Aksiyonlar */}
      <div className="px-4 py-3 flex items-center gap-4 border-t border-gray-50 dark:border-gray-700">
        <ReactionButton
          liked={post.liked}
          userReaction={post.userReaction ?? null}
          reactions={post.reactions ?? {}}
          totalLikes={post._count.likes}
          onReact={(reaction) => onLike(post.id, reaction)}
          onShowLikes={loadLikesList}
        />
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
            ) : (() => {
              const allComments = comments[post.id] ?? [];
              const SHOW_LIMIT = 3;
              const visible = showAllComments ? allComments : allComments.slice(0, SHOW_LIMIT);
              const remaining = allComments.length - SHOW_LIMIT;
              return (
                <div className="space-y-1">
                  {!showAllComments && remaining > 0 && (
                    <button
                      onClick={() => setShowAllComments(true)}
                      className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition mb-1"
                    >
                      ↩ Diğer {remaining} yorumu gör
                    </button>
                  )}
                  {visible.map((c: any) => (
                    <CommentThread
                      key={c.id}
                      comment={c}
                      postId={post.id}
                      onLike={(cId) => onCommentLike(post.id, cId)}
                      onReply={(p: any) => {
                        setReply(p);
                        const el = document.getElementById(`comment-input-${post.id}`);
                        el?.focus();
                      }}
                    />
                  ))}
                  {showAllComments && allComments.length > SHOW_LIMIT && (
                    <button
                      onClick={() => setShowAllComments(false)}
                      className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition mt-1"
                    >
                      Yorumları gizle ↑
                    </button>
                  )}
                </div>
              );
            })()
          )}
          {/* Yorum gir */}
          <div className="mt-2">
            {currentReply && (
              <div className="flex items-center justify-between px-2 py-1 mb-1 bg-gray-50 dark:bg-gray-700/30 rounded text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <span><b>{currentReply.name}</b> kişisine yanıt veriliyor...</span>
                <button onClick={() => setReply(null)} className="hover:underline">Vazgeç</button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                id={`comment-input-${post.id}`}
                type="text"
                placeholder={currentReply ? "Yanıt yaz..." : "Yorum yaz..."}
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
                {submittingComment === post.id ? "..." : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

