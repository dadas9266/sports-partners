"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import toast from "react-hot-toast";

export default function PostDetailPage() {
  const { postId } = useParams();
  const searchParams = useSearchParams();
  const targetCommentId = searchParams.get("commentId");
  const { data: session } = useSession();

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchPost = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${postId}`);
      if (!res.ok) throw new Error("Gönderi bulunamadı");
      const json = await res.json();
      setPost(json.post);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      const json = await res.json();
      setComments(json.comments || []);
    } catch {
      toast.error("Yorumlar yüklenemedi");
    } finally {
      setCommentsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
  }, [postId, fetchPost, fetchComments]);

  // Target comment scroll
  useEffect(() => {
    if (!commentsLoading && targetCommentId) {
      const el = document.getElementById(`comment-${targetCommentId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("bg-emerald-50", "dark:bg-emerald-900/20");
        setTimeout(() => {
            el.classList.remove("bg-emerald-50", "dark:bg-emerald-900/20");
        }, 3000);
      }
    }
  }, [commentsLoading, targetCommentId, comments]);

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      const json = await res.json();
      setPost((prev: any) => ({
        ...prev,
        liked: json.liked,
        _count: { ...prev._count, likes: json.likeCount }
      }));
    } catch {
      toast.error("İşlem yapılamadı");
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const json = await res.json();
      if (json.comment) {
        setComments(prev => [...prev, json.comment]);
        setCommentText("");
        setPost((prev: any) => ({ ...prev, _count: { ...prev._count, comments: prev._count.comments + 1 } }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center animate-pulse">Yükleniyor...</div>;
  if (!post) return <div className="p-8 text-center text-gray-400">Gönderi bulunamadı.</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 pb-20">
      <header className="flex items-center gap-4 mb-6">
        <Link href="/sosyal" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition">
          <span className="text-xl">←</span>
        </Link>
        <h1 className="font-bold text-lg">Gönderi Detayı</h1>
      </header>

      <article className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-6">
        <div className="p-4 flex items-center gap-3">
          <Link href={`/profil/${post.user.id}`}>
            <div className="w-10 h-10 rounded-full bg-emerald-100 overflow-hidden flex items-center justify-center font-bold text-emerald-700">
              {post.user.avatarUrl ? <img src={post.user.avatarUrl} className="w-full h-full object-cover" /> : post.user.name[0]}
            </div>
          </Link>
          <div>
            <Link href={`/profil/${post.user.id}`} className="font-bold text-sm hover:text-emerald-500 transition">{post.user.name}</Link>
            <p className="text-xs text-gray-400">{format(new Date(post.createdAt), "d MMMM yyyy, HH:mm", { locale: tr })}</p>
          </div>
        </div>

        {post.content && <p className="px-4 pb-3 text-sm whitespace-pre-wrap">{post.content}</p>}
        
        {post.images?.length > 0 && (
          <div className="grid gap-1">
            {post.images.map((img: string, i: number) => (
              <img key={i} src={img} alt="" className="w-full h-auto max-h-[500px] object-cover" />
            ))}
          </div>
        )}

        <div className="p-4 border-t dark:border-gray-700 flex gap-4">
          <button onClick={handleLike} className={`flex items-center gap-1 text-sm ${post.liked ? "text-red-500 font-bold" : "text-gray-400"}`}>
            {post.liked ? "❤️" : "🤍"} {post._count.likes}
          </button>
          <span className="flex items-center gap-1 text-sm text-gray-400">
            💬 {post._count.comments}
          </span>
        </div>
      </article>

      <section className="space-y-4">
        <h3 className="font-bold text-sm text-gray-500 mb-2">Yorumlar</h3>
        {commentsLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />)}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-xs italic">Henüz yorum yapılmamış.</p>
        ) : (
          comments.map((c: any) => (
            <div key={c.id} id={`comment-${c.id}`} className="flex gap-3 p-3 rounded-2xl transition-all duration-500">
              <Link href={`/profil/${c.user.id}`}>
                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-xs font-bold shrink-0">
                  {c.user.avatarUrl ? <img src={c.user.avatarUrl} className="w-full h-full object-cover" /> : c.user.name[0]}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl rounded-tl-none">
                  <Link href={`/profil/${c.user.id}`} className="font-bold text-xs hover:text-emerald-500 transition">{c.user.name}</Link>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{c.content}</p>
                </div>
                <div className="flex items-center gap-3 mt-1 px-1">
                   <p className="text-[10px] text-gray-400">{format(new Date(c.createdAt), "d MMM, HH:mm", { locale: tr })}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-t dark:border-gray-800 max-w-2xl mx-auto">
        <div className="flex gap-2">
            <input 
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleComment()}
              placeholder="Yorum yap..."
              className="flex-1 bg-gray-100 dark:bg-gray-800 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
            />
            <button 
              onClick={handleComment}
              disabled={submitting || !commentText.trim()}
              className="bg-emerald-600 text-white rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50"
            >
              Gönder
            </button>
        </div>
      </div>
    </div>
  );
}
