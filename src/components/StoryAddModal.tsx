"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { Story, StoryType } from "@/types";

interface Props {
  onClose: () => void;
  onCreated: (story: Story) => void;
}

const TYPE_LABELS: Record<StoryType, string> = {
  MEDIA: "📷 Medya (Fotoğraf / Video)",
  RESULT: "⚽ Maç Sonucu",
  ACHIEVEMENT: "🏆 Rozet / Başarı",
  MATCH: "🤝 Maç Paylaşımı",
};

export default function StoryAddModal({ onClose, onCreated }: Props) {
  const [type, setType] = useState<StoryType>("MEDIA");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [matchResult, setMatchResult] = useState("");
  const [badgeKey, setBadgeKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (type === "MEDIA" && !mediaUrl) {
      toast.error("Lütfen bir medya yükleyin veya URL girin");
      return;
    }
    if (type === "RESULT" && !matchResult.trim()) {
      toast.error("Lütfen maç sonucunu girin");
      return;
    }
    if (type === "ACHIEVEMENT" && !badgeKey.trim()) {
      toast.error("Lütfen bir başarı seçin");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { type, caption: caption.trim() || undefined };
      if (type === "MEDIA") {
        body.mediaUrl = mediaUrl;
        body.mediaType = mediaType;
      }
      if (type === "RESULT") body.linkedMatchResult = matchResult;
      if (type === "ACHIEVEMENT") body.linkedBadgeKey = badgeKey;

      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message ?? "Hata");
      toast.success("Story paylaşıldı!");
      onCreated(json.story);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Bir hata oluştu";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md bg-zinc-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
          <h2 className="text-white font-semibold text-lg">Story Ekle</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type selector */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
              Story Türü
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(TYPE_LABELS) as StoryType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`text-sm py-2 px-3 rounded-xl text-left transition ${
                    type === t
                      ? "bg-emerald-600 text-white"
                      : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  }`}
                >
                  {TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {/* MEDIA fields */}
          {type === "MEDIA" && (
            <div className="space-y-2">
              <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                Fotoğraf / Video URL
              </label>
              {mediaUrl ? (
                <div className="relative">
                  {mediaType === "video" ? (
                    <video
                      src={mediaUrl}
                      className="w-full h-40 object-cover rounded-xl"
                      muted
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mediaUrl}
                      alt="preview"
                      className="w-full h-40 object-cover rounded-xl"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setMediaUrl("")}
                    className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg"
                  >
                    Kaldır
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-zinc-600 rounded-xl">
                  <span className="text-zinc-400 text-sm">Bir görsel veya video URL'si yapıştırın</span>
                </div>
              )}
              <input
                type="url"
                placeholder="https://... görsel veya video URL'si"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex gap-2">
                {(["image", "video"] as const).map((mt) => (
                  <button
                    key={mt}
                    type="button"
                    onClick={() => setMediaType(mt)}
                    className={`text-xs px-3 py-1 rounded-lg transition ${
                      mediaType === mt
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {mt === "image" ? "🖼 Fotoğraf" : "🎬 Video"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* RESULT fields */}
          {type === "RESULT" && (
            <div className="space-y-1.5">
              <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                Maç Sonucu
              </label>
              <input
                type="text"
                placeholder="Örnek: Kazandım 3-1 🏆"
                value={matchResult}
                onChange={(e) => setMatchResult(e.target.value)}
                maxLength={100}
                className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* ACHIEVEMENT fields */}
          {type === "ACHIEVEMENT" && (
            <div className="space-y-1.5">
              <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                Başarı / Rozet
              </label>
              <input
                type="text"
                placeholder="Örnek: İlk Maç, 10 Maç, Seri Oyuncu..."
                value={badgeKey}
                onChange={(e) => setBadgeKey(e.target.value)}
                maxLength={80}
                className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          )}

          {/* MATCH fields */}
          {type === "MATCH" && (
            <p className="text-zinc-400 text-sm bg-zinc-800 rounded-xl px-4 py-3">
              Yakında yapacağın veya geçmişteki bir maçı paylaşacaksın. İsteğe bağlı başlık
              ekleyebilirsin.
            </p>
          )}

          {/* Caption */}
          <div className="space-y-1.5">
            <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
              Açıklama <span className="text-zinc-600">(isteğe bağlı)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Birkaç kelime ekle..."
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 300))}
              className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-zinc-600 text-xs text-right">{caption.length}/300</p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? "Paylaşılıyor..." : "Story Paylaş"}
          </button>
        </form>
      </div>
    </div>
  );
}
