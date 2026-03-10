"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface CommentThreadProps {
  comment: any;
  postId: string;
  onLike: (commentId: string) => void;
  onReply: (p: { id: string; name: string }) => void;
  isReply?: boolean;
}

export default function CommentThread({
  comment,
  postId,
  onLike,
  onReply,
  isReply = false,
}: CommentThreadProps) {
  const [showReplies, setShowReplies] = useState(false);
  const replyCount = comment.replies?.length ?? comment._count?.replies ?? 0;

  return (
    <div className={isReply ? "ml-8 mt-1.5" : "mt-2"}>
      <div className="flex gap-2">
        <Link href={`/profil/${comment.user?.id}`} className="shrink-0 mt-0.5">
          <div className={`${
            isReply ? "w-6 h-6 text-[10px]" : "w-8 h-8 text-xs"
          } rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-600 dark:text-gray-400 overflow-hidden`}>
            {comment.user?.avatarUrl ? (
              <img src={comment.user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              comment.user?.name?.charAt(0)?.toUpperCase()
            )}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="inline-block max-w-full bg-gray-100 dark:bg-gray-700/60 rounded-2xl rounded-tl-sm px-3 py-2">
            <Link href={`/profil/${comment.user?.id}`} className="text-xs font-bold text-gray-800 dark:text-gray-100 hover:text-emerald-600 transition block">
              {comment.user?.name}
            </Link>
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">{comment.content}</p>
          </div>

          <div className="flex items-center gap-3 mt-1 ml-1">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {format(new Date(comment.createdAt), "d MMM, HH:mm", { locale: tr })}
            </span>
            <button
              onClick={() => onLike(comment.id)}
              className={`text-[11px] font-bold transition ${
                comment.likedByMe ? "text-red-500" : "text-gray-500 dark:text-gray-400 hover:text-red-500"
              }`}
            >
              {comment.likedByMe ? "Beğenildi" : "Beğen"}
              {comment._count?.likes > 0 && (
                <span className="ml-1 text-[10px] font-normal">{comment._count.likes} ❤️</span>
              )}
            </button>
            {!isReply && (
              <button
                onClick={() => onReply({ id: comment.id, name: comment.user?.name })}
                className="text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
              >
                Yanıtla
              </button>
            )}
          </div>

          {replyCount > 0 && !isReply && (
            <div className="mt-1.5">
              <button
                onClick={() => setShowReplies(v => !v)}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline ml-1"
              >
                <svg className={`w-3 h-3 transition-transform ${showReplies ? "rotate-90" : ""}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
                {showReplies ? "Yanıtları gizle" : `${replyCount} yanıt gör`}
              </button>
              {showReplies && (
                <div className="mt-1 space-y-1">
                  {(comment.replies ?? []).map((reply: any) => (
                    <CommentThread
                      key={reply.id}
                      comment={reply}
                      postId={postId}
                      onLike={onLike}
                      onReply={onReply}
                      isReply={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
