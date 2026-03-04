"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

interface CreatePostBoxProps {
  onCreated: (post: any) => void;
}

export default function CreatePostBox({ onCreated }: CreatePostBoxProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), images: [] }),
      });
      const json = await res.json();
      if (json.post) {
        onCreated(json.post);
        setContent("");
        toast.success("Gönderi paylaşıldı!");
      } else {
        toast.error(json.error || "Gönderi oluşturulamadı");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Ne düşünüyorsun? Paylaş..."
        rows={3}
        className="w-full resize-none bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none text-sm"
      />
      <div className="flex items-center justify-end mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
        <Button
          size="sm"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!content.trim()}
        >
          Paylaş
        </Button>
      </div>
    </div>
  );
}
