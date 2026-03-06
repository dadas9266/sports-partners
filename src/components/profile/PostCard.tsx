"use client";

import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Button from "@/components/ui/Button";

interface PostCardProps {
  post: any;
  onLikeToggle?: (id: string, liked: boolean, count: number) => void;
}

export default function PostCard({ post, onLikeToggle }: PostCardProps) {
  const [toggling, setToggling] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likesList, setLikesList] = useState<any[]>([]);
  const [likesLoading, setLikesLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<any[]>(post.comments ?? []);
  const [commentCount, setCommentCount] = useState(post._count?.comments ?? 0);
  const [addingComment, setAddingComment] = useState(false);
  const [likedByMe, setLikedByMe] = useState(post.likedByMe || post.liked);
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);

  const handleLike = async () => {
    if (toggling) return;
    setToggling(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { 
        method: "POST",
        body: JSON.stringify({ reaction: "like" })
      });
      const json = await res.json();
      setLikedByMe(json.liked);
      setLikeCount(json.likeCount);
      if (onLikeToggle) onLikeToggle(post.id, json.liked, json.likeCount);
    } finally {
      setToggling(false);
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

  const handleCommentLike = async (commentId: string) => {
    try {
      const res = await fetch(`/api/comments/${commentId}/like`, { method: "POST" });
      const json = await res.json();
      if (json.likeCount !== undefined) {
        setComments(prev => prev.map(c => 
          c.id === commentId ? { ...c, likedByMe: json.liked, _count: { ...c._count, likes: json.likeCount } } : c
        ));
      }
    } catch { /* ignore */ }
  };

  const loadComments = async () => {
    const res = await fetch(`/api/posts/${post.id}/comments`);
    const json = await res.json();
    if (Array.isArray(json.comments)) setComments(json.comments);
  };

  const handleToggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && comments.length === 0) loadComments();
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setAddingComment(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const json = await res.json();
      if (json.comment) {
        setComments((prev) => [...prev, json.comment]);
        setCommentCount((n: number) => n + 1);
        setCommentText("");
      }
    } finally {
      setAddingComment(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden flex items-center justify-center text-lg">
          {post.user?.avatarUrl ? (
            <img src={post.user.avatarUrl} alt={post.user.name} className="w-full h-full object-cover" />
          ) : (
            post.user?.name?.charAt(0)?.toUpperCase() || "?"
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{post.user?.name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {format(new Date(post.createdAt), "d MMM yyyy, HH:mm", { locale: tr })}
          </p>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <p className="text-gray-800 dark:text-gray-100 text-sm whitespace-pre-wrap mb-3">{post.content}</p>
      )}

      {/* Images */}
      {post.images?.length > 0 && (
        <div className={`grid gap-1.5 mb-3 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {post.images.slice(0, 4).map((url: string, i: number) => (
            <img key={i} src={url} alt="" className="w-full h-48 object-cover rounded-lg" />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center">
          <button
            onClick={handleLike}
            disabled={toggling}
            className={`flex items-center gap-1.5 text-sm transition py-1 pr-2 ${
              likedByMe ? "text-red-500 font-semibold" : "text-gray-500 dark:text-gray-400 hover:text-red-500"
            }`}
          >
            {likedByMe ? "❤️" : "🤍"}
          </button>
          <button 
            onClick={loadLikesList}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium"
          >
            {likeCount}
          </button>
        </div>
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
        >
          💬 {commentCount}
        </button>
      </div>

      {/* Likes Modal */}
      {showLikesModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowLikesModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="px-4 py-3 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">Beğenenler</h3>
              <button onClick={() => setShowLikesModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {likesLoading ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
              ) : likesList.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">Henüz kimse beğenmedi.</p>
              ) : (
                likesList.map((like, idx) => (
                  <Link key={idx} href={`/profil/${like.user.id}`} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition" onClick={() => setShowLikesModal(false)}>
                    <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 overflow-hidden flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
                      {like.user.avatarUrl ? <img src={like.user.avatarUrl} className="w-full h-full object-cover" /> : like.user.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{like.user.name}</p>
                      {like.user.city && <p className="text-[10px] text-gray-400">{like.user.city.name}</p>}
                    </div>
                    <span className="text-lg">{like.reaction === "like" ? "❤️" : "🔥"}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comments */}
      {showComments && (
        <div className="mt-3 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
                {c.user?.avatarUrl ? (
                  <img src={c.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                    {c.user?.name?.charAt(0) || "?"}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg relative group">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-gray-700 dark:text-gray-200 text-xs">{c.user?.name}</span>
                    <button 
                      onClick={() => handleCommentLike(c.id)}
                      className={`text-[10px] ${c.likedByMe ? "text-red-500" : "text-gray-400 hover:text-red-500"}`}
                    >
                      {c.likedByMe ? "❤️" : "🤍"} {c._count?.likes || 0}
                    </button>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">{c.content}</p>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 pl-1">
                  {format(new Date(c.createdAt), "d MMM, HH:mm", { locale: tr })}
                </p>
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
              placeholder="Yorum yaz..."
              className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-transparent text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Button
              size="sm"
              onClick={handleAddComment}
              loading={addingComment}
              disabled={!commentText.trim()}
            >
              Gönder
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
