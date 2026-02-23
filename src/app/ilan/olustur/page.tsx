"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useLocations, useSports, useVenues } from "@/hooks/useLocations";
import { createListing } from "@/services/api";
import type { CreateListingForm } from "@/types";
import Button from "@/components/ui/Button";

export default function CreateListingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);

  const { locations } = useLocations();
  const { sports } = useSports();

  const [form, setForm] = useState<CreateListingForm>({
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

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/giris");
    }
  }, [status, router]);

  if (status === "unauthenticated") return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await createListing({
        type: form.type as string,
        sportId: form.sportId,
        districtId: form.districtId,
        venueId: form.venueId || null,
        dateTime: form.dateTime,
        level: form.level as string,
        description: form.description || undefined,
      });
      toast.success("İlan başarıyla oluşturuldu!");
      if (data.data) router.push(`/ilan/${data.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!session) return null;

  const selectClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100 dark:disabled:bg-gray-700";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        📝 Yeni İlan Oluştur
      </h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5"
      >
        {/* İlan Tipi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            İlan Tipi *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setForm({ ...form, type: "RIVAL" })}
              className={`p-3 rounded-lg border-2 text-center transition ${
                form.type === "RIVAL"
                  ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                  : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300"
              }`}
              aria-pressed={form.type === "RIVAL"}
            >
              🥊 Rakip Arıyorum
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, type: "PARTNER" })}
              className={`p-3 rounded-lg border-2 text-center transition ${
                form.type === "PARTNER"
                  ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                  : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300"
              }`}
              aria-pressed={form.type === "PARTNER"}
            >
              🤝 Partner Arıyorum
            </button>
          </div>
        </div>

        {/* Spor Dalı */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Spor Dalı *
          </label>
          <select
            required
            value={form.sportId}
            onChange={(e) => setForm({ ...form, sportId: e.target.value })}
            className={selectClass}
            aria-label="Spor dalı seçin"
          >
            <option value="">Seçiniz</option>
            {sports.map((s) => (
              <option key={s.id} value={s.id}>
                {s.icon} {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Konum */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ülke *</label>
            <select
              required
              value={form.countryId}
              onChange={(e) => setForm({ ...form, countryId: e.target.value, cityId: "", districtId: "", venueId: "" })}
              className={selectClass}
              aria-label="Ülke seçin"
            >
              <option value="">Seçiniz</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Şehir *</label>
            <select
              required
              value={form.cityId}
              onChange={(e) => setForm({ ...form, cityId: e.target.value, districtId: "", venueId: "" })}
              disabled={!form.countryId}
              className={selectClass}
              aria-label="Şehir seçin"
            >
              <option value="">Seçiniz</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">İlçe *</label>
            <select
              required
              value={form.districtId}
              onChange={(e) => setForm({ ...form, districtId: e.target.value, venueId: "" })}
              disabled={!form.cityId}
              className={selectClass}
              aria-label="İlçe seçin"
            >
              <option value="">Seçiniz</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mekan */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mekan <span className="text-gray-400">(opsiyonel)</span>
          </label>
          <select
            value={form.venueId}
            onChange={(e) => setForm({ ...form, venueId: e.target.value })}
            disabled={!form.districtId}
            className={selectClass}
            aria-label="Mekan seçin"
          >
            <option value="">Mekan henüz belli değil</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>

        {/* Tarih/Saat */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tarih ve Saat *
          </label>
          <input
            id="dateTime"
            type="datetime-local"
            required
            value={form.dateTime}
            onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
            min={new Date().toISOString().slice(0, 16)}
            className={selectClass}
            aria-label="Tarih ve saat seçin"
          />
        </div>

        {/* Seviye */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seviye *
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "BEGINNER", label: "🌱 Başlangıç", active: "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" },
              { value: "INTERMEDIATE", label: "🔥 Orta", active: "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300" },
              { value: "ADVANCED", label: "⚡ İleri", active: "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300" },
            ].map((l) => (
              <button
                key={l.value}
                type="button"
                onClick={() => setForm({ ...form, level: l.value as typeof form.level })}
                className={`p-2 rounded-lg border-2 text-sm text-center transition ${
                  form.level === l.value
                    ? l.active
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
                aria-pressed={form.level === l.value}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Açıklama */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Açıklama
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            maxLength={1000}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            placeholder="İlanınız hakkında detay ekleyin (max 1000 karakter)..."
          />
        </div>

        <Button
          type="submit"
          size="lg"
          loading={loading}
          disabled={!form.type || !form.level}
          className="w-full text-lg"
        >
          İlanı Yayınla
        </Button>
      </form>
    </div>
  );
}
