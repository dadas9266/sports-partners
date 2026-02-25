"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { getListingDetail, updateListing } from "@/services/api";
import { useLocations, useSports, useVenues } from "@/hooks/useLocations";
import type { ListingDetail } from "@/types";
import Button from "@/components/ui/Button";

export default function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { locations } = useLocations();
  const { sports } = useSports();

  const [form, setForm] = useState({
    type: "",
    sportId: "",
    countryId: "",
    cityId: "",
    districtId: "",
    venueId: "",
    dateTime: "",
    level: "",
    description: "",
  });

  const { venues } = useVenues(form.districtId);
  const cities = locations.find((l) => l.id === form.countryId)?.cities || [];
  const districts = cities.find((c) => c.id === form.cityId)?.districts || [];

  const fetchListing = useCallback(async () => {
    try {
      const data = await getListingDetail(id);
      if (data.success && data.data) {
        const l = data.data;
        setListing(l);
        // Mevcut değerleri forma yükle
        const dt = new Date(l.dateTime);
        const localDT = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setForm({
          type: l.type,
          sportId: l.sport.id,
          countryId: l.district?.city?.country?.id ?? "",
          cityId: l.district?.city?.id ?? "",
          districtId: l.district?.id ?? "",
          venueId: l.venue?.id ?? "",
          dateTime: localDT,
          level: l.level,
          description: l.description ?? "",
        });
      } else {
        toast.error("İlan bulunamadı");
        router.push("/profil");
      }
    } catch {
      toast.error("İlan yüklenemedi");
      router.push("/profil");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/giris");
      return;
    }
    if (status === "authenticated") fetchListing();
  }, [status, fetchListing, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;
    setSaving(true);
    try {
      await updateListing(id, {
        type: form.type,
        sportId: form.sportId,
        districtId: form.districtId,
        venueId: form.venueId || null,
        dateTime: form.dateTime,
        level: form.level,
        description: form.description || undefined,
      });
      toast.success("İlan güncellendi!");
      router.push(`/ilan/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Güncelleme başarısız");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!session || !listing) return null;

  // Sadece ilan sahibi düzenleyebilir
  if (listing.userId !== session.user?.id) {
    toast.error("Bu ilanı düzenleme yetkiniz yok");
    router.push(`/ilan/${id}`);
    return null;
  }

  const selectClass =
    "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100 dark:disabled:bg-gray-700";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          ← Geri
        </button>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">✏️ İlanı Düzenle</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5"
      >
        {/* İlan Tipi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">İlan Tipi *</label>
          <div className="grid grid-cols-2 gap-3">
            {(["RIVAL", "PARTNER", "TRAINER", "EQUIPMENT"] as const).map((t) => (\n              <button\n                key={t}\n                type="button"\n                onClick={() => setForm({ ...form, type: t })}\n                className={`p-3 rounded-lg border-2 text-center transition text-sm font-medium ${\n                  form.type === t\n                    ? t === "RIVAL"\n                      ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"\n                      : t === "TRAINER"\n                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"\n                      : t === "EQUIPMENT"\n                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"\n                      : "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"\n                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"\n                }`}\n                aria-pressed={form.type === t}\n              >\n                {t === "RIVAL" ? "🥊 Rakip Arıyorum" : t === "TRAINER" ? "🎓 Eğitmen İlanı" : t === "EQUIPMENT" ? "🛒 Spor Malzemesi" : "🤝 Partner Arıyorum"}\n              </button>\n            ))}
          </div>
        </div>

        {/* Spor */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Spor Dalı *</label>
          <select value={form.sportId} onChange={(e) => setForm({ ...form, sportId: e.target.value })} className={selectClass} required>
            <option value="">Spor seçin</option>
            {sports.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
        </div>

        {/* Konum */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ülke *</label>
            <select value={form.countryId} onChange={(e) => setForm({ ...form, countryId: e.target.value, cityId: "", districtId: "", venueId: "" })} className={selectClass} required>
              <option value="">Ülke</option>
              {locations.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Şehir *</label>
            <select value={form.cityId} onChange={(e) => setForm({ ...form, cityId: e.target.value, districtId: "", venueId: "" })} className={selectClass} required disabled={!form.countryId}>
              <option value="">Şehir</option>
              {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">İlçe *</label>
            <select value={form.districtId} onChange={(e) => setForm({ ...form, districtId: e.target.value, venueId: "" })} className={selectClass} required disabled={!form.cityId}>
              <option value="">İlçe</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        {/* Mekan */}
        {form.districtId && venues.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tesis (opsiyonel)</label>
            <select value={form.venueId} onChange={(e) => setForm({ ...form, venueId: e.target.value })} className={selectClass}>
              <option value="">Tesis seçin</option>
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        )}

        {/* Tarih */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tarih & Saat *</label>
          <input
            type="datetime-local"
            value={form.dateTime}
            min={new Date().toISOString().slice(0, 16)}
            onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
            className={selectClass}
            required
          />
        </div>

        {/* Seviye */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seviye *</label>
          <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={selectClass} required>
            <option value="">Seviye seçin</option>
            <option value="BEGINNER">🌱 Başlangıç</option>
            <option value="INTERMEDIATE">🔥 Orta</option>
            <option value="ADVANCED">⚡ İleri</option>
          </select>
        </div>

        {/* Açıklama */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama (opsiyonel)</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            maxLength={1000}
            placeholder="Kendinden ve aradığın kişiden bahset..."
            className={`${selectClass} resize-none`}
          />
          <p className="text-xs text-gray-400 mt-1">{form.description.length}/1000</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => router.back()}>
            Vazgeç
          </Button>
          <Button type="submit" loading={saving} className="flex-1">
            💾 Güncelle
          </Button>
        </div>
      </form>
    </div>
  );
}
