"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Button from "@/components/ui/Button";
import ReactionButton from "@/components/social/ReactionButton";
import LikesModal from "@/components/social/LikesModal";
import CommentThread from "@/components/social/CommentThread";

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
  const [userReaction, setUserReaction] = useState<string | null>(post.userReaction ?? (post.liked ? "like" : null));
  const [reactions, setReactions] = useState<Record<string, number>>(post.reactions ?? {});
  const [replyingTo, setReplyingTo] = useState<any>(null); // { id: string, name: string }

  const handleReact = async (reaction: string) => {
    if (toggling) return;
    setToggling(true);
    // Optimistic update
    const wasLiked = likedByMe;
    const prevReaction = userReaction;
    const sameReaction = wasLiked && prevReaction === reaction;
    const newReactions = { ...reactions };

    if (sameReaction) {
      newReactions[reaction] = Math.max(0, (newReactions[reaction] ?? 1) - 1);
      if (newReactions[reaction] === 0) delete newReactions[reaction];
      setLikedByMe(false);
      setUserReaction(null);
      setReactions(newReactions);
      setLikeCount((c: number) => c - 1);
    } else if (wasLiked && prevReaction && prevReaction !== reaction) {
      newReactions[prevReaction] = Math.max(0, (newReactions[prevReaction] ?? 1) - 1);
      if (newReactions[prevReaction] === 0) delete newReactions[prevReaction];
      newReactions[reaction] = (newReactions[reaction] ?? 0) + 1;
      setUserReaction(reaction);
      setReactions(newReactions);
    } else {
      newReactions[reaction] = (newReactions[reaction] ?? 0) + 1;
      setLikedByMe(true);
      setUserReaction(reaction);
      setReactions(newReactions);
      setLikeCount((c: number) => c + 1);
    }

    try {
      const res = await fetch(`/api/posts/${post.id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      });
      const json = await res.json();
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
      
      const updateList = (list: any[]): any[] => {
        return list.map(c => {
          if (c.id === commentId) {
            return { ...c, likedByMe: json.liked, _count: { ...c._count, likes: json.likeCount } };
          }
          if (c.replies?.length > 0) {
            return { ...c, replies: updateList(c.replies) };
          }
          return c;
        });
      };
      setComments(prev => updateList(prev));
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
    if (next) loadComments();
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setAddingComment(true);
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content: commentText.trim(),
          parentId: replyingTo?.id || null
        }),
      });
      const json = await res.json();
      if (json.comment) {
        if (replyingTo) {
          setComments(prev => prev.map(c => 
            c.id === replyingTo.id ? { ...c, replies: [...(c.replies || []), json.comment] } : c
          ));
        } else {
          setComments((prev) => [...prev, json.comment]);
        }
        setCommentCount((n: number) => n + 1);
        setCommentText("");
        setReplyingTo(null);
      }
    } finally {
      setAddingComment(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <Link href={`/profil/${post.user?.id}`}>
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 overflow-hidden flex items-center justify-center text-lg">
            {post.user?.avatarUrl ? (
              <img src={post.user.avatarUrl} alt={post.user.name} className="w-full h-full object-cover" />
            ) : (
              post.user?.name?.charAt(0)?.toUpperCase() || "?"
            )}
          </div>
        </Link>
        <div>
          <Link href={`/profil/${post.user?.id}`} className="text-sm font-semibold text-gray-800 dark:text-gray-100 hover:text-emerald-500 transition">
            {post.user?.name}
          </Link>
          <Link href={`/posts/${post.id}`} className="text-xs text-gray-400 dark:text-gray-500 block hover:underline">
            {format(new Date(post.createdAt), "d MMM yyyy, HH:mm", { locale: tr })}
          </Link>
        </div>
      </div>

      {/* Content */}
      {post.content && (
        <Link href={`/posts/${post.id}`} className="text-gray-800 dark:text-gray-100 text-sm whitespace-pre-wrap mb-3 block hover:bg-gray-50 dark:hover:bg-gray-700/20 p-1 rounded transition-colors">
            {post.content}
        </Link>
      )}

      {/* Images */}
      {post.images?.length > 0 && (
        <Link href={`/posts/${post.id}`} className={`grid gap-1.5 mb-3 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {post.images.slice(0, 4).map((url: string, i: number) => (
            <img key={i} src={url} alt="" className="w-full h-48 object-cover rounded-lg" />
          ))}
        </Link>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-100 dark:border-gray-700">
        <ReactionButton
          liked={likedByMe}
          userReaction={userReaction}
          reactions={reactions}
          totalLikes={likeCount}
          onReact={handleReact}
          onShowLikes={loadLikesList}
        />
        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
        >
          💬 {commentCount}
        </button>
      </div>

      {/* Likes Modal */}
      {showLikesModal && (
        <LikesModal likes={likesList} loading={likesLoading} onClose={() => setShowLikesModal(false)} />
      )}

      {/* Comments */}
      {showComments && (
        <div className="mt-3 space-y-3">
          <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
            {comments.map((c) => (
              <CommentThread
                key={c.id}
                comment={c}
                postId={post.id}
                onLike={handleCommentLike}
                onReply={(p) => {
                  setReplyingTo(p);
                  const el = document.getElementById(`reply-input-${post.id}`);
                  el?.focus();
                }} 
              />
            ))}
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            {replyingTo && (
              <div className="flex items-center justify-between px-2 py-1 mb-1 bg-gray-50 dark:bg-gray-700/30 rounded text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <span><b>{replyingTo.name}</b> kişisine yanıt veriliyor...</span>
                <button onClick={() => setReplyingTo(null)} className="hover:underline">Vazgeç</button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                id={`reply-input-${post.id}`}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAddComment()}
                placeholder={replyingTo ? "Yanıt yaz..." : "Yorum yaz..."}
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
        </div>
      )}
    </div>
  );
}
