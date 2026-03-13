"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { useLocations, useSports, useVenues } from "@/hooks/useLocations";
import { createListing } from "@/services/api";
import type { CreateListingForm, ListingType } from "@/types";
import Button from "@/components/ui/Button";
import LocationSelector from "@/components/LocationSelector";

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
    isUrgent: false,
    isAnonymous: false,
    expiresAt: "",
    isRecurring: false,
    recurringDays: [],
    minAge: null,
    maxAge: null,
    groupId: null,
    latitude: null,
    longitude: null,
  });

  const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "ok" | "denied">("idle");

  const [myGroups, setMyGroups] = useState<{ id: string; name: string; _count: { members: number } }[]>([]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/groups?limit=50")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setMyGroups(j.groups ?? []);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Trainer extra fields
  const [trainerForm, setTrainerForm] = useState({ experience: "", specialization: "", gymName: "", gymAddress: "" });
  // Equipment extra fields
  const [equipForm, setEquipForm] = useState({ price: "", condition: "", brand: "", model: "" });
  // Venue detail forms
  const [venueRentalForm, setVenueRentalForm] = useState({ rentalType: "", pricePerHour: "", capacity: "", surface: "", indoor: false });
  const [venueMembershipForm, setVenueMembershipForm] = useState({ planName: "", durationDays: "", features: "" });
  const [venueClassForm, setVenueClassForm] = useState({ className: "", instructor: "", durationMinutes: "", maxStudents: "", recurring: false });
  const [venueProductForm, setVenueProductForm] = useState({ productName: "", price: "", category: "", inStock: true });
  const [venueEventForm, setVenueEventForm] = useState({ eventName: "", eventDate: "", eventCapacity: "", entryFee: "" });
  const [venueServiceForm, setVenueServiceForm] = useState({ serviceName: "", price: "", durationMinutes: "" });
  const [equipImages, setEquipImages] = useState<File[]>([]);
  const [equipPreviews, setEquipPreviews] = useState<string[]>([]);
  const [uploadingEquip, setUploadingEquip] = useState(false);
  // Harita modal ve seçilen mekan - KALDIRILDI
  const [showMapPicker] = useState(false);
  const [selectedMapVenue, setSelectedMapVenue] = useState<null>(null);
  // Eski dropdown için (fallback)
  const [smartVenues, setSmartVenues] = useState<any[]>([]);
  const [smartVenuesLoading, setSmartVenuesLoading] = useState(false);

  const { venues } = useVenues(form.districtId);

  const cities = locations.find((l) => l.id === form.countryId)?.cities || [];
  const districts = cities.find((c) => c.id === form.cityId)?.districts || [];
  const selectedSport = sports.find((s) => s.id === form.sportId);
  const selectedDistrict = districts.find((d) => d.id === form.districtId);

  // Spor dalı veya ilçe değişince sıfırla
  useEffect(() => {
    setSelectedMapVenue(null);
    setSmartVenues([]);
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
      const isVenueType = (form.type as string).startsWith("VENUE_");
      const payload: any = {
        type: form.type as string,
        sportId: form.sportId,
        countryId: form.countryId || undefined,
        cityId: form.cityId || undefined,
        districtId: form.districtId || undefined,
        venueId: form.venueId || null,
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
        // EQUIPMENT ve VENUE_* için tarih gönderilmez; TRAINER için opsiyonel
        ...(!isVenueType && form.type !== "EQUIPMENT" && form.type !== "TRAINER" && { dateTime: form.dateTime }),
        ...(form.type === "TRAINER" && form.dateTime ? { dateTime: form.dateTime } : {}),
        level: (form.type === "EQUIPMENT" || isVenueType) ? "BEGINNER" : form.level as string,
        description: form.description || undefined,
        maxParticipants: form.maxParticipants,
        allowedGender: form.allowedGender,
        isQuick: false,
        isRecurring: false,
        recurringDays: [],
        minAge: form.minAge ?? undefined,
        maxAge: form.maxAge ?? undefined,
        groupId: form.groupId ?? undefined,
      };
      if (form.type === "TRAINER") {
        payload.trainerProfile = {
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
      // Venue detail payloads
      if (form.type === "VENUE_RENTAL") {
        payload.venueRentalDetail = {
          rentalType: venueRentalForm.rentalType || undefined,
          pricePerHour: venueRentalForm.pricePerHour ? parseFloat(venueRentalForm.pricePerHour) : undefined,
          capacity: venueRentalForm.capacity ? parseInt(venueRentalForm.capacity) : undefined,
          surface: venueRentalForm.surface || undefined,
          indoor: venueRentalForm.indoor,
        };
      }
      if (form.type === "VENUE_MEMBERSHIP") {
        payload.venueMembershipDetail = {
          planName: venueMembershipForm.planName || undefined,
          durationDays: venueMembershipForm.durationDays ? parseInt(venueMembershipForm.durationDays) : undefined,
          features: venueMembershipForm.features || undefined,
        };
      }
      if (form.type === "VENUE_CLASS") {
        payload.venueClassDetail = {
          className: venueClassForm.className || undefined,
          instructor: venueClassForm.instructor || undefined,
          durationMinutes: venueClassForm.durationMinutes ? parseInt(venueClassForm.durationMinutes) : undefined,
          maxStudents: venueClassForm.maxStudents ? parseInt(venueClassForm.maxStudents) : undefined,
          recurring: venueClassForm.recurring,
        };
      }
      if (form.type === "VENUE_PRODUCT") {
        payload.venueProductDetail = {
          productName: venueProductForm.productName || undefined,
          price: venueProductForm.price ? parseFloat(venueProductForm.price) : undefined,
          category: venueProductForm.category || undefined,
          inStock: venueProductForm.inStock,
        };
      }
      if (form.type === "VENUE_EVENT") {
        payload.venueEventDetail = {
          eventName: venueEventForm.eventName || undefined,
          eventDate: venueEventForm.eventDate || undefined,
          capacity: venueEventForm.eventCapacity ? parseInt(venueEventForm.eventCapacity) : undefined,
          entryFee: venueEventForm.entryFee ? parseFloat(venueEventForm.entryFee) : undefined,
        };
      }
      if (form.type === "VENUE_SERVICE") {
        payload.venueServiceDetail = {
          serviceName: venueServiceForm.serviceName || undefined,
          price: venueServiceForm.price ? parseFloat(venueServiceForm.price) : undefined,
          durationMinutes: venueServiceForm.durationMinutes ? parseInt(venueServiceForm.durationMinutes) : undefined,
        };
      }
      if (form.type !== "EQUIPMENT" && !isVenueType) {
        payload.isQuick = form.isQuick;
        payload.isUrgent = form.isUrgent;
        payload.expiresAt = form.isQuick && form.expiresAt ? form.expiresAt : undefined;
        payload.isRecurring = form.isRecurring;
        payload.recurringDays = form.recurringDays;
      }
      payload.isAnonymous = form.isAnonymous;
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

  const isVenueUser = (session.user as any)?.userType === "VENUE" || !!(session.user as any)?.venueProfile;
  const isVenueListingType = (form.type as string).startsWith("VENUE_");

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
          {/* TRAINER role info */}
          {form.type === "TRAINER" && (session?.user as any)?.userType !== "TRAINER" && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 p-3 text-sm text-blue-800 dark:text-blue-300">
              <span className="flex-shrink-0 text-base">ℹ️</span>
              <span>
                Eğitmen ilanı verebilmek için eğitmen başvurunuzun onaylanmış olması gerekir.
                Henüz başvurmadıysanız <a href="/profil" className="underline font-medium">profilinizden</a> başvurabilirsiniz.
              </span>
            </div>
          )}

          {/* Venue listing types - only for venue users */}
          {isVenueUser && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">🏢 İşletme İlanları</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { value: "VENUE_RENTAL", label: "🏟️ Saha/Salon Kiralama", active: "border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300" },
                  { value: "VENUE_MEMBERSHIP", label: "💳 Üyelik Paketi", active: "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300" },
                  { value: "VENUE_CLASS", label: "📚 Ders/Kurs", active: "border-pink-500 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300" },
                  { value: "VENUE_PRODUCT", label: "🛍️ Ürün Satışı", active: "border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300" },
                  { value: "VENUE_EVENT", label: "🎉 Etkinlik/Turnuva", active: "border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300" },
                  { value: "VENUE_SERVICE", label: "🔧 Hizmet", active: "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300" },
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
          )}
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
        <LocationSelector
          countryId={form.countryId}
          cityId={form.cityId}
          districtId={form.districtId}
          onChange={(updates) => setForm({ ...form, ...updates, venueId: "" })}
        />

        {/* GPS Konum Paylaşımı */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          {gpsStatus === "ok" ? (
            <span className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              📍 GPS konumu alındı — yakın kullanıcılara görünürsün
            </span>
          ) : gpsStatus === "denied" ? (
            <span className="text-sm text-amber-600 dark:text-amber-400">⚠️ Konum izni verilmedi — yakın ilan özelliği çalışmaz</span>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (!navigator.geolocation) {
                  setGpsStatus("denied");
                  return;
                }
                setGpsStatus("loading");
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setForm(f => ({ ...f, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
                    setGpsStatus("ok");
                  },
                  () => setGpsStatus("denied"),
                  { timeout: 8000 }
                );
              }}
              disabled={gpsStatus === "loading"}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium disabled:opacity-50 transition-colors"
            >
              {gpsStatus === "loading" ? (
                <><span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /> Konum alınıyor...</>
              ) : (
                <>📍 GPS konumumu paylaş <span className="text-xs text-gray-400 font-normal">(opsiyonel — yakın ilanlar için)</span></>
              )}
            </button>
          )}
          {gpsStatus === "ok" && (
            <button
              type="button"
              onClick={() => { setForm(f => ({ ...f, latitude: null, longitude: null })); setGpsStatus("idle"); }}
              className="ml-auto text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              ✕ Kaldır
            </button>
          )}
        </div>

        {/* Mekan (serbest metin) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mekan <span className="text-gray-400 font-normal">(opsiyonel)</span>
          </label>
          <input
            type="text"
            placeholder="Örn: Atatürk Spor Salonu, Merkez Parkı..."
            value={(form as any).venueText ?? ""}
            onChange={(e) => setForm({ ...form, ...(form as any), venueText: e.target.value })}
            className={selectClass}
          />
        </div>

        {/* Tarih/Saat (EQUIPMENT ve VENUE_* için gösterilmez) */}
        {form.type !== "EQUIPMENT" && !isVenueListingType && (
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

        {/* ─── VENUE_RENTAL: Saha/Salon Kiralama ─── */}
        {form.type === "VENUE_RENTAL" && (
          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4 space-y-3">
            <p className="font-medium text-teal-800 dark:text-teal-200">🏟️ Saha/Salon Kiralama Detayları</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Alan Tipi</label>
                <select value={venueRentalForm.rentalType} onChange={(e) => setVenueRentalForm({ ...venueRentalForm, rentalType: e.target.value })} className={selectClass}>
                  <option value="">Seçiniz</option>
                  <option value="FIELD">Saha</option>
                  <option value="COURT">Kort</option>
                  <option value="POOL">Havuz</option>
                  <option value="GYM">Salon</option>
                  <option value="RING">Ring</option>
                  <option value="OTHER">Diğer</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Saatlik Ücret (₺)</label>
                <input type="number" min="0" value={venueRentalForm.pricePerHour} onChange={(e) => setVenueRentalForm({ ...venueRentalForm, pricePerHour: e.target.value })} className={selectClass} placeholder="500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Kapasite (kişi)</label>
                <input type="number" min="1" value={venueRentalForm.capacity} onChange={(e) => setVenueRentalForm({ ...venueRentalForm, capacity: e.target.value })} className={selectClass} placeholder="22" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Zemin</label>
                <input type="text" value={venueRentalForm.surface} onChange={(e) => setVenueRentalForm({ ...venueRentalForm, surface: e.target.value })} className={selectClass} placeholder="Çim, Parke, Tartan..." />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={venueRentalForm.indoor} onChange={(e) => setVenueRentalForm({ ...venueRentalForm, indoor: e.target.checked })} className="accent-teal-500" />
              Kapalı Alan (İndoor)
            </label>
          </div>
        )}

        {/* ─── VENUE_MEMBERSHIP: Üyelik Paketi ─── */}
        {form.type === "VENUE_MEMBERSHIP" && (
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 space-y-3">
            <p className="font-medium text-indigo-800 dark:text-indigo-200">💳 Üyelik Paketi Detayları</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Paket Adı *</label>
              <input type="text" value={venueMembershipForm.planName} onChange={(e) => setVenueMembershipForm({ ...venueMembershipForm, planName: e.target.value })} className={selectClass} placeholder="Aylık Sınırsız, Haftalık VIP..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Süre (gün)</label>
                <input type="number" min="1" value={venueMembershipForm.durationDays} onChange={(e) => setVenueMembershipForm({ ...venueMembershipForm, durationDays: e.target.value })} className={selectClass} placeholder="30" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Paket Özellikleri</label>
              <textarea value={venueMembershipForm.features} onChange={(e) => setVenueMembershipForm({ ...venueMembershipForm, features: e.target.value })} rows={2} className={`${selectClass} resize-none`} placeholder="Sınırsız salon kullanımı, özel soyunma dolabı..." />
            </div>
          </div>
        )}

        {/* ─── VENUE_CLASS: Ders/Kurs ─── */}
        {form.type === "VENUE_CLASS" && (
          <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-xl p-4 space-y-3">
            <p className="font-medium text-pink-800 dark:text-pink-200">📚 Ders/Kurs Detayları</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Ders Adı *</label>
              <input type="text" value={venueClassForm.className} onChange={(e) => setVenueClassForm({ ...venueClassForm, className: e.target.value })} className={selectClass} placeholder="Yüzme Başlangıç, Pilates, Kickboks..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Eğitmen</label>
                <input type="text" value={venueClassForm.instructor} onChange={(e) => setVenueClassForm({ ...venueClassForm, instructor: e.target.value })} className={selectClass} placeholder="Ad Soyad" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Süre (dk)</label>
                <input type="number" min="1" value={venueClassForm.durationMinutes} onChange={(e) => setVenueClassForm({ ...venueClassForm, durationMinutes: e.target.value })} className={selectClass} placeholder="60" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max Öğrenci</label>
                <input type="number" min="1" value={venueClassForm.maxStudents} onChange={(e) => setVenueClassForm({ ...venueClassForm, maxStudents: e.target.value })} className={selectClass} placeholder="15" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 pb-2">
                  <input type="checkbox" checked={venueClassForm.recurring} onChange={(e) => setVenueClassForm({ ...venueClassForm, recurring: e.target.checked })} className="accent-pink-500" />
                  Tekrarlayan Ders
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ─── VENUE_PRODUCT: Ürün Satışı ─── */}
        {form.type === "VENUE_PRODUCT" && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3">
            <p className="font-medium text-amber-800 dark:text-amber-200">🛍️ Ürün Detayları</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Ürün Adı *</label>
              <input type="text" value={venueProductForm.productName} onChange={(e) => setVenueProductForm({ ...venueProductForm, productName: e.target.value })} className={selectClass} placeholder="Whey Protein, Dumbbell Set..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Fiyat (₺)</label>
                <input type="number" min="0" value={venueProductForm.price} onChange={(e) => setVenueProductForm({ ...venueProductForm, price: e.target.value })} className={selectClass} placeholder="250" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Kategori</label>
                <select value={venueProductForm.category} onChange={(e) => setVenueProductForm({ ...venueProductForm, category: e.target.value })} className={selectClass}>
                  <option value="">Seçiniz</option>
                  <option value="SUPPLEMENT">Supplement</option>
                  <option value="EQUIPMENT">Ekipman</option>
                  <option value="CLOTHING">Giyim</option>
                  <option value="ACCESSORY">Aksesuar</option>
                  <option value="OTHER">Diğer</option>
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={venueProductForm.inStock} onChange={(e) => setVenueProductForm({ ...venueProductForm, inStock: e.target.checked })} className="accent-amber-500" />
              Stokta Mevcut
            </label>
          </div>
        )}

        {/* ─── VENUE_EVENT: Etkinlik/Turnuva ─── */}
        {form.type === "VENUE_EVENT" && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 space-y-3">
            <p className="font-medium text-rose-800 dark:text-rose-200">🎉 Etkinlik/Turnuva Detayları</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Etkinlik Adı *</label>
              <input type="text" value={venueEventForm.eventName} onChange={(e) => setVenueEventForm({ ...venueEventForm, eventName: e.target.value })} className={selectClass} placeholder="Yaz Turnuvası, Açık Gün..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Etkinlik Tarihi *</label>
                <input type="datetime-local" value={venueEventForm.eventDate} onChange={(e) => setVenueEventForm({ ...venueEventForm, eventDate: e.target.value })} className={selectClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Katılımcı Kapasitesi</label>
                <input type="number" min="1" value={venueEventForm.eventCapacity} onChange={(e) => setVenueEventForm({ ...venueEventForm, eventCapacity: e.target.value })} className={selectClass} placeholder="100" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Katılım Ücreti (₺, boş = ücretsiz)</label>
              <input type="number" min="0" value={venueEventForm.entryFee} onChange={(e) => setVenueEventForm({ ...venueEventForm, entryFee: e.target.value })} className={selectClass} placeholder="0" />
            </div>
          </div>
        )}

        {/* ─── VENUE_SERVICE: Hizmet ─── */}
        {form.type === "VENUE_SERVICE" && (
          <div className="bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 rounded-xl p-4 space-y-3">
            <p className="font-medium text-cyan-800 dark:text-cyan-200">🔧 Hizmet Detayları</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Hizmet Adı *</label>
              <input type="text" value={venueServiceForm.serviceName} onChange={(e) => setVenueServiceForm({ ...venueServiceForm, serviceName: e.target.value })} className={selectClass} placeholder="Kişisel Antrenman, Fizyoterapi..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Fiyat (₺)</label>
                <input type="number" min="0" value={venueServiceForm.price} onChange={(e) => setVenueServiceForm({ ...venueServiceForm, price: e.target.value })} className={selectClass} placeholder="300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Süre (dk)</label>
                <input type="number" min="1" value={venueServiceForm.durationMinutes} onChange={(e) => setVenueServiceForm({ ...venueServiceForm, durationMinutes: e.target.value })} className={selectClass} placeholder="60" />
              </div>
            </div>
          </div>
        )}

        {/* Seviye (EQUIPMENT ve VENUE_* için gizle) */}
        {form.type !== "EQUIPMENT" && !isVenueListingType && (
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

        {/* Cinsiyet Kısıtlı (EQUIPMENT ve VENUE_* için gizle) */}
        {form.type !== "EQUIPMENT" && !isVenueListingType && (
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

        {/* Yaş Aralığı Kısıtlaması (EQUIPMENT ve VENUE_* dışındaki ilanlar için) */}
        {form.type !== "EQUIPMENT" && !isVenueListingType && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Başvuru Yaş Aralığı <span className="text-gray-400 font-normal">(opsiyonel)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Minimum Yaş</label>
              <input
                type="number"
                min="10"
                max="99"
                value={form.minAge ?? ""}
                onChange={(e) => setForm({ ...form, minAge: e.target.value ? Number(e.target.value) : null })}
                className={selectClass}
                placeholder="Örn: 18"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Maksimum Yaş</label>
              <input
                type="number"
                min="10"
                max="99"
                value={form.maxAge ?? ""}
                onChange={(e) => setForm({ ...form, maxAge: e.target.value ? Number(e.target.value) : null })}
                className={selectClass}
                placeholder="Örn: 40"
              />
            </div>
          </div>
          {(form.minAge || form.maxAge) && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              👤 {form.minAge && form.maxAge
                ? `${form.minAge}-${form.maxAge} yaş arası başvurabilir`
                : form.minAge
                ? `${form.minAge} yaş ve üstü başvurabilir`
                : `${form.maxAge} yaş ve altı başvurabilir`}
            </p>
          )}
        </div>
        )}

        {/* Grup Seçimi */}
        {myGroups.length > 0 && !isVenueListingType && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
          <p className="font-medium text-purple-800 dark:text-purple-200 mb-2">👥 Grup İlanı (Opsiyonel)</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mb-3">Bu ilanı bir grubunuzla ilişkilendirebilirsiniz.</p>
          <select
            value={form.groupId ?? ""}
            onChange={(e) => setForm({ ...form, groupId: e.target.value || null })}
            className="w-full border border-purple-300 dark:border-purple-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="">Grup seçme (bireysel ilan)</option>
            {myGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g._count.members} üye)
              </option>
            ))}
          </select>
        </div>
        )}

        {/* Hızlı İlan Modu (EQUIPMENT, TRAINER ve VENUE_* için gizle) */}
        {form.type !== "EQUIPMENT" && form.type !== "TRAINER" && !isVenueListingType && (
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
              onClick={() => setForm({ ...form, isQuick: !form.isQuick, isUrgent: false })}
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

        {/* ⚡ ACİL EŞleşme — 30 dakika, yakındakilere push bildirim */}
        {form.type !== "EQUIPMENT" && form.type !== "TRAINER" && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">⚡ Anlık Eşleşme — Gece Yarısı Maçı</p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                Şu an müsaitim! 30 dakikalık acil ilan açılır, aynı semtteki uygun kullanıcılara anında bildirim gider. İlk kabul eden eşleşir.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, isUrgent: !form.isUrgent, isQuick: false })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.isUrgent ? "bg-red-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
              role="switch"
              aria-checked={form.isUrgent}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.isUrgent ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {form.isUrgent && (
            <div className="mt-2 bg-red-100 dark:bg-red-900/30 rounded-lg px-3 py-2">
              <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                🔴 İlan oluşturulunca 30 dakika sayacı başlar. Bildirim gönderilen kullanıcıların başvurusu beklenir.
              </p>
            </div>
          )}
        </div>
        )}

        {/* 🕵️ KÖR MAÇ — Anonim İlan */}
        {form.type !== "EQUIPMENT" && form.type !== "TRAINER" && !isVenueListingType && (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">🕵️ Kör Maç — Anonim İlan</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Eşleşme gerçekleşene kadar profil bilgilerin gizlenir. Kadın kullanıcılar için güvenli eşleşme!
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, isAnonymous: !form.isAnonymous })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                form.isAnonymous ? "bg-gray-600" : "bg-gray-300 dark:bg-gray-600"
              }`}
              role="switch"
              aria-checked={form.isAnonymous}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  form.isAnonymous ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          {form.isAnonymous && (
            <div className="mt-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg px-3 py-2">
              <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                🔒 Başvuranlar sadece seviye, yaş aralığı ve spor bilgini görecek. Eşleşme onaylanan profil açılır.
              </p>
            </div>
          )}
        </div>
        )}

        {/* Tekrarlayan Etkinlik */}
        {!form.isQuick && form.type !== "EQUIPMENT" && form.type !== "TRAINER" && !isVenueListingType && (
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
            (form.type === "EQUIPMENT" ? (!equipForm.price || !equipForm.condition) : isVenueListingType ? false : !form.level)
          }
          className="w-full text-lg"
        >
          {form.isQuick ? "⚡ Hızlı İlan Yayınla" : form.isRecurring ? "🔁 Tekrarlayan İlan Yayınla" : "İlanı Yayınla"}
        </Button>
      </form>
    </div>
  );
}
