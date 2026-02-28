"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

interface Sport {
  id: string;
  name: string;
  icon?: string;
}

export default function YeniTurnuvaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    sportId: "",
    format: "SINGLE_ELIMINATION",
    maxParticipants: 16,
    prizeInfo: "",
    startsAt: "",
    endsAt: "",
    location: "",
    isPublic: true,
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/giris");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/sports")
      .then((r) => r.json())
      .then((d) => setSports(d.sports ?? d ?? []))
      .catch(() => null);
  }, []);

  const set = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Başlık zorunlu");
    setLoading(true);
    try {
      const res = await fetch("/api/turnuvalar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          maxParticipants: Number(form.maxParticipants),
          sportId: form.sportId || undefined,
          startsAt: form.startsAt || undefined,
          endsAt: form.endsAt || undefined,
        }),
      });

      if (res.ok) {
        const t = await res.json();
        toast.success("Turnuva oluşturuldu!");
        router.push(`/turnuvalar/${t.id}`);
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Hata oluştu");
      }
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-white mb-6">Yeni Turnuva</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Başlık */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Turnuva Adı *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="örn. İstanbul Tenis Kupası"
            maxLength={100}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Açıklama */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Açıklama</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Turnuva hakkında kısa bilgi..."
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        {/* Spor + Format */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Branş</label>
            <select
              value={form.sportId}
              onChange={(e) => set("sportId", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Seçiniz</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Format</label>
            <select
              value={form.format}
              onChange={(e) => set("format", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="SINGLE_ELIMINATION">Tek Eleme</option>
              <option value="ROUND_ROBIN">Herkes Herkesle</option>
              <option value="SWISS">İsviçre Sistemi</option>
            </select>
          </div>
        </div>

        {/* Max katılımcı + Konum */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Maksimum Katılımcı
            </label>
            <input
              type="number"
              value={form.maxParticipants}
              onChange={(e) => set("maxParticipants", e.target.value)}
              min={2}
              max={512}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Konum</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="örn. Kadıköy, İstanbul"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Tarihler */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Başlangıç</label>
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => set("startsAt", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Bitiş</label>
            <input
              type="datetime-local"
              value={form.endsAt}
              onChange={(e) => set("endsAt", e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Ödül */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Ödül Bilgisi</label>
          <input
            type="text"
            value={form.prizeInfo}
            onChange={(e) => set("prizeInfo", e.target.value)}
            placeholder="örn. Kupa + Madalya"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Görünürlük */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => set("isPublic", e.target.checked)}
            className="w-4 h-4 accent-emerald-500"
          />
          <span className="text-sm text-gray-300">Herkese açık turnuva</span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
        >
          {loading ? "Oluşturuluyor..." : "Turnuva Oluştur"}
        </button>
      </form>
    </div>
  );
}
