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
    allowedGender: "ANY" as string,
    description: "",
  });
  const [venueRentalForm, setVenueRentalForm] = useState({ facilityType: "", courtCount: "", pricePerHour: "", pricePerSession: "", minDuration: "", availableSlots: "", surfaceType: "", hasLighting: false });
  const [venueMembershipForm, setVenueMembershipForm] = useState({ membershipType: "", price: "", includes: "", trialAvailable: false, trialPrice: "", maxMembers: "" });
  const [venueClassForm, setVenueClassForm] = useState({ className: "", schedule: "", instructorName: "", pricePerSession: "", priceMonthly: "", difficulty: "", maxParticipants: "" });
  const [venueProductForm, setVenueProductForm] = useState({ productName: "", brand: "", price: "", productCategory: "", unit: "adet", inStock: true });
  const [venueEventForm, setVenueEventForm] = useState({ eventType: "", startDate: "", endDate: "", maxParticipants: "", entryFee: "", registrationDeadline: "" });
  const [venueServiceForm, setVenueServiceForm] = useState({ serviceType: "", pricePerSession: "", sessionDuration: "", qualifications: "" });

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
          allowedGender: l.allowedGender ?? "ANY",
          description: l.description ?? "",
        });
        if (l.venueRentalDetail) {
          setVenueRentalForm({
            facilityType: l.venueRentalDetail.facilityType ?? "",
            courtCount: String(l.venueRentalDetail.courtCount ?? ""),
            pricePerHour: l.venueRentalDetail.pricePerHour != null ? String(l.venueRentalDetail.pricePerHour) : "",
            pricePerSession: l.venueRentalDetail.pricePerSession != null ? String(l.venueRentalDetail.pricePerSession) : "",
            minDuration: l.venueRentalDetail.minDuration != null ? String(l.venueRentalDetail.minDuration) : "",
            availableSlots: l.venueRentalDetail.availableSlots ?? "",
            surfaceType: l.venueRentalDetail.surfaceType ?? "",
            hasLighting: l.venueRentalDetail.hasLighting ?? false,
          });
        }
        if (l.venueMembershipDetail) {
          setVenueMembershipForm({
            membershipType: l.venueMembershipDetail.membershipType ?? "",
            price: String(l.venueMembershipDetail.price ?? ""),
            includes: l.venueMembershipDetail.includes?.join(", ") ?? "",
            trialAvailable: l.venueMembershipDetail.trialAvailable ?? false,
            trialPrice: l.venueMembershipDetail.trialPrice != null ? String(l.venueMembershipDetail.trialPrice) : "",
            maxMembers: l.venueMembershipDetail.maxMembers != null ? String(l.venueMembershipDetail.maxMembers) : "",
          });
        }
        if (l.venueClassDetail) {
          setVenueClassForm({
            className: l.venueClassDetail.className ?? "",
            schedule: l.venueClassDetail.schedule ?? "",
            instructorName: l.venueClassDetail.instructorName ?? "",
            pricePerSession: l.venueClassDetail.pricePerSession != null ? String(l.venueClassDetail.pricePerSession) : "",
            priceMonthly: l.venueClassDetail.priceMonthly != null ? String(l.venueClassDetail.priceMonthly) : "",
            difficulty: l.venueClassDetail.difficulty ?? "",
            maxParticipants: l.venueClassDetail.maxParticipants != null ? String(l.venueClassDetail.maxParticipants) : "",
          });
        }
        if (l.venueProductDetail) {
          setVenueProductForm({
            productName: l.venueProductDetail.productName ?? "",
            brand: l.venueProductDetail.brand ?? "",
            price: String(l.venueProductDetail.price ?? ""),
            productCategory: l.venueProductDetail.productCategory ?? "",
            unit: l.venueProductDetail.unit ?? "adet",
            inStock: l.venueProductDetail.inStock ?? true,
          });
        }
        if (l.venueEventDetail) {
          const toLocal = (value?: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
          setVenueEventForm({
            eventType: l.venueEventDetail.eventType ?? "",
            startDate: toLocal(l.venueEventDetail.startDate),
            endDate: toLocal(l.venueEventDetail.endDate),
            maxParticipants: l.venueEventDetail.maxParticipants != null ? String(l.venueEventDetail.maxParticipants) : "",
            entryFee: l.venueEventDetail.entryFee != null ? String(l.venueEventDetail.entryFee) : "",
            registrationDeadline: toLocal(l.venueEventDetail.registrationDeadline),
          });
        }
        if (l.venueServiceDetail) {
          setVenueServiceForm({
            serviceType: l.venueServiceDetail.serviceType ?? "",
            pricePerSession: l.venueServiceDetail.pricePerSession != null ? String(l.venueServiceDetail.pricePerSession) : "",
            sessionDuration: l.venueServiceDetail.sessionDuration != null ? String(l.venueServiceDetail.sessionDuration) : "",
            qualifications: l.venueServiceDetail.qualifications ?? "",
          });
        }
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
      const isVenueListingType = form.type.startsWith("VENUE_");
      const payload: Record<string, unknown> = {
        type: form.type,
        sportId: form.sportId,
        countryId: form.countryId || null,
        cityId: form.cityId || null,
        districtId: form.districtId,
        venueId: form.venueId || null,
        ...(form.type !== "EQUIPMENT" && !isVenueListingType && form.dateTime ? { dateTime: form.dateTime } : {}),
        ...(form.type === "TRAINER" && form.dateTime ? { dateTime: form.dateTime } : {}),
        ...(form.type !== "EQUIPMENT" && !isVenueListingType ? { level: form.level } : {}),
        allowedGender: form.allowedGender,
        description: form.description || undefined,
      };

      if (form.type === "VENUE_RENTAL") {
        payload.venueRentalDetail = {
          facilityType: venueRentalForm.facilityType || undefined,
          courtCount: venueRentalForm.courtCount ? parseInt(venueRentalForm.courtCount) : undefined,
          pricePerHour: venueRentalForm.pricePerHour ? parseFloat(venueRentalForm.pricePerHour) : null,
          pricePerSession: venueRentalForm.pricePerSession ? parseFloat(venueRentalForm.pricePerSession) : null,
          minDuration: venueRentalForm.minDuration ? parseInt(venueRentalForm.minDuration) : null,
          availableSlots: venueRentalForm.availableSlots || null,
          surfaceType: venueRentalForm.surfaceType || null,
          hasLighting: venueRentalForm.hasLighting,
        };
      }
      if (form.type === "VENUE_MEMBERSHIP") {
        payload.venueMembershipDetail = {
          membershipType: venueMembershipForm.membershipType || undefined,
          price: venueMembershipForm.price ? parseFloat(venueMembershipForm.price) : undefined,
          includes: venueMembershipForm.includes ? venueMembershipForm.includes.split(",").map((item) => item.trim()).filter(Boolean) : [],
          trialAvailable: venueMembershipForm.trialAvailable,
          trialPrice: venueMembershipForm.trialPrice ? parseFloat(venueMembershipForm.trialPrice) : null,
          maxMembers: venueMembershipForm.maxMembers ? parseInt(venueMembershipForm.maxMembers) : null,
        };
      }
      if (form.type === "VENUE_CLASS") {
        payload.venueClassDetail = {
          className: venueClassForm.className || undefined,
          schedule: venueClassForm.schedule || null,
          instructorName: venueClassForm.instructorName || null,
          pricePerSession: venueClassForm.pricePerSession ? parseFloat(venueClassForm.pricePerSession) : null,
          priceMonthly: venueClassForm.priceMonthly ? parseFloat(venueClassForm.priceMonthly) : null,
          difficulty: venueClassForm.difficulty || null,
          maxParticipants: venueClassForm.maxParticipants ? parseInt(venueClassForm.maxParticipants) : null,
        };
      }
      if (form.type === "VENUE_PRODUCT") {
        payload.venueProductDetail = {
          productCategory: venueProductForm.productCategory || undefined,
          productName: venueProductForm.productName || undefined,
          brand: venueProductForm.brand || null,
          price: venueProductForm.price ? parseFloat(venueProductForm.price) : undefined,
          unit: venueProductForm.unit || undefined,
          inStock: venueProductForm.inStock,
        };
      }
      if (form.type === "VENUE_EVENT") {
        payload.venueEventDetail = {
          eventType: venueEventForm.eventType || undefined,
          startDate: venueEventForm.startDate || null,
          endDate: venueEventForm.endDate || null,
          entryFee: venueEventForm.entryFee ? parseFloat(venueEventForm.entryFee) : null,
          maxParticipants: venueEventForm.maxParticipants ? parseInt(venueEventForm.maxParticipants) : null,
          registrationDeadline: venueEventForm.registrationDeadline || null,
        };
      }
      if (form.type === "VENUE_SERVICE") {
        payload.venueServiceDetail = {
          serviceType: venueServiceForm.serviceType || undefined,
          sessionDuration: venueServiceForm.sessionDuration ? parseInt(venueServiceForm.sessionDuration) : null,
          pricePerSession: venueServiceForm.pricePerSession ? parseFloat(venueServiceForm.pricePerSession) : null,
          qualifications: venueServiceForm.qualifications || null,
        };
      }

      await updateListing(id, payload);
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
  const isVenueUser = (session.user as any)?.userType === "VENUE" || form.type.startsWith("VENUE_");
  const isVenueListingType = form.type.startsWith("VENUE_");

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
            {(["RIVAL", "PARTNER", "TRAINER", "EQUIPMENT"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, type: t })}
                className={`p-3 rounded-lg border-2 text-center transition text-sm font-medium ${
                  form.type === t
                    ? t === "RIVAL"
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300"
                      : t === "TRAINER"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : t === "EQUIPMENT"
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
                      : "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                }`}
                aria-pressed={form.type === t}
              >
                {t === "RIVAL" ? "🥊 Rakip Arıyorum" : t === "TRAINER" ? "🎓 Eğitmen İlanı" : t === "EQUIPMENT" ? "🛒 Spor Malzemesi" : "🤝 Partner Arıyorum"}
              </button>
            ))}
          </div>
          {isVenueUser && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { value: "VENUE_RENTAL", label: "🏟️ Kiralama" },
                { value: "VENUE_MEMBERSHIP", label: "💳 Üyelik" },
                { value: "VENUE_CLASS", label: "📚 Ders / Kurs" },
                { value: "VENUE_PRODUCT", label: "🛍️ Ürün" },
                { value: "VENUE_EVENT", label: "🎉 Etkinlik" },
                { value: "VENUE_SERVICE", label: "🔧 Hizmet" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: item.value })}
                  className={`p-3 rounded-lg border-2 text-center transition text-sm font-medium ${form.type === item.value ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
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

        {form.type !== "EQUIPMENT" && !isVenueListingType && (
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
        )}

        {form.type !== "EQUIPMENT" && !isVenueListingType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seviye *</label>
            <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className={selectClass} required>
              <option value="">Seviye seçin</option>
              <option value="BEGINNER">🌱 Başlangıç</option>
              <option value="INTERMEDIATE">🔥 Orta</option>
              <option value="ADVANCED">⚡ İleri</option>
            </select>
          </div>
        )}

        {form.type === "VENUE_RENTAL" && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-3 dark:border-teal-800 dark:bg-teal-900/20">
            <p className="font-medium text-teal-800 dark:text-teal-200">🏟️ Kiralama Detayları</p>
            <div className="grid grid-cols-2 gap-3">
              <select value={venueRentalForm.facilityType} onChange={(e) => setVenueRentalForm({ ...venueRentalForm, facilityType: e.target.value })} className={selectClass}>
                <option value="">Alan tipi</option>
                <option value="saha">Saha</option>
                <option value="kort">Kort</option>
                <option value="havuz">Havuz</option>
                <option value="salon">Salon</option>
                <option value="ring">Ring</option>
              </select>
              <input value={venueRentalForm.courtCount} onChange={(e) => setVenueRentalForm({ ...venueRentalForm, courtCount: e.target.value })} className={selectClass} placeholder="Alan sayısı" type="number" min="1" />
              <input value={venueRentalForm.pricePerHour} onChange={(e) => setVenueRentalForm({ ...venueRentalForm, pricePerHour: e.target.value })} className={selectClass} placeholder="Saatlik fiyat" type="number" min="0" />
              <input value={venueRentalForm.pricePerSession} onChange={(e) => setVenueRentalForm({ ...venueRentalForm, pricePerSession: e.target.value })} className={selectClass} placeholder="Seans fiyatı" type="number" min="0" />
              <input value={venueRentalForm.minDuration} onChange={(e) => setVenueRentalForm({ ...venueRentalForm, minDuration: e.target.value })} className={selectClass} placeholder="Min. süre" type="number" min="0" />
              <input value={venueRentalForm.surfaceType} onChange={(e) => setVenueRentalForm({ ...venueRentalForm, surfaceType: e.target.value })} className={selectClass} placeholder="Zemin" />
            </div>
            <textarea value={venueRentalForm.availableSlots} onChange={(e) => setVenueRentalForm({ ...venueRentalForm, availableSlots: e.target.value })} rows={2} className={`${selectClass} resize-none`} placeholder="Müsait saatler" />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={venueRentalForm.hasLighting} onChange={(e) => setVenueRentalForm({ ...venueRentalForm, hasLighting: e.target.checked })} className="accent-teal-500" />
              Aydınlatma var
            </label>
          </div>
        )}

        {form.type === "VENUE_MEMBERSHIP" && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3 dark:border-indigo-800 dark:bg-indigo-900/20">
            <p className="font-medium text-indigo-800 dark:text-indigo-200">💳 Üyelik Detayları</p>
            <div className="grid grid-cols-2 gap-3">
              <input value={venueMembershipForm.membershipType} onChange={(e) => setVenueMembershipForm({ ...venueMembershipForm, membershipType: e.target.value })} className={selectClass} placeholder="Üyelik türü" />
              <input value={venueMembershipForm.price} onChange={(e) => setVenueMembershipForm({ ...venueMembershipForm, price: e.target.value })} className={selectClass} placeholder="Fiyat" type="number" min="0" />
              <input value={venueMembershipForm.maxMembers} onChange={(e) => setVenueMembershipForm({ ...venueMembershipForm, maxMembers: e.target.value })} className={selectClass} placeholder="Kontenjan" type="number" min="0" />
              <input value={venueMembershipForm.trialPrice} onChange={(e) => setVenueMembershipForm({ ...venueMembershipForm, trialPrice: e.target.value })} className={selectClass} placeholder="Deneme fiyatı" type="number" min="0" />
            </div>
            <textarea value={venueMembershipForm.includes} onChange={(e) => setVenueMembershipForm({ ...venueMembershipForm, includes: e.target.value })} rows={2} className={`${selectClass} resize-none`} placeholder="Dahil hizmetler, virgülle ayır" />
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={venueMembershipForm.trialAvailable} onChange={(e) => setVenueMembershipForm({ ...venueMembershipForm, trialAvailable: e.target.checked })} className="accent-indigo-500" />
              Deneme paketi var
            </label>
          </div>
        )}

        {form.type === "VENUE_CLASS" && (
          <div className="rounded-xl border border-pink-200 bg-pink-50 p-4 space-y-3 dark:border-pink-800 dark:bg-pink-900/20">
            <p className="font-medium text-pink-800 dark:text-pink-200">📚 Ders / Kurs Detayları</p>
            <div className="grid grid-cols-2 gap-3">
              <input value={venueClassForm.className} onChange={(e) => setVenueClassForm({ ...venueClassForm, className: e.target.value })} className={selectClass} placeholder="Ders adı" />
              <input value={venueClassForm.instructorName} onChange={(e) => setVenueClassForm({ ...venueClassForm, instructorName: e.target.value })} className={selectClass} placeholder="Eğitmen" />
              <input value={venueClassForm.schedule} onChange={(e) => setVenueClassForm({ ...venueClassForm, schedule: e.target.value })} className={selectClass} placeholder="Program" />
              <input value={venueClassForm.difficulty} onChange={(e) => setVenueClassForm({ ...venueClassForm, difficulty: e.target.value })} className={selectClass} placeholder="Zorluk" />
              <input value={venueClassForm.pricePerSession} onChange={(e) => setVenueClassForm({ ...venueClassForm, pricePerSession: e.target.value })} className={selectClass} placeholder="Seans fiyatı" type="number" min="0" />
              <input value={venueClassForm.priceMonthly} onChange={(e) => setVenueClassForm({ ...venueClassForm, priceMonthly: e.target.value })} className={selectClass} placeholder="Aylık fiyat" type="number" min="0" />
              <input value={venueClassForm.maxParticipants} onChange={(e) => setVenueClassForm({ ...venueClassForm, maxParticipants: e.target.value })} className={selectClass} placeholder="Kontenjan" type="number" min="1" />
            </div>
          </div>
        )}

        {form.type === "VENUE_PRODUCT" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="font-medium text-amber-800 dark:text-amber-200">🛍️ Ürün Detayları</p>
            <div className="grid grid-cols-2 gap-3">
              <input value={venueProductForm.productName} onChange={(e) => setVenueProductForm({ ...venueProductForm, productName: e.target.value })} className={selectClass} placeholder="Ürün adı" />
              <input value={venueProductForm.brand} onChange={(e) => setVenueProductForm({ ...venueProductForm, brand: e.target.value })} className={selectClass} placeholder="Marka" />
              <input value={venueProductForm.price} onChange={(e) => setVenueProductForm({ ...venueProductForm, price: e.target.value })} className={selectClass} placeholder="Fiyat" type="number" min="0" />
              <input value={venueProductForm.productCategory} onChange={(e) => setVenueProductForm({ ...venueProductForm, productCategory: e.target.value })} className={selectClass} placeholder="Kategori" />
              <input value={venueProductForm.unit} onChange={(e) => setVenueProductForm({ ...venueProductForm, unit: e.target.value })} className={selectClass} placeholder="Birim" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={venueProductForm.inStock} onChange={(e) => setVenueProductForm({ ...venueProductForm, inStock: e.target.checked })} className="accent-amber-500" />
              Stokta mevcut
            </label>
          </div>
        )}

        {form.type === "VENUE_EVENT" && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3 dark:border-rose-800 dark:bg-rose-900/20">
            <p className="font-medium text-rose-800 dark:text-rose-200">🎉 Etkinlik Detayları</p>
            <div className="grid grid-cols-2 gap-3">
              <input value={venueEventForm.eventType} onChange={(e) => setVenueEventForm({ ...venueEventForm, eventType: e.target.value })} className={selectClass} placeholder="Etkinlik türü" />
              <input value={venueEventForm.maxParticipants} onChange={(e) => setVenueEventForm({ ...venueEventForm, maxParticipants: e.target.value })} className={selectClass} placeholder="Kontenjan" type="number" min="1" />
              <input value={venueEventForm.startDate} onChange={(e) => setVenueEventForm({ ...venueEventForm, startDate: e.target.value })} className={selectClass} type="datetime-local" />
              <input value={venueEventForm.endDate} onChange={(e) => setVenueEventForm({ ...venueEventForm, endDate: e.target.value })} className={selectClass} type="datetime-local" />
              <input value={venueEventForm.entryFee} onChange={(e) => setVenueEventForm({ ...venueEventForm, entryFee: e.target.value })} className={selectClass} placeholder="Katılım ücreti" type="number" min="0" />
              <input value={venueEventForm.registrationDeadline} onChange={(e) => setVenueEventForm({ ...venueEventForm, registrationDeadline: e.target.value })} className={selectClass} type="datetime-local" />
            </div>
          </div>
        )}

        {form.type === "VENUE_SERVICE" && (
          <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4 space-y-3 dark:border-cyan-800 dark:bg-cyan-900/20">
            <p className="font-medium text-cyan-800 dark:text-cyan-200">🔧 Hizmet Detayları</p>
            <div className="grid grid-cols-2 gap-3">
              <input value={venueServiceForm.serviceType} onChange={(e) => setVenueServiceForm({ ...venueServiceForm, serviceType: e.target.value })} className={selectClass} placeholder="Hizmet türü" />
              <input value={venueServiceForm.pricePerSession} onChange={(e) => setVenueServiceForm({ ...venueServiceForm, pricePerSession: e.target.value })} className={selectClass} placeholder="Fiyat" type="number" min="0" />
              <input value={venueServiceForm.sessionDuration} onChange={(e) => setVenueServiceForm({ ...venueServiceForm, sessionDuration: e.target.value })} className={selectClass} placeholder="Süre" type="number" min="1" />
            </div>
            <textarea value={venueServiceForm.qualifications} onChange={(e) => setVenueServiceForm({ ...venueServiceForm, qualifications: e.target.value })} rows={2} className={`${selectClass} resize-none`} placeholder="Uzmanlık / nitelikler" />
          </div>
        )}

        {/* Cinsiyet Kısıtı */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cinsiyet Kısıtı</label>
          <select value={form.allowedGender} onChange={(e) => setForm({ ...form, allowedGender: e.target.value })} className={selectClass}>
            <option value="ANY">Farketmez</option>
            <option value="MALE_ONLY">Sadece Erkek</option>
            <option value="FEMALE_ONLY">Sadece Kadın</option>
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
