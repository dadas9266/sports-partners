"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Story, UserStoryGroup } from "@/types";
import toast from "react-hot-toast";

interface StoryViewerProps {
  groups: UserStoryGroup[];
  initialGroupIndex?: number;
  onClose: () => void;
  sessionUserId?: string;
}

const STORY_DURATION_MS = 5000;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} sa önce`;
  return `${Math.floor(hrs / 24)} gün önce`;
}

export default function StoryViewer({ groups, initialGroupIndex = 0, onClose, sessionUserId }: StoryViewerProps) {
  const router = useRouter();
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewerPanel, setViewerPanel] = useState(false);
  const [viewers, setViewers] = useState<{ id: string; name: string; avatarUrl: string | null; viewedAt: string }[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedRef = useRef<number>(0);

  const currentGroup = groups[groupIdx];
  const currentStory: Story | undefined = currentGroup?.stories[storyIdx];

  // Görüntüleme API'sini çağır
  const markViewed = useCallback(async (storyId: string) => {
    try {
      await fetch(`/api/stories/${storyId}/view`, { method: "POST" });
    } catch (_err) { /* sessizce geç */ }
  }, []);

  const goNext = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
    if (storyIdx < (currentGroup?.stories.length ?? 1) - 1) {
      setStoryIdx((i) => i + 1);
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [storyIdx, groupIdx, currentGroup, groups.length, onClose]);

  const goPrev = useCallback(() => {
    setProgress(0);
    elapsedRef.current = 0;
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (groupIdx > 0) {
      setGroupIdx((g) => g - 1);
      setStoryIdx(0);
    }
  }, [storyIdx, groupIdx]);

  // Timer: her 50ms progress'i güncelle
  useEffect(() => {
    if (!currentStory) return;
    markViewed(currentStory.id);

    if (timerRef.current) clearInterval(timerRef.current);
    startTimeRef.current = Date.now();
    elapsedRef.current = 0;
    setProgress(0);

    if (paused) return;

    timerRef.current = setInterval(() => {
      elapsedRef.current += 50;
      const pct = Math.min((elapsedRef.current / STORY_DURATION_MS) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        goNext();
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStory?.id, paused, goNext, markViewed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  if (!currentGroup || !currentStory) return null;

  const isOwnStory = sessionUserId === currentGroup.userId;

  const openViewerPanel = async () => {
    if (!isOwnStory) return;
    setPaused(true);
    setViewerPanel(true);
    setLoadingViewers(true);
    try {
      const res = await fetch(`/api/stories/${currentStory.id}/view`);
      const json = await res.json();
      if (json.success) setViewers(json.viewers);
    } catch { /* ignore */ }
    setLoadingViewers(false);
  };

  const handleReply = async () => {
    if (!currentGroup.userId) return;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: currentGroup.userId }),
      });
      const json = await res.json();
      if (json.success) {
        onClose();
        router.push(`/mesajlar/${json.data.id}`);
      } else {
        toast.error(json.error || "Mesaj gönderilemedi");
      }
    } catch {
      toast.error("Bir hata oluştu");
    }
  };

  const storyBg = (): string => {
    if (currentStory.mediaUrl && currentStory.mediaType === "image") return "bg-black";
    if (currentStory.type === "RESULT") return "bg-gradient-to-br from-yellow-700 to-orange-600";
    if (currentStory.type === "ACHIEVEMENT") return "bg-gradient-to-br from-indigo-700 to-purple-700";
    if (currentStory.type === "MATCH") return "bg-gradient-to-br from-emerald-700 to-teal-800";
    return "bg-gradient-to-br from-gray-800 to-gray-900";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Container */}
      <div className={`relative w-full max-w-sm h-[90vh] rounded-2xl overflow-hidden shadow-2xl ${storyBg()}`}>

        {/* Progress bars */}
        <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
          {currentGroup.stories.map((s, i) => (
            <div key={s.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-none"
                style={{
                  width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header: kullanıcı bilgisi */}
        <div className="absolute top-8 left-3 right-3 flex items-center gap-3 z-20">
          <div className="w-9 h-9 rounded-full border-2 border-white overflow-hidden bg-gray-700 flex-shrink-0">
            {currentGroup.userAvatar ? (
              <img src={currentGroup.userAvatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm font-bold text-white">
                {currentGroup.userName?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-none truncate">{currentGroup.userName}</p>
            <p className="text-white/60 text-xs mt-0.5">{timeAgo(currentStory.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition p-1"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        {/* Medya içeriği */}
        <div className="absolute inset-0 flex items-center justify-center">
          {currentStory.mediaUrl && currentStory.mediaType === "image" && (
            <img
              src={currentStory.mediaUrl}
              alt=""
              className="w-full h-full object-contain"
              draggable={false}
            />
          )}
          {currentStory.mediaUrl && currentStory.mediaType === "video" && (
            <video
              src={currentStory.mediaUrl}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          )}

          {/* Contextual içerik (medya yoksa) */}
          {!currentStory.mediaUrl && (
            <div className="px-8 text-center">
              {currentStory.type === "RESULT" && (
                <div>
                  <div className="text-5xl mb-3">🏆</div>
                  <p className="text-white text-2xl font-bold">{currentStory.linkedMatchResult}</p>
                  <p className="text-white/70 text-sm mt-2">Maç Sonucu</p>
                </div>
              )}
              {currentStory.type === "ACHIEVEMENT" && (
                <div>
                  <div className="text-5xl mb-3">🎖️</div>
                  <p className="text-white text-xl font-bold">{currentStory.linkedBadgeKey ?? "Yeni Rozet!"}</p>
                  <p className="text-white/70 text-sm mt-2">Başarı Kazanıldı</p>
                </div>
              )}
              {currentStory.type === "MATCH" && (
                <div>
                  <div className="text-5xl mb-3">⚡</div>
                  <p className="text-white text-lg font-semibold">Yeni İlan Açıldı</p>
                  <p className="text-white/70 text-sm mt-2">Katılmak ister misin?</p>
                </div>
              )}
              {currentStory.type === "MEDIA" && (
                <div>
                  <div className="text-5xl mb-3">📸</div>
                  <p className="text-white/60 text-sm">Medya bulunamadı</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Caption */}
        {currentStory.caption && (
          <div className="absolute bottom-12 left-0 right-0 px-5 z-20">
            <p className="text-white text-sm font-medium drop-shadow text-center leading-relaxed">
              {currentStory.caption}
            </p>
          </div>
        )}

        {/* Alt kısım: Görüntüleyenler (kendi) veya Yanıtla (başkası) */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 z-20">
          {isOwnStory ? (
            <button
              onClick={openViewerPanel}
              className="text-white/60 hover:text-white text-xs flex items-center gap-1 transition"
            >
              👁 {currentStory._count?.views ?? 0} görüntülenme
            </button>
          ) : (
            sessionUserId && (
              <button
                onClick={handleReply}
                className="text-white/80 hover:text-white text-xs bg-white/10 hover:bg-white/20 rounded-full px-4 py-1.5 flex items-center gap-1 transition backdrop-blur-sm"
              >
                💬 Yanıtla
              </button>
            )
          )}
        </div>

        {/* Görüntüleyenler paneli */}
        {viewerPanel && (
          <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <span className="text-white font-semibold text-sm">👁 Görüntüleyenler</span>
              <button onClick={() => { setViewerPanel(false); setPaused(false); }} className="text-white/60 hover:text-white text-lg">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {loadingViewers ? (
                <p className="text-white/50 text-sm text-center py-8">Yükleniyor...</p>
              ) : viewers.length === 0 ? (
                <p className="text-white/50 text-sm text-center py-8">Henüz görüntülenme yok</p>
              ) : (
                viewers.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                      {v.avatarUrl ? (
                        <img src={v.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">{v.name?.[0]?.toUpperCase() ?? "?"}</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{v.name}</p>
                      <p className="text-white/40 text-xs">{timeAgo(v.viewedAt)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Dokunma / Tıklama alanları */}
        <button
          aria-label="Önceki hikaye"
          className="absolute left-0 top-0 w-1/3 h-full z-10"
          onClick={goPrev}
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        />
        <button
          aria-label="Sonraki hikaye"
          className="absolute right-0 top-0 w-2/3 h-full z-10"
          onClick={goNext}
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        />
      </div>

      {/* Önceki/Sonraki grup okları (desktop) */}
      {groupIdx > 0 && (
        <button
          onClick={() => { setGroupIdx((g) => g - 1); setStoryIdx(0); setProgress(0); }}
          className="hidden md:flex absolute left-4 items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full text-white transition z-50"
        >
          ‹
        </button>
      )}
      {groupIdx < groups.length - 1 && (
        <button
          onClick={() => { setGroupIdx((g) => g + 1); setStoryIdx(0); setProgress(0); }}
          className="hidden md:flex absolute right-4 items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full text-white transition z-50"
        >
          ›
        </button>
      )}
    </div>
  );
}
