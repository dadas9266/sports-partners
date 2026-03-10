"use client";

import { useState, useEffect, useRef } from "react";

export const REACTION_EMOJIS: Record<string, string> = {
  like: "❤️",
  fire: "🔥",
  muscle: "💪",
  clap: "👏",
  goal: "⚽",
};

interface ReactionButtonProps {
  liked: boolean;
  userReaction: string | null;
  reactions: Record<string, number>;
  totalLikes: number;
  onReact: (reaction: string) => void;
  onShowLikes: () => void;
}

export default function ReactionButton({
  liked,
  userReaction,
  reactions,
  totalLikes,
  onReact,
  onShowLikes,
}: ReactionButtonProps) {
  const [showPicker, setShowPicker] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const handlePointerDown = () => {
    timerRef.current = setTimeout(() => setShowPicker(true), 400);
  };
  const handlePointerUp = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };
  const handleClick = () => {
    if (showPicker) return;
    onReact(userReaction ?? "like");
  };
  const handlePickReaction = (reaction: string) => {
    setShowPicker(false);
    onReact(reaction);
  };

  const displayEmoji = liked && userReaction ? REACTION_EMOJIS[userReaction] ?? "❤️" : "🤍";

  const topReactions = Object.entries(reactions)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5">
      <button
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onClick={handleClick}
        className={`flex items-center gap-1 text-sm font-medium transition select-none ${
          liked
            ? "text-rose-500 dark:text-rose-400"
            : "text-gray-400 dark:text-gray-500 hover:text-rose-400"
        }`}
      >
        {displayEmoji}
      </button>
      <div className="flex items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-full px-1.5 py-0.5 transition" onClick={onShowLikes}>
        {topReactions.length > 0 && (
          <div className="flex items-center -space-x-0.5">
            {topReactions.map(([r]) => (
              <span key={r} className="text-xs" title={r}>
                {REACTION_EMOJIS[r]}
              </span>
            ))}
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1.5 font-medium">{totalLikes}</span>
          </div>
        )}
        {topReactions.length === 0 && totalLikes > 0 && (
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{totalLikes}</span>
        )}
      </div>
      {showPicker && (
        <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full shadow-lg px-2 py-1.5 z-50 animate-fade-in">
          {Object.entries(REACTION_EMOJIS).map(([key, emoji]) => (
            <button
              key={key}
              onClick={() => handlePickReaction(key)}
              className={`text-xl hover:scale-125 transition-transform p-0.5 rounded-full ${
                userReaction === key ? "bg-gray-100 dark:bg-gray-700 ring-2 ring-emerald-400" : ""
              }`}
              title={key}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
