"use client";

import { useState } from "react";
import Link from "next/link";
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
  const [myReaction, setMyReaction] = useState<string>(post.userReaction || (post.likedByMe || post.liked ? "like" : ""));
  const [likeCount, setLikeCount] = useState(post._count?.likes ?? 0);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const REACTIONS = [
    { key: "like", emoji: "\u2764\uFE0F", label: "Be\u011fen" },
    { key: "fire", emoji: "\uD83D\uDD25", label: "Ate\u015fle" },
    { key: "muscle", emoji: "\uD83D\uDCAA", label: "G\u00fc\u00e7l\u00fc" },
    { key: "clap", emoji: "\uD83D\uDC4F", label: "Alk\u0131\u015fla" },
    { key: "goal", emoji: "\u26BD", label: "Gol" },
  ];

  const handleLike = async (reaction: string = "like") => {
    if (toggling) return;
    setToggling(true);
    setShowReactionPicker(false);
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction })
      });
      const json = await res.json();
      setLikedByMe(json.liked);
      setMyReaction(json.liked ? (json.reaction || reaction) : "");
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
          // Recursive: find the parent comment at any depth and add reply
          const addReplyRecursive = (list: any[]): any[] => {
            if (!Array.isArray(list)) return [];
            return list.map(c => {
              if (c.id === replyingTo.id) {
                return { ...c, replies: [...(c.replies || []), json.comment] };
              }
              if (c.replies && c.replies.length > 0) {
                return { ...c, replies: addReplyRecursive(c.replies) };
              }
              return c;
            });
          };
          setComments(prev => addReplyRecursive(prev));
        } else {
          setComments((prev) => [...(Array.isArray(prev) ? prev : []), json.comment]);
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
        <div className="flex items-center relative">
          <button
            onClick={() => handleLike(myReaction || "like")}
            onPointerDown={() => {
              const timer = setTimeout(() => setShowReactionPicker(true), 400);
              const up = () => { clearTimeout(timer); window.removeEventListener("pointerup", up); };
              window.addEventListener("pointerup", up);
            }}
            disabled={toggling}
            className={`flex items-center gap-1.5 text-sm transition py-1 pr-2 ${
              likedByMe ? "text-red-500 font-semibold" : "text-gray-500 dark:text-gray-400 hover:text-red-500"
            }`}
          >
            {likedByMe ? (REACTIONS.find(r => r.key === myReaction)?.emoji || "\u2764\uFE0F") : "\uD83E\uDD0D"}
          </button>
          {showReactionPicker && (
            <>
              <div className="fixed inset-0 z-[50]" onClick={() => setShowReactionPicker(false)} />
              <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-2 py-1 shadow-lg z-[51]">
                {REACTIONS.map(r => (
                  <button
                    key={r.key}
                    onClick={() => handleLike(r.key)}
                    title={r.label}
                    className="text-lg hover:scale-125 transition-transform px-0.5"
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            </>
          )}
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
                    <span className="text-lg">{({ like: "❤️", fire: "🔥", muscle: "💪", clap: "👏", goal: "⚽" } as Record<string, string>)[like.reaction] || "❤️"}</span>
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
          <div className="max-h-[400px] overflow-y-auto space-y-3 pr-1">
            {Array.isArray(comments) && comments.map((c) => (
              <RenderComment 
                key={c.id} 
                comment={c} 
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

function RenderComment({ comment, onLike, onReply, isReply = false }: { comment: any, onLike: (id: string) => void, onReply: (p: any) => void, isReply?: boolean }) {
  return (
    <div className={`flex gap-2 ${isReply ? "ml-8 mt-2" : ""}`}>
      <Link href={`/profil/${comment.user?.id}`} className="flex-shrink-0">
        <div className={`${isReply ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs"} rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center font-bold`}>
            {comment.user?.avatarUrl ? (
              <img src={comment.user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              comment.user?.name?.charAt(0) || "?"
            )}
        </div>
      </Link>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl rounded-tl-none relative group">
          <div className="flex justify-between items-start gap-2">
            <Link href={`/profil/${comment.user?.id}`} className="font-semibold text-gray-700 dark:text-gray-200 text-xs hover:text-emerald-500 transition truncate">
              {comment.user?.name}
            </Link>
            <button 
              onClick={() => onLike(comment.id)}
              className={`text-[10px] flex items-center gap-0.5 ${comment.likedByMe ? "text-red-500" : "text-gray-400 hover:text-red-500"}`}
            >
              {comment.likedByMe ? "❤️" : "🤍"} <span className="font-medium">{comment._count?.likes || 0}</span>
            </button>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5 leading-relaxed">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 ml-1">
          <p className="text-[9px] text-gray-400">
            {format(new Date(comment.createdAt), "d MMM, HH:mm", { locale: tr })}
          </p>
          <button 
            onClick={() => onReply({ id: comment.id, name: comment.user?.name })}
            className="text-[9px] font-bold text-gray-500 hover:text-emerald-600 dark:hover:text-emerald-400 uppercase tracking-tighter"
          >
            Yanıtla
          </button>
        </div>

        {/* REPLIES TREE */}
        {comment.replies?.length > 0 && (
          <div className="space-y-1">
            {comment.replies.map((reply: any) => (
              <RenderComment key={reply.id} comment={reply} onLike={onLike} onReply={onReply} isReply={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
