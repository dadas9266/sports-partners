"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

interface CreatePostBoxProps {
  onCreated: (post: any) => void;
}

export default function CreatePostBox({ onCreated }: CreatePostBoxProps) {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4);
    setImages(files);
    setPreviews(files.map((f) => URL.createObjectURL(f)));
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return;
    setSubmitting(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of images) {
        const fd = new FormData();
        fd.append("type", "post");
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (json.url) uploadedUrls.push(json.url);
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), images: uploadedUrls }),
      });
      const json = await res.json();
      if (json.post) {
        onCreated(json.post);
        setContent("");
        setImages([]);
        setPreviews([]);
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
      {previews.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {previews.map((src, i) => (
            <img key={i} src={src} alt="" className="h-20 w-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600" />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
        <label className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer transition">
          <span>🖼️ Fotoğraf Ekle</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
        </label>
        <Button
          size="sm"
          onClick={handleSubmit}
          loading={submitting}
          disabled={!content.trim() && images.length === 0}
        >
          Paylaş
        </Button>
      </div>
    </div>
  );
}
