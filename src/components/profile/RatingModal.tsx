"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

interface RatingModalProps {
  matchId: string;
  partnerName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function RatingModal({
  matchId,
  partnerName,
  onClose,
  onSuccess,
}: RatingModalProps) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!score) {
      toast.error("Lütfen puan seç");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, score, comment: comment || undefined }),
      });
      const json = await res.json();
      if (json.success || res.ok) {
        toast.success("Değerlendirme kaydedildi!");
        onSuccess?.();
        onClose();
      } else {
        toast.error(json.error || "Kaydedilemedi");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-1">
          Maçı Değerlendir
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
            {partnerName}
          </span>{" "}
          ile oynadığın maça puan ver
        </p>

        {/* Yıldız seçici */}
        <div className="flex justify-center gap-2 mb-5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setScore(star)}
              className={`text-4xl transition-transform hover:scale-110 ${
                star <= score
                  ? "text-amber-400"
                  : "text-gray-200 dark:text-gray-600"
              }`}
              aria-label={`${star} yıldız`}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Yorum ekle (isteğe bağlı)..."
          rows={3}
          maxLength={300}
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500 resize-none mb-4"
        />

        <div className="flex gap-2">
          <Button onClick={handleSubmit} loading={submitting} disabled={!score}>
            Gönder
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Vazgeç
          </Button>
        </div>
      </div>
    </div>
  );
}
