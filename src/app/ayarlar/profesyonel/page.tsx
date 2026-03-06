"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useProfile } from "@/hooks/useProfile";
import { useSports } from "@/hooks/useLocations";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

const inputClass =
  "w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";

const LESSON_TYPES = [
  { id: "birebir", label: "Birebir", icon: "👤", desc: "Bireysel ders" },
  { id: "grup", label: "Grup", icon: "👥", desc: "Grup dersi" },
  { id: "cocuk", label: "Çocuk", icon: "🧒", desc: "Çocuklara yönelik" },
  { id: "performans", label: "Performans", icon: "🏆", desc: "Yüksek performans" },
];

export default function ProfesyonelPage() {
  const { data, loading } = useProfile();
  const { sports } = useSports();
  const [tab, setTab] = useState<"trainer" | "venue">("trainer");
  const [submitting, setSubmitting] = useState(false);

  // Antrenör formu
  const [trainerForm, setTrainerForm] = useState({
    university: "",
    department: "",
    branches: [] as string[],
    lessonTypes: [] as string[],
    providesEquipment: null as boolean | null,
    gymName: "",
    experience: "",
    certNote: "",
  });

  const toggleLessonType = (id: string) => {
    setTrainerForm(prev => ({
      ...prev,
      lessonTypes: prev.lessonTypes.includes(id)
        ? prev.lessonTypes.filter(t => t !== id)
        : [...prev.lessonTypes, id],
    }));
  };

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
  const trainerProfile = (data?.user as any)?.trainerProfile;
  const venueProfile = (data?.user as any)?.venueProfile;
  const isTrainer = userType === "TRAINER" || !!trainerProfile;
  const isVenue = userType === "VENUE" || !!venueProfile;
  const isDual = isTrainer && isVenue;

  // Badge görünürlük state'i — trainerProfile'dan başlat
  const [badgeVisible, setBadgeVisible] = useState<boolean>(
    (data?.user as any)?.trainerProfile?.trainerBadgeVisible !== false
  );
  const [savingBadge, setSavingBadge] = useState(false);

  const handleBadgeVisibilityToggle = async (v: boolean) => {
    setBadgeVisible(v);
    setSavingBadge(true);
    try {
      const res = await fetch("/api/trainer-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainerBadgeVisible: v }),
      });
      if (!(await res.json()).success) {
        setBadgeVisible(!v); // revert
        toast.error("Ayar kaydedilemedi");
      } else {
        toast.success(v ? "Rozet bilgileri herkese açık" : "Rozet bilgileri gizlendi");
      }
    } catch {
      setBadgeVisible(!v);
      toast.error("Bir hata oluştu");
    } finally {
      setSavingBadge(false);
    }
  };

  // Sync badge visibility when data is loaded
  useEffect(() => {
    if (data?.user) {
      const val = (data.user as any)?.trainerProfile?.trainerBadgeVisible;
      setBadgeVisible(val !== false); // default true
    }
  }, [data]);

  const handleTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (trainerForm.branches.length === 0) { toast.error("En az bir branş seçiniz"); return; }
    if (trainerForm.lessonTypes.length === 0) { toast.error("En az bir ders türü seçiniz"); return; }
    if (trainerForm.providesEquipment === null) { toast.error("Ekipman durumunu belirtiniz"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/profile/pro-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "TRAINER", ...trainerForm }),
      });
      const json = await res.json();
      if (json.success) toast.success("✅ Antrenör hesabınız aktif edildi! Sayfayı yenileyiniz.");
      else toast.error(json.error || "Başvuru gönderilemedi");
    } catch { toast.error("Bir hata oluştu"); }
    finally { setSubmitting(false); }
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
      if (json.success) toast.success("✅ Tesis hesabınız aktif edildi! Sayfayı yenileyiniz.");
      else toast.error(json.error || "Başvuru gönderilemedi");
    } catch { toast.error("Bir hata oluştu"); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ─── Aktif Roller ───────────────────────────────────── */}
      {(isTrainer || isVenue) && (
        <div className="flex flex-wrap gap-2">
          {isTrainer && (
            <span className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm font-semibold px-4 py-2 rounded-full">
              🏅 Antrenör hesabı aktif <span className="w-2 h-2 bg-green-500 rounded-full" />
            </span>
          )}
          {isVenue && (
            <span className="inline-flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-sm font-semibold px-4 py-2 rounded-full">
              🏟️ Tesis hesabı aktif <span className="w-2 h-2 bg-green-500 rounded-full" />
            </span>
          )}
        </div>
      )}

      {/* ─── HER İKİSİ AKTİF → form yok ────────────────────── */}
      {isDual && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl p-6 text-center space-y-3">
          <div className="text-4xl">🎉</div>
          <h2 className="text-lg font-bold text-purple-800 dark:text-purple-300">Tüm Profesyonel Rollere Sahipsin!</h2>
          <p className="text-sm text-purple-600 dark:text-purple-400 max-w-sm mx-auto">
            Hem <strong>Onaylı Antrenör</strong> hem de <strong>Tesis İşletmecisi</strong> olarak kayıtlısın.
            Kullanabileceğin başka bir profesyonel hesap türü bulunmuyor.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/antrenor/derslerim" className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition">
              📚 Ders Takibi
            </Link>
            <Link href="/ayarlar/isletme" className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-xl transition">
              🏟️ Tesis Yönetimi
            </Link>
          </div>
        </div>
        <TrainerBadgeVisibilityCard badgeVisible={badgeVisible} saving={savingBadge} onChange={handleBadgeVisibilityToggle} />
      )}

      {/* ─── FORM BÖLÜMÜ ─────────────────────────────────────── */}
      {!isDual && (
        <>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-emerald-800 dark:text-emerald-300 mb-1">Profesyonel Hesaba Yükselt</h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              {isTrainer ? "Antrenör hesabın aktif. Tesis İşletmecisi olarak da başvurabilirsin."
                : isVenue ? "Tesis hesabın aktif. Antrenör olarak da başvurabilirsin."
                : "Sporcu hesabın tüm özellikleri korunur. Antrenör veya tesis hesabı ekleyerek ek araçlara erişirsin."}
            </p>
          </div>

          {/* Tab — sadece her ikisi de yoksa göster */}
          {!isTrainer && !isVenue && (
            <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              {(["trainer", "venue"] as const).map((t) => (
                <button key={t} type="button" onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-sm font-medium transition ${tab === t
                    ? "bg-emerald-500 text-white"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>
                  {t === "trainer" ? "🎯 Antrenör Ol" : "🏟️ Tesis İşletmecisi Ol"}
                </button>
              ))}
            </div>
          )}

          {/* ─── Antrenör Ders Takip Linki + Badge Görünürlük ─ */}
          {isTrainer && !isVenue && (
            <>
              <Link href="/antrenor/derslerim"
                className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl px-5 py-4 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition group">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📚</span>
                  <div>
                    <p className="font-semibold text-blue-800 dark:text-blue-300 text-sm">Ders Takibi</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">Öğrencileri, dersleri ve ödevleri yönet</p>
                  </div>
                </div>
                <span className="text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <TrainerBadgeVisibilityCard badgeVisible={badgeVisible} saving={savingBadge} onChange={handleBadgeVisibilityToggle} />
              <div className="text-xs text-center text-amber-600 dark:text-amber-400 font-medium py-1">
                ↓ Tesis İşletmecisi olarak da başvurabilirsin
              </div>
            </>
          )}

          {/* ── Antrenör Formu (sade kullanıcı + trainer tab) veya (sadece venue) ── */}
          {((!isTrainer && !isVenue && tab === "trainer") || (isVenue && !isTrainer)) && (
            <TrainerForm
              form={trainerForm}
              setForm={setTrainerForm}
              toggleLessonType={toggleLessonType}
              sports={sports}
              submitting={submitting}
              onSubmit={handleTrainerSubmit}
              inputClass={inputClass}
              labelClass={labelClass}
            />
          )}

          {/* ── Venue Formu (sade kullanıcı + venue tab) veya (sadece trainer) ── */}
          {((!isTrainer && !isVenue && tab === "venue") || (isTrainer && !isVenue)) && (
            <VenueForm
              form={venueForm}
              setForm={setVenueForm}
              submitting={submitting}
              onSubmit={handleVenueSubmit}
              inputClass={inputClass}
              labelClass={labelClass}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Antrenör Alt Bileşeni ────────────────────────────────────────────────────
function TrainerForm({ form, setForm, toggleLessonType, sports, submitting, onSubmit, inputClass, labelClass }: {
  form: any; setForm: any; toggleLessonType: (id: string) => void;
  sports: any[]; submitting: boolean; onSubmit: any; inputClass: string; labelClass: string;
}) {
  return (
    <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-5">
      <div>
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">Antrenör Başvuru Formu</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tüm bilgilerinizi eksiksiz doldurunuz.</p>
      </div>

      {/* Üniversite & Bölüm */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Üniversite <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
          <input type="text" value={form.university}
            onChange={(e) => setForm({ ...form, university: e.target.value })}
            className={inputClass} placeholder="Örn: Balıkesir Üniversitesi" />
        </div>
        <div>
          <label className={labelClass}>Bölüm <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
          <input type="text" value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className={inputClass} placeholder="Örn: Beden Eğitimi ve Spor Öğretmenliği" />
        </div>
      </div>

      {/* Branşlar */}
      <div>
        <label className={labelClass}>Branşlarınız <span className="text-red-400">*</span></label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
          {sports.map((s) => {
            const sel = form.branches.includes(s.id);
            return (
              <button key={s.id} type="button"
                onClick={() => setForm({ ...form, branches: sel ? form.branches.filter((b: string) => b !== s.id) : [...form.branches, s.id] })}
                className={`p-2.5 rounded-xl border-2 text-sm text-left transition ${sel ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-medium" : "border-gray-200 dark:border-gray-600 hover:border-emerald-300"}`}>
                {s.icon || "🏅"} {s.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ders Türleri */}
      <div>
        <label className={labelClass}>Ders Türleri <span className="text-red-400">*</span></label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Verdiğiniz ders türlerini seçin (birden fazla seçilebilir)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LESSON_TYPES.map((lt) => {
            const sel = form.lessonTypes.includes(lt.id);
            return (
              <button key={lt.id} type="button" onClick={() => toggleLessonType(lt.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition text-center ${sel
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "border-gray-200 dark:border-gray-600 hover:border-blue-300 text-gray-600 dark:text-gray-400"}`}>
                <span className="text-xl">{lt.icon}</span>
                <span className="text-xs font-semibold">{lt.label}</span>
                <span className="text-[10px] opacity-70">{lt.desc}</span>
                {sel && <span className="text-[10px] text-blue-500 font-bold">✓ Seçildi</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ekipman */}
      <div>
        <label className={labelClass}>Ekipman Sağlama <span className="text-red-400">*</span></label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Öğrencilere ekipman sağlıyor musunuz?</p>
        <div className="flex gap-3">
          {[
            { value: true, label: "Evet, sağlıyorum", icon: "✅", desc: "Ekipman dahil" },
            { value: false, label: "Hayır, sağlamıyorum", icon: "❌", desc: "Kendi ekipmanı getirir" },
          ].map((opt) => (
            <button key={String(opt.value)} type="button"
              onClick={() => setForm({ ...form, providesEquipment: opt.value })}
              className={`flex-1 flex flex-col items-center gap-1 p-3.5 rounded-xl border-2 transition ${
                form.providesEquipment === opt.value
                  ? opt.value ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                              : "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                  : "border-gray-200 dark:border-gray-600 hover:border-gray-300 text-gray-600 dark:text-gray-400"}`}>
              <span className="text-2xl">{opt.icon}</span>
              <span className="text-sm font-semibold">{opt.label}</span>
              <span className="text-xs opacity-70">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Salon & Deneyim */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Çalıştığınız Salon / Kulüp <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
          <input type="text" value={form.gymName}
            onChange={(e) => setForm({ ...form, gymName: e.target.value })}
            className={inputClass} placeholder="Örn: FitLife Spor Merkezi" />
        </div>
        <div>
          <label className={labelClass}>Deneyim (yıl)</label>
          <input type="number" min={0} max={50} value={form.experience}
            onChange={(e) => setForm({ ...form, experience: e.target.value })}
            className={inputClass} placeholder="Örn: 5" />
        </div>
      </div>

      {/* Sertifika */}
      <div>
        <label className={labelClass}>Eğitim & Sertifika Bilgisi <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
        <textarea value={form.certNote}
          onChange={(e) => setForm({ ...form, certNote: e.target.value })}
          className={`${inputClass} resize-none`} rows={2}
          placeholder="Sahip olduğunuz sertifikaları kısaca belirtin (Örn: MHF Antrenör Lisansı, UEFA C Belgesi)" />
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" loading={submitting} className="min-w-[160px]">Başvuruyu Gönder</Button>
      </div>
    </form>
  );
}

// ─── Tesis Alt Bileşeni ───────────────────────────────────────────────────────
function VenueForm({ form, setForm, submitting, onSubmit, inputClass, labelClass }: {
  form: any; setForm: any; submitting: boolean; onSubmit: any; inputClass: string; labelClass: string;
}) {
  return (
    <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-4">
      <div>
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">Tesis Başvuru Formu</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tesisinizin bilgilerini eksiksiz doldurunuz.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Tesis Adı <span className="text-red-400">*</span></label>
          <input type="text" value={form.businessName}
            onChange={(e) => setForm({ ...form, businessName: e.target.value })}
            className={inputClass} placeholder="Örn: FitLife Spor Salonu" />
        </div>
        <div>
          <label className={labelClass}>İletişim Telefonu <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
          <input type="tel" value={form.businessPhone}
            onChange={(e) => setForm({ ...form, businessPhone: e.target.value })}
            className={inputClass} placeholder="05XX XXX XX XX" />
        </div>
      </div>

      <div>
        <label className={labelClass}>Tesis Adresi <span className="text-red-400">*</span></label>
        <input type="text" value={form.businessAddress}
          onChange={(e) => setForm({ ...form, businessAddress: e.target.value })}
          className={inputClass} placeholder="Açık adres" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Web Sitesi <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
          <input type="url" value={form.businessWebsite}
            onChange={(e) => setForm({ ...form, businessWebsite: e.target.value })}
            className={inputClass} placeholder="https://..." />
        </div>
        <div>
          <label className={labelClass}>Kapasite <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
          <input type="number" min={1} value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            className={inputClass} placeholder="Kişi kapasitesi" />
        </div>
      </div>

      <div>
        <label className={labelClass}>Tesis Olanakları <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
        <textarea value={form.facilityNote}
          onChange={(e) => setForm({ ...form, facilityNote: e.target.value })}
          className={`${inputClass} resize-none`} rows={2}
          placeholder="Örn: Sauna, yüzme havuzu, park yeri, soyunma odaları" />
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" loading={submitting} className="min-w-[160px]">Başvuruyu Gönder</Button>
      </div>
    </form>
  );
}
// ─── Rozet Görünürlük Kartı ───────────────────────────────────────────────────
function TrainerBadgeVisibilityCard({
  badgeVisible, saving, onChange,
}: { badgeVisible: boolean; saving: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-5 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">🏅</span>
        <div>
          <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Antrenör Rozeti Bilgileri</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {badgeVisible
              ? "Rozetine tıklayan herkes antrenör bilgilerini görebilir"
              : "Sadece rozet görünür, bilgiler popup'ta gizli"}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => onChange(!badgeVisible)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none shrink-0 ml-4 ${
          badgeVisible ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
        } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
          badgeVisible ? "translate-x-6" : "translate-x-1"
        }`} />
      </button>
    </div>
  );
}