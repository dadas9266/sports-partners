"use client";

import { useEffect, useState } from "react";
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
  const [submitting, setSubmitting] = useState(false);

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

  const userType = (data?.user as any)?.userType;
  const trainerProfile = (data?.user as any)?.trainerProfile;
  const isTrainer = userType === "TRAINER" || !!trainerProfile;

  const [badgeVisible, setBadgeVisible] = useState<boolean>(
    (data?.user as any)?.trainerProfile?.trainerBadgeVisible !== false
  );
  const [savingBadge, setSavingBadge] = useState(false);

  const toggleLessonType = (id: string) => {
    setTrainerForm((prev) => ({
      ...prev,
      lessonTypes: prev.lessonTypes.includes(id)
        ? prev.lessonTypes.filter((t) => t !== id)
        : [...prev.lessonTypes, id],
    }));
  };

  const handleBadgeVisibilityToggle = async (value: boolean) => {
    setBadgeVisible(value);
    setSavingBadge(true);
    try {
      const res = await fetch("/api/trainer-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainerBadgeVisible: value }),
      });
      if (!(await res.json()).success) {
        setBadgeVisible(!value);
        toast.error("Ayar kaydedilemedi");
      } else {
        toast.success(value ? "Rozet bilgileri herkese açık" : "Rozet bilgileri gizlendi");
      }
    } catch {
      setBadgeVisible(!value);
      toast.error("Bir hata oluştu");
    } finally {
      setSavingBadge(false);
    }
  };

  useEffect(() => {
    if (data?.user) {
      const val = (data.user as any)?.trainerProfile?.trainerBadgeVisible;
      setBadgeVisible(val !== false);
    }
  }, [data]);

  const handleTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerForm.university.trim()) {
      toast.error("Üniversite adı zorunludur");
      return;
    }
    if (!trainerForm.department.trim()) {
      toast.error("Bölüm adı zorunludur");
      return;
    }
    if (trainerForm.branches.length === 0) {
      toast.error("En az bir branş seçiniz");
      return;
    }
    if (trainerForm.lessonTypes.length === 0) {
      toast.error("En az bir ders türü seçiniz");
      return;
    }

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

  return (
    <div className="space-y-6">
      {isTrainer ? (
        <>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-sm font-semibold px-4 py-2 rounded-full">
              🏅 Antrenör hesabı aktif <span className="w-2 h-2 bg-green-500 rounded-full" />
            </span>
          </div>
          <Link
            href="/antrenor/derslerim"
            className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-2xl px-5 py-4 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition group"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <div>
                <p className="font-semibold text-blue-800 dark:text-blue-300 text-sm">Ders Takibi</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Öğrencileri, dersleri ve ödevleri yönet</p>
              </div>
            </div>
            <span className="text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          <TrainerBadgeVisibilityCard
            badgeVisible={badgeVisible}
            saving={savingBadge}
            onChange={handleBadgeVisibilityToggle}
          />
        </>
      ) : (
        <>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
            <h2 className="text-base font-semibold text-emerald-800 dark:text-emerald-300 mb-1">Profesyonel Hesaba Yükselt</h2>
            <p className="text-sm text-emerald-700 dark:text-emerald-400">
              Sporcu hesabın tüm özellikleri korunur. Onaylı antrenör olup ders araçlarına erişebilirsin.
            </p>
          </div>
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
        </>
      )}
    </div>
  );
}

function TrainerForm({
  form,
  setForm,
  toggleLessonType,
  sports,
  submitting,
  onSubmit,
  inputClass,
  labelClass,
}: {
  form: any;
  setForm: any;
  toggleLessonType: (id: string) => void;
  sports: any[];
  submitting: boolean;
  onSubmit: any;
  inputClass: string;
  labelClass: string;
}) {
  return (
    <form onSubmit={onSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-5">
      <div>
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">Antrenör Başvuru Formu</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Tüm bilgilerinizi eksiksiz doldurunuz.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Üniversite Adı <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.university}
            onChange={(e) => setForm({ ...form, university: e.target.value })}
            className={inputClass}
            placeholder="Mezun olduğunuz üniversite"
          />
        </div>
        <div>
          <label className={labelClass}>
            Bölüm <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className={inputClass}
            placeholder="Mezun olduğunuz bölüm"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Branşlarınız <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
          {sports.map((s) => {
            const selected = form.branches.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    branches: selected
                      ? form.branches.filter((b: string) => b !== s.id)
                      : [...form.branches, s.id],
                  })
                }
                className={`p-2.5 rounded-xl border-2 text-sm text-left transition ${
                  selected
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 font-medium"
                    : "border-gray-200 dark:border-gray-600 hover:border-emerald-300"
                }`}
              >
                {s.icon || "🏅"} {s.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Ders Türleri <span className="text-red-400">*</span>
        </label>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">Verdiğiniz ders türlerini seçin (birden fazla seçilebilir)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LESSON_TYPES.map((lessonType) => {
            const selected = form.lessonTypes.includes(lessonType.id);
            return (
              <button
                key={lessonType.id}
                type="button"
                onClick={() => toggleLessonType(lessonType.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition text-center ${
                  selected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-600 hover:border-blue-300 text-gray-600 dark:text-gray-400"
                }`}
              >
                <span className="text-xl">{lessonType.icon}</span>
                <span className="text-xs font-semibold">{lessonType.label}</span>
                <span className="text-[10px] opacity-70">{lessonType.desc}</span>
                {selected && <span className="text-[10px] text-blue-500 font-bold">✓ Seçildi</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer group p-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 hover:border-blue-500 transition-colors bg-gray-50/50 dark:bg-gray-900/20">
          <input
            type="checkbox"
            checked={!!form.providesEquipment}
            onChange={(e) => setForm({ ...form, providesEquipment: e.target.checked })}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <span className={labelClass + " !mb-0"}>Öğrencilere Ekipman Sağlıyorum</span>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Dersler için gerekli ekipmanları tarafımdan karşılanacaktır.</p>
          </div>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>
            Çalıştığınız Salon / Spor Merkezi <span className="text-gray-400 font-normal">(opsiyonel)</span>
          </label>
          <input
            type="text"
            value={form.gymName}
            onChange={(e) => setForm({ ...form, gymName: e.target.value })}
            className={inputClass}
            placeholder="Çalıştığınız kurumun adı"
          />
        </div>
        <div>
          <label className={labelClass}>Deneyim (yıl)</label>
          <input
            type="number"
            min={0}
            max={50}
            value={form.experience}
            onChange={(e) => setForm({ ...form, experience: e.target.value })}
            className={inputClass}
            placeholder="Deneyim süreniz"
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Eğitim & Sertifika Bilgisi <span className="text-gray-400 font-normal">(opsiyonel)</span>
        </label>
        <textarea
          value={form.certNote}
          onChange={(e) => setForm({ ...form, certNote: e.target.value })}
          className={`${inputClass} resize-none`}
          rows={2}
          placeholder="Sahip olduğunuz sertifikaları kısaca belirtin (Örn: MHF Antrenör Lisansı, UEFA C Belgesi)"
        />
      </div>

      <div className="flex justify-end pt-1">
        <Button type="submit" loading={submitting} className="min-w-[160px]">
          Başvuruyu Gönder
        </Button>
      </div>
    </form>
  );
}

function TrainerBadgeVisibilityCard({
  badgeVisible,
  saving,
  onChange,
}: {
  badgeVisible: boolean;
  saving: boolean;
  onChange: (v: boolean) => void;
}) {
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
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            badgeVisible ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
