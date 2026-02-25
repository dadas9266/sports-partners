"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useLocations, useSports, useVenues } from "@/hooks/useLocations";
import { createListing } from "@/services/api";
import type { CreateListingForm, ListingType } from "@/types";
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
    maxParticipants: 2,
    allowedGender: "ANY",
    isQuick: false,
    expiresAt: "",
    isRecurring: false,
    recurringDays: [],
  });

  // Trainer extra fields
  const [trainerForm, setTrainerForm] = useState({ hourlyRate: "", experience: "", specialization: "", gymName: "", gymAddress: "" });
  // Equipment extra fields
  const [equipForm, setEquipForm] = useState({ price: "", condition: "", brand: "", model: "" });
  const [equipImages, setEquipImages] = useState<File[]>([]);
  const [equipPreviews, setEquipPreviews] = useState<string[]>([]);
  const [uploadingEquip, setUploadingEquip] = useState(false);
  // Google Places venues
  const [smartVenues, setSmartVenues] = useState<any[]>([]);
  const [smartVenuesLoading, setSmartVenuesLoading] = useState(false);

  const { venues } = useVenues(form.districtId);

  const cities = locations.find((l) => l.id === form.countryId)?.cities || [];
  const districts = cities.find((c) => c.id === form.cityId)?.districts || [];
  const selectedSport = sports.find((s) => s.id === form.sportId);
  const selectedDistrict = districts.find((d) => d.id === form.districtId);

  // Spor dalı veya ilçe değişince mekanları otomatik yükle
  useEffect(() => {
    if (!selectedSport || !selectedDistrict) {
      setSmartVenues([]);
      return;
    }
    let cancelled = false;
    setSmartVenuesLoading(true);
    setSmartVenues([]);
    fetch(`/api/places?sport=${encodeURIComponent(selectedSport.name)}&district=${encodeURIComponent(selectedDistrict.name)}`)
      .then((r) => r.json())
      .then((json) => { if (!cancelled && Array.isArray(json.venues)) setSmartVenues(json.venues); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSmartVenuesLoading(false); });
    return () => { cancelled = true; };
  }, [form.sportId, form.districtId]);

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
      // Upload equipment images if any
      const uploadedEquipUrls: string[] = [];
      if (form.type === "EQUIPMENT" && equipImages.length > 0) {
        setUploadingEquip(true);
        for (const file of equipImages) {
          const fd = new FormData();
          fd.append("type", "equipment");
          fd.append("file", file);
          const r = await fetch("/api/upload", { method: "POST", body: fd });
          const j = await r.json();
          if (j.url) uploadedEquipUrls.push(j.url);
        }
        setUploadingEquip(false);
      }
      const payload: any = {
        type: form.type as string,
        sportId: form.sportId,
        districtId: form.districtId,
        venueId: form.venueId || null,
        dateTime: form.type === "EQUIPMENT" ? new Date().toISOString() : form.dateTime,
        level: form.type === "EQUIPMENT" ? "BEGINNER" : form.level as string,
        description: form.description || undefined,
        maxParticipants: form.maxParticipants,
        allowedGender: form.allowedGender,
        isQuick: false,
        isRecurring: false,
        recurringDays: [],
      };
      if (form.type === "TRAINER") {
        payload.trainerProfile = {
          hourlyRate: trainerForm.hourlyRate ? parseFloat(trainerForm.hourlyRate) : undefined,
          experience: trainerForm.experience ? parseInt(trainerForm.experience) : undefined,
          specialization: trainerForm.specialization || undefined,
          gymName: trainerForm.gymName || undefined,
          gymAddress: trainerForm.gymAddress || undefined,
        };
      }
      if (form.type === "EQUIPMENT") {
        payload.equipmentDetail = {
          price: equipForm.price ? parseFloat(equipForm.price) : undefined,
          condition: equipForm.condition || undefined,
          brand: equipForm.brand || undefined,
          model: equipForm.model || undefined,
          images: uploadedEquipUrls,
        };
      }
      if (form.type !== "EQUIPMENT") {
        payload.isQuick = form.isQuick;
        payload.expiresAt = form.isQuick && form.expiresAt ? form.expiresAt : undefined;
        payload.isRecurring = form.isRecurring;
        payload.recurringDays = form.recurringDays;
      }
      const data = await createListing(payload);
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
            {[
              { value: "RIVAL", label: "🥊 Rakip Arıyorum", active: "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300" },
              { value: "PARTNER", label: "🤝 Partner Arıyorum", active: "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" },
              { value: "TRAINER", label: "🎓 Eğitmen İlanı", active: "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" },
              { value: "EQUIPMENT", label: "🛒 Spor Malzemesi", active: "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300" },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, type: t.value as ListingType })}
                className={`p-3 rounded-lg border-2 text-center transition text-sm font-medium ${
                  form.type === t.value ? t.active : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
                aria-pressed={form.type === t.value}
              >
                {t.label}
              </button>
            ))}
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
            Mekan
            {smartVenuesLoading && (
              <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400 animate-pulse">📍 Yakındaki mekanlar aranıyor...</span>
            )}
            {!smartVenuesLoading && smartVenues.length > 0 && (
              <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">{smartVenues.length} mekan bulundu</span>
            )}
          </label>
          <select
            value={form.venueId}
            onChange={(e) => setForm({ ...form, venueId: e.target.value })}
            disabled={!form.districtId || smartVenuesLoading}
            className={selectClass}
            aria-label="Mekan seçin"
          >
            <option value="">{smartVenuesLoading ? "Mekanlar yükleniyor..." : "Belirtmek istemiyorum"}</option>
            {smartVenues.length > 0 && (
              <optgroup label="📍 Yakındaki Mekanlar (OpenStreetMap)">
                {smartVenues.map((v: any) => (
                  <option key={v.place_id} value={v.place_id}>
                    {v.name}{v.vicinity ? ` — ${v.vicinity}` : ""}
                  </option>
                ))}
              </optgroup>
            )}
            {venues.length > 0 && (
              <optgroup label="🏟️ Kayıtlı Mekanlar">
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        {/* Tarih/Saat (EQUIPMENT için gösterilmez) */}
        {form.type !== "EQUIPMENT" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tarih ve Saat {form.type !== "TRAINER" ? "*" : "(antrenman başlangıcı)"}
            </label>
            <input
              id="dateTime"
              type="datetime-local"
              required={form.type !== "TRAINER"}
              value={form.dateTime}
              onChange={(e) => setForm({ ...form, dateTime: e.target.value })}
              min={new Date().toISOString().slice(0, 16)}
              className={selectClass}
              aria-label="Tarih ve saat seçin"
            />
          </div>
        )}

        {/* ── Eğitmen Alanları ── */}
        {form.type === "TRAINER" && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-blue-800 dark:text-blue-200 text-sm">🎓 Eğitmen Bilgileri</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Saatlik Ücret (₺)</label>
                <input type="number" min="0" value={trainerForm.hourlyRate} onChange={(e) => setTrainerForm({ ...trainerForm, hourlyRate: e.target.value })} className={selectClass} placeholder="200" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Deneyim (Yıl)</label>
                <input type="number" min="0" value={trainerForm.experience} onChange={(e) => setTrainerForm({ ...trainerForm, experience: e.target.value })} className={selectClass} placeholder="5" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Uzmanlık Alanı</label>
              <input type="text" value={trainerForm.specialization} onChange={(e) => setTrainerForm({ ...trainerForm, specialization: e.target.value })} className={selectClass} placeholder="Kondisyon, teknik, taktik..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Spor Salonu Adı</label>
                <input type="text" value={trainerForm.gymName} onChange={(e) => setTrainerForm({ ...trainerForm, gymName: e.target.value })} className={selectClass} placeholder="Opsiyonel" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Spor Salonu Adresi</label>
                <input type="text" value={trainerForm.gymAddress} onChange={(e) => setTrainerForm({ ...trainerForm, gymAddress: e.target.value })} className={selectClass} placeholder="Opsiyonel" />
              </div>
            </div>
          </div>
        )}

        {/* ── Ekipman Alanları ── */}
        {form.type === "EQUIPMENT" && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 space-y-3">
            <p className="font-semibold text-purple-800 dark:text-purple-200 text-sm">🛒 Ürün Bilgileri</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Fiyat (₺) *</label>
                <input type="number" min="0" required value={equipForm.price} onChange={(e) => setEquipForm({ ...equipForm, price: e.target.value })} className={selectClass} placeholder="500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Durum *</label>
                <select required value={equipForm.condition} onChange={(e) => setEquipForm({ ...equipForm, condition: e.target.value })} className={selectClass}>
                  <option value="">Seçiniz</option>
                  <option value="NEW">✨ Sıfır</option>
                  <option value="LIKE_NEW">🌟 Sıfır Gibi</option>
                  <option value="GOOD">👍 İyi</option>
                  <option value="FAIR">🔧 Orta</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Marka</label>
                <input type="text" value={equipForm.brand} onChange={(e) => setEquipForm({ ...equipForm, brand: e.target.value })} className={selectClass} placeholder="Nike, Adidas..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
                <input type="text" value={equipForm.model} onChange={(e) => setEquipForm({ ...equipForm, model: e.target.value })} className={selectClass} placeholder="Seri / Model no" />
              </div>
            </div>
            {/* Image upload */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Ürün Fotoğrafları (max 4)</label>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-purple-700 dark:text-purple-300 hover:text-purple-800 transition">
                <span className="bg-purple-100 dark:bg-purple-900/40 border border-purple-300 dark:border-purple-700 px-3 py-1.5 rounded-lg">📷 Fotoğraf Seç</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                  const files = Array.from(e.target.files || []).slice(0, 4);
                  setEquipImages(files);
                  setEquipPreviews(files.map((f) => URL.createObjectURL(f)));
                }} />
              </label>
              {equipPreviews.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {equipPreviews.map((src, i) => (
                    <img key={i} src={src} alt="" className="h-20 w-20 object-cover rounded-lg border border-purple-200 dark:border-purple-700" />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Seviye (EQUIPMENT için gizle) */}
        {form.type !== "EQUIPMENT" && (
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
        )}

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

        {/* Katılımcı Sayısı (sadece Partner için) */}
        {form.type === "PARTNER" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Maksimum Katılımcı Sayısı
              {form.maxParticipants > 2 && (
                <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                  👥 Grup İlanı
                </span>
              )}
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={2}
                max={20}
                value={form.maxParticipants}
                onChange={(e) => setForm({ ...form, maxParticipants: Number(e.target.value) })}
                className="flex-1 accent-emerald-500"
              />
              <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-semibold px-3 py-1 rounded-lg text-sm min-w-[60px] text-center">
                {form.maxParticipants} kişi
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {form.maxParticipants === 2 ? "Standart 1v1 partner" : `${form.maxParticipants} kişilik grup aktivitesi`}
            </p>
          </div>
        )}

        {/* Cinsiyet Kısıtlı (EQUIPMENT için gizle) */}
        {form.type !== "EQUIPMENT" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Katılımcı Cinsiyeti
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "ANY", label: "🌐 Herkese Açık" },
              { value: "FEMALE_ONLY", label: "👩 Yalnızca Kadınlar" },
              { value: "MALE_ONLY", label: "👨 Yalnızca Erkekler" },
            ].map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setForm({ ...form, allowedGender: g.value as typeof form.allowedGender })}
                className={`p-2 rounded-lg border-2 text-sm text-center transition ${
                  form.allowedGender === g.value
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        )}

        {/* Hızlı İlan Modu (EQUIPMENT ve TRAINER için gizle) */}
        {form.type !== "EQUIPMENT" && form.type !== "TRAINER" && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">⚡ Hızlı İlan (Hadi Gel!)</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                İlan 2 saat içinde otomatik kapanır. Acil partner arayanlar için idealdir.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, isQuick: !form.isQuick })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.isQuick ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
              role="switch"
              aria-checked={form.isQuick}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.isQuick ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
        )}

        {/* Tekrarlayan Etkinlik */}
        {!form.isQuick && form.type !== "EQUIPMENT" && form.type !== "TRAINER" && (
          <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-medium text-violet-800 dark:text-violet-200">🔁 Tekrarlayan Etkinlik</p>
                <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                  Her hafta belirli günlerde tekrarlayan etkinlikler için.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm({ ...form, isRecurring: !form.isRecurring, recurringDays: [] })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  form.isRecurring ? "bg-violet-500" : "bg-gray-300 dark:bg-gray-600"
                }`}
                role="switch"
                aria-checked={form.isRecurring}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isRecurring ? "translate-x-7" : "translate-x-1"}`} />
              </button>
            </div>
            {form.isRecurring && (
              <div>
                <p className="text-xs font-medium text-violet-700 dark:text-violet-300 mb-2">Hangi günlerde tekrarlansın?</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: "MON", label: "Pzt" },
                    { value: "TUE", label: "Sal" },
                    { value: "WED", label: "Çar" },
                    { value: "THU", label: "Per" },
                    { value: "FRI", label: "Cum" },
                    { value: "SAT", label: "Cmt" },
                    { value: "SUN", label: "Paz" },
                  ].map((day) => {
                    const selected = form.recurringDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() =>
                          setForm({
                            ...form,
                            recurringDays: selected
                              ? form.recurringDays.filter((d) => d !== day.value)
                              : [...form.recurringDays, day.value],
                          })
                        }
                        className={`w-12 h-10 rounded-lg text-sm font-medium transition border-2 ${
                          selected
                            ? "border-violet-500 bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300"
                            : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          loading={loading || uploadingEquip}
          disabled={
            !form.type ||
            (form.type === "EQUIPMENT" ? (!equipForm.price || !equipForm.condition) : !form.level)
          }
          className="w-full text-lg"
        >
          {form.isQuick ? "⚡ Hızlı İlan Yayınla" : form.isRecurring ? "🔁 Tekrarlayan İlan Yayınla" : "İlanı Yayınla"}
        </Button>
      </form>
    </div>
  );
}
