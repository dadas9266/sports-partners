"use client";

import Link from "next/link";
import { REACTION_EMOJIS } from "./ReactionButton";

interface LikesModalProps {
  likes: any[];
  loading: boolean;
  onClose: () => void;
}

export default function LikesModal({ likes, loading, onClose }: LikesModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/30">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Beğenenler</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold p-1">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : likes.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">Henüz kimse beğenmedi.</p>
          ) : (
            likes.map((like, idx) => (
              <Link key={idx} href={`/profil/${like.user.id}`} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition" onClick={onClose}>
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/20 overflow-hidden flex items-center justify-center border border-emerald-100 dark:border-emerald-800">
                  {like.user.avatarUrl ? <img src={like.user.avatarUrl} className="w-full h-full object-cover" alt="" /> : (like.user.name?.[0] ?? "?")}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{like.user.name}</p>
                  {like.user.city && <p className="text-[10px] text-gray-400">{like.user.city.name}</p>}
                </div>
                <span className="text-lg">{REACTION_EMOJIS[like.reaction] || "❤️"}</span>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
