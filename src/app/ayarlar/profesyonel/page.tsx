"use client";

import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useSports } from "@/hooks/useLocations";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

const inputClass =
  "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

export default function ProfesyonelPage() {
  const { data, loading } = useProfile();
  const { sports } = useSports();
  const [tab, setTab] = useState<"trainer" | "venue">("trainer");
  const [submitting, setSubmitting] = useState(false);

  // Antrenör formu
  const [trainerForm, setTrainerForm] = useState({
    branches: [] as string[],
    gymName: "",
    experience: "",
    certNote: "",
  });

  // Mekan formu
  const [venueForm, setVenueForm] = useState({
    businessName: "",
    businessAddress: "",
    businessPhone: "",
    businessWebsite: "",
    capacity: "",
    facilityNote: "",
  });

  const userType = (data?.user as any)?.userType;
  const isTrainer = userType === "TRAINER";
  const isVenue = userType === "VENUE";

  const handleTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trainerForm.branches.length === 0) { toast.error("En az bir branş seçiniz"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile/pro-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "TRAINER", ...trainerForm }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("✅ Antrenör hesabınız aktif edildi! Sayfayı yenileyiniz.");
      } else {
        toast.error(json.error || "Başvuru gönderilemedi");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVenueSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!venueForm.businessName.trim()) { toast.error("Tesis adı zorunludur"); return; }
    if (!venueForm.businessAddress.trim()) { toast.error("Adres zorunludur"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile/pro-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "VENUE", ...venueForm }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("✅ Tesis hesabınız aktif edildi! Sayfayı yenileyiniz.");
      } else {
        toast.error(json.error || "Başvuru gönderilemedi");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  // Zaten profesyonel kullanıcı
  if (isTrainer || isVenue) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 text-center">
        <span className="text-5xl">{isTrainer ? "🎯" : "🏟️"}</span>
        <h2 className="mt-4 text-xl font-bold text-gray-800 dark:text-gray-100">
          {isTrainer ? "Antrenör Hesabı Aktif" : "Tesis Hesabı Aktif"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          {isTrainer
            ? "Antrenör profiliniz zaten aktif. Profilinizden branşlarınızı ve fiyatlarınızı güncelleyebilirsiniz."
            : "Tesis profiliniz zaten aktif. Tesis bilgilerinizi profilinizden güncelleyebilirsiniz."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bilgi kartı */}
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
          Profesyonel Hesaba Yükselt
        </h2>
        <p className="text-sm text-emerald-700 dark:text-emerald-400">
          Sporcu hesabın tüm özellikleri korunur. Antrenör veya tesis hesabı ekleyerek ek araçlara erişirsin.
          Başvurun 1-3 iş günü içinde incelenir.
        </p>
      </div>

      {/* Tab seçimi */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        {(["trainer", "venue"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-medium transition ${
              tab === t
                ? "bg-emerald-500 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {t === "trainer" ? "🎯 Antrenör Ol" : "🏟️ Tesis İşletmecisi Ol"}
          </button>
        ))}
      </div>

      {/* ─── Antrenör Formu ───────────────────────────────────── */}
      {tab === "trainer" && (
        <form onSubmit={handleTrainerSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Antrenör Başvuru Formu</h3>

          <div>
            <label className={labelClass}>Branşlarınız <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
              {sports.map((s) => {
                const sel = trainerForm.branches.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (sel) setTrainerForm({ ...trainerForm, branches: trainerForm.branches.filter((b) => b !== s.id) });
                      else setTrainerForm({ ...trainerForm, branches: [...trainerForm.branches, s.id] });
                    }}
                    className={`p-2.5 rounded-xl border-2 text-sm text-left transition ${
                      sel ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : "border-gray-200 dark:border-gray-600 hover:border-emerald-300"
                    }`}
                  >
                    {s.icon || "🏅"} {s.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Çalıştığınız Salon / Kulüp <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
              <input
                type="text"
                value={trainerForm.gymName}
                onChange={(e) => setTrainerForm({ ...trainerForm, gymName: e.target.value })}
                className={inputClass}
                placeholder="Örn: FitLife Spor Merkezi"
              />
            </div>
            <div>
              <label className={labelClass}>Deneyim (yıl)</label>
              <input
                type="number"
                min={0}
                max={50}
                value={trainerForm.experience}
                onChange={(e) => setTrainerForm({ ...trainerForm, experience: e.target.value })}
                className={inputClass}
                placeholder="Örn: 5"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Sertifika Bilgisi <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
            <textarea
              value={trainerForm.certNote}
              onChange={(e) => setTrainerForm({ ...trainerForm, certNote: e.target.value })}
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Sahip olduğunuz sertifikaları kısaca belirtin (e.g. MHF Antrenör Lisansı)"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" loading={submitting} className="min-w-[160px]">
              Başvuruyu Gönder
            </Button>
          </div>
        </form>
      )}

      {/* ─── Mekan Formu ─────────────────────────────────────── */}
      {tab === "venue" && (
        <form onSubmit={handleVenueSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Tesis Başvuru Formu</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Tesis Adı <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={venueForm.businessName}
                onChange={(e) => setVenueForm({ ...venueForm, businessName: e.target.value })}
                className={inputClass}
                placeholder="Örn: FitLife Spor Salonu"
              />
            </div>
            <div>
              <label className={labelClass}>İletişim Telefonu <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
              <input
                type="tel"
                value={venueForm.businessPhone}
                onChange={(e) => setVenueForm({ ...venueForm, businessPhone: e.target.value })}
                className={inputClass}
                placeholder="05XX XXX XX XX"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Tesis Adresi <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={venueForm.businessAddress}
              onChange={(e) => setVenueForm({ ...venueForm, businessAddress: e.target.value })}
              className={inputClass}
              placeholder="Açık adres"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Web Sitesi <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
              <input
                type="url"
                value={venueForm.businessWebsite}
                onChange={(e) => setVenueForm({ ...venueForm, businessWebsite: e.target.value })}
                className={inputClass}
                placeholder="https://..."
              />
            </div>
            <div>
              <label className={labelClass}>Kapasite <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
              <input
                type="number"
                min={1}
                value={venueForm.capacity}
                onChange={(e) => setVenueForm({ ...venueForm, capacity: e.target.value })}
                className={inputClass}
                placeholder="Kişi kapasitesi"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Tesis Olanakları <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
            <textarea
              value={venueForm.facilityNote}
              onChange={(e) => setVenueForm({ ...venueForm, facilityNote: e.target.value })}
              className={`${inputClass} resize-none`}
              rows={2}
              placeholder="Örn: Sauna, yüzme havuzu, park yeri, soyunma odaları"
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" loading={submitting} className="min-w-[160px]">
              Başvuruyu Gönder
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
