"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { Story } from "@/types";

interface Props {
  onClose: () => void;
  onCreated: (story: Story) => void;
}

export default function StoryAddModal({ onClose, onCreated }: Props) {
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim()) {
      toast.error("Lütfen bir metin girin");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "MEDIA", caption: caption.trim() }),
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-700">
          <h2 className="text-white font-semibold text-lg">Story Ekle</h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-white text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
              Ne paylaşmak istiyorsun?
            </label>
            <textarea
              rows={3}
              placeholder="Maç sonucu, motivasyon, antrenman notu..."
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 300))}
              className="w-full bg-zinc-800 text-white placeholder-zinc-500 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
            <p className="text-zinc-600 text-xs text-right">{caption.length}/300</p>
          </div>

          <button
            type="submit"
            disabled={submitting || !caption.trim()}
            className="w-full bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-50"
          >
            {submitting ? "Paylaşılıyor..." : "Story Paylaş"}
          </button>
        </form>
      </div>
    </div>
  );
}
