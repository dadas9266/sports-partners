"use client";

import { useState } from "react";
import { UserStoryGroup } from "@/types";
import StoryViewer from "./StoryViewer";

interface StoryBubblesProps {
  groups: UserStoryGroup[];
  /** Kendi hikayeni eklemek için "+" butonu göster */
  showAddButton?: boolean;
  onAddStory?: () => void;
  sessionUserId?: string;
}

export default function StoryBubbles({ groups, showAddButton, onAddStory, sessionUserId }: StoryBubblesProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeGroupIdx, setActiveGroupIdx] = useState(0);

  if (groups.length === 0 && !showAddButton) return null;

  const openAt = (idx: number) => {
    setActiveGroupIdx(idx);
    setViewerOpen(true);
  };

  return (
    <>
      {/* Yatay kaydırılabilir hikaye bandı */}
      <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide px-1 py-2">

        {/* + Hikaye Ekle butonu */}
        {showAddButton && (
          <button
            onClick={onAddStory}
            className="flex-shrink-0 flex flex-col items-center gap-1"
            aria-label="Hikaye ekle"
          >
            <div className="relative w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-400 dark:border-gray-600 flex items-center justify-center hover:border-indigo-500 transition">
              <span className="text-2xl text-gray-400 dark:text-gray-500">+</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-center truncate">Hikaye Ekle</span>
          </button>
        )}

        {/* Kullanıcı hikaye daireleri */}
        {groups.map((group, idx) => (
          <button
            key={group.userId}
            onClick={() => openAt(idx)}
            className="flex-shrink-0 flex flex-col items-center gap-1"
            aria-label={`${group.userName ?? "Kullanıcı"} hikayeleri`}
          >
            {/* Halka rengi: okunmamışsa gradient, okunmuşsa gri */}
            <div
              className={`w-16 h-16 rounded-full p-[2px] ${
                group.hasUnread
                  ? "bg-gradient-to-br from-pink-500 via-orange-400 to-yellow-300"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-white dark:border-gray-950 bg-gray-300">
                {group.userAvatar ? (
                  <img
                    src={group.userAvatar}
                    alt={group.userName ?? ""}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-600 text-white font-bold text-lg">
                    {group.userName?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-gray-700 dark:text-gray-300 w-16 text-center truncate">
              {group.userName ?? "Kullanıcı"}
            </span>
          </button>
        ))}
      </div>

      {/* StoryViewer overlay */}
      {viewerOpen && (
        <StoryViewer
          groups={groups}
          initialGroupIndex={activeGroupIdx}
          onClose={() => setViewerOpen(false)}
          sessionUserId={sessionUserId}
        />
      )}
    </>
  );
}
