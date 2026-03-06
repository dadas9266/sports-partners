"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useProfile } from "@/hooks/useProfile";
import { useLocations, useSports } from "@/hooks/useLocations";
import { updateProfile } from "@/services/api";
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

export default function ProfilDuzenle() {
  const { data, loading, refresh } = useProfile();
  const { locations } = useLocations();
  const { sports: allSports } = useSports();
  const { data: session } = useSession();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    bio: "",
    cityId: "",
    districtId: "",
    gender: "",
    birthDate: "",
    sportIds: [] as string[],
    avatarUrl: "",
    coverUrl: "",
    // Trainer fields
    isTrainer: false,
    university: "",
    department: "",
    trainerBranches: [] as string[],
    lessonTypes: [] as string[],
    providesEquipment: false,
    gymName: "",
    experience: "",
    certNote: "",
  });

  // Kullanıcı verisi yüklenince formu doldur
  useEffect(() => {
    if (!data?.user) return;
    const u = data.user as any;
    const tp = u.trainerProfile;
    setForm({
      name: u.name || "",
      phone: u.phone || "",
      bio: u.bio || "",
      cityId: u.city?.id || u.cityId || "",
      districtId: u.district?.id || u.districtId || "",
      gender: u.gender || "",
      birthDate: u.birthDate ? format(new Date(u.birthDate), "yyyy-MM-dd") : "",
      sportIds: (u.sports || []).map((s: any) => s.id),
      avatarUrl: u.avatarUrl || "",
      coverUrl: u.coverUrl || "",
      // Trainer fields sync
      isTrainer: u.userType === "TRAINER" || !!tp,
      university: tp?.university || "",
      department: tp?.department || "",
      trainerBranches: tp?.specializations?.map((s: any) => s.sportId) || [],
      lessonTypes: tp?.lessonTypes || [],
      providesEquipment: !!tp?.providesEquipment,
      gymName: tp?.gymName || "",
      experience: tp?.experienceYears?.toString() || "",
      certNote: tp?.certNote || "",
    });
  }, [data]);

  // Konum
  const turkey = locations.find((c) => c.name === "Türkiye") || locations[0];
  const cities = (turkey?.cities || []).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const selectedCity = cities.find((c) => c.id === form.cityId);
  const districts = (selectedCity?.districts || []).sort((a, b) => a.name.localeCompare(b.name, "tr"));

  // Dosya yükleme
  const uploadFile = async (
    file: File,
    type: "avatar" | "cover"
  ) => {
    const setter = type === "avatar" ? setUploadingAvatar : setUploadingCover;
    setter(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) {
        setForm((p) => ({
          ...p,
          [type === "avatar" ? "avatarUrl" : "coverUrl"]: json.url,
        }));
        toast.success(type === "avatar" ? "Profil fotoğrafı güncellendi" : "Kapak fotoğrafı güncellendi");
      } else {
        toast.error(json.error || "Yükleme başarısız");
      }
    } catch {
      toast.error("Yükleme sırasında hata oluştu");
    } finally {
      setter(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Ad Soyad boş olamaz"); return; }
    if (form.sportIds.length === 0) { toast.error("En az 1 spor dalı seçmelisiniz"); return; }
    if (form.sportIds.length > 10) { toast.error("En fazla 10 spor dalı seçebilirsiniz"); return; }

    if (form.isTrainer) {
      if (!form.university.trim()) { toast.error("Üniversite adı zorunludur"); return; }
      if (!form.department.trim()) { toast.error("Bölüm adı zorunludur"); return; }
      if (form.lessonTypes.length === 0) { toast.error("En az 1 ders türü seçilmeli"); return; }
      if (form.trainerBranches.length === 0) { toast.error("En az 1 antrenörlük branşı seçilmeli"); return; }
    }

    setSaving(true);
    try {
      // 1. Basic Profile Update
      const res = await updateProfile({
        name: form.name.trim(),
        phone: form.phone || null,
        bio: form.bio || null,
        cityId: form.cityId || null,
        districtId: form.districtId || null,
        gender: form.gender || null,
        birthDate: form.birthDate || null,
        sportIds: form.sportIds,
        avatarUrl: form.avatarUrl || null,
      } as any);

      if (!res.success) {
        toast.error((res as any).error || "Profil güncellenemedi");
        setSaving(false);
        return;
      }

      // 2. Trainer Profile Update (If trainer)
      if (form.isTrainer) {
        const trainerRes = await fetch("/api/profile/pro-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "TRAINER",
            university: form.university,
            department: form.department,
            branches: form.trainerBranches,
            lessonTypes: form.lessonTypes,
            providesEquipment: form.providesEquipment,
            gymName: form.gymName,
            experience: form.experience,
            certNote: form.certNote,
          }),
        });
        const tJson = await trainerRes.json();
        if (!tJson.success) {
          toast.error("Antrenörlük bilgileri güncellenemedi: " + (tJson.error || "Hata"));
        } else {
          toast.success("Antrenörlük bilgileri güncellendi ✓");
        }
      }

      toast.success("Profil başarıyla güncellendi");
      refresh();
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  // Profil tamamlama yüzdesi
  const completionFields = [
    !!form.name,
    !!form.avatarUrl,
    !!form.bio,
    !!form.phone,
    !!form.cityId,
    !!form.districtId,
    form.sportIds.length > 0,
    !!form.gender,
    !!form.birthDate,
  ];
  const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Profili Düzenle</h2>
        {/* Tamamlanma çubuğu */}
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${completion}%` }}
            />
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">%{completion} tam</span>
        </div>
      </div>

      {/* ─── Fotoğraflar ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <p className={labelClass}>Profil Fotoğrafı</p>
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden cursor-pointer hover:opacity-80 transition border-2 border-dashed border-gray-300 dark:border-gray-500 flex items-center justify-center"
            onClick={() => avatarRef.current?.click()}
          >
            {form.avatarUrl ? (
              <img src={form.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl">📷</span>
            )}
          </div>
          <div>
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              disabled={uploadingAvatar}
            >
              {uploadingAvatar ? "Yükleniyor..." : "Fotoğraf Değiştir"}
            </button>
            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG — maks 2 MB</p>
          </div>
          <input
            ref={avatarRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "avatar")}
          />
        </div>

        <p className={labelClass}>Kapak Fotoğrafı</p>
        <div
          className="w-full h-28 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden cursor-pointer hover:opacity-80 transition border-2 border-dashed border-gray-300 dark:border-gray-500 flex items-center justify-center"
          onClick={() => coverRef.current?.click()}
        >
          {form.coverUrl ? (
            <img src={form.coverUrl} alt="cover" className="w-full h-full object-cover" />
          ) : (
            <span className="text-gray-400 text-sm">
              {uploadingCover ? "Yükleniyor..." : "Kapak fotoğrafı ekle"}
            </span>
          )}
        </div>
        <input
          ref={coverRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "cover")}
        />
      </div>

      {/* ─── Kişisel Bilgiler ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Ad Soyad</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            placeholder="Adınız Soyadınız"
          />
        </div>
        <div>
          <label className={labelClass}>Telefon <span className="text-gray-400 font-normal">(opsiyonel)</span></label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className={inputClass}
            placeholder="05XX XXX XX XX"
          />
        </div>
        <div>
          <label className={labelClass}>Cinsiyet</label>
          <select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value })}
            className={inputClass}
          >
            <option value="">Seçiniz</option>
            <option value="MALE">Erkek</option>
            <option value="FEMALE">Kadın</option>
            <option value="PREFER_NOT_TO_SAY">Belirtmek istemiyorum</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Doğum Tarihi</label>
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            className={inputClass}
            max={new Date().toISOString().split("T")[0]}
          />
        </div>
      </div>

      {/* Biyografi */}
      <div>
        <label className={labelClass}>Biyografi</label>
        <textarea
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          className={`${inputClass} resize-none`}
          rows={3}
          maxLength={300}
          placeholder="Kendin hakkında kısa bir şey yaz..."
        />
        <p className="text-xs text-gray-400 mt-1 text-right">{form.bio.length}/300</p>
      </div>

      {/* ─── Konum ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Şehir</label>
          <select
            value={form.cityId}
            onChange={(e) => setForm({ ...form, cityId: e.target.value, districtId: "" })}
            className={inputClass}
          >
            <option value="">Şehir seçiniz</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {form.cityId && (
          <div>
            <label className={labelClass}>İlçe</label>
            <select
              value={form.districtId}
              onChange={(e) => setForm({ ...form, districtId: e.target.value })}
              className={inputClass}
            >
              <option value="">İlçe seçiniz</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ─── Spor Seçimi ─────────────────────────────────────────── */}
      <div>
        <label className={labelClass}>
          Spor Dalları <span className="text-gray-400 font-normal">(maks 10)</span>
          {form.sportIds.length > 0 && (
            <span className="ml-2 text-emerald-600 dark:text-emerald-400 font-semibold">{form.sportIds.length}/10 seçili</span>
          )}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {allSports.map((sport) => {
            const selected = form.sportIds.includes(sport.id);
            return (
              <button
                key={sport.id}
                type="button"
                onClick={() => {
                  if (selected) {
                    setForm({ ...form, sportIds: form.sportIds.filter((id) => id !== sport.id) });
                  } else if (form.sportIds.length >= 10) {
                    toast.error("En fazla 10 spor dalı seçebilirsiniz");
                  } else {
                    setForm({ ...form, sportIds: [...form.sportIds, sport.id] });
                  }
                }}
                className={`p-2.5 rounded-xl border-2 text-left text-sm transition ${
                  selected
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-emerald-300"
                }`}
              >
                <span className="mr-1">{sport.icon || "🏅"}</span>
                {sport.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── ANTRENÖRLÜK BİLGİLERİ (Sadece Antrenörlere) ───────── */}
      {form.isTrainer && (
        <div className="pt-8 border-t border-gray-100 dark:border-gray-800 space-y-6">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl text-xl">🎓</span>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Antrenörlük Bilgileri</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Onaylı antrenör rozetinizde görünecek profesyonel detaylar</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Üniversite Adı <span className="text-red-400">*</span></label>
              <input type="text" value={form.university}
                onChange={(e) => setForm({ ...form, university: e.target.value })}
                className={inputClass} placeholder="Mezun olduğunuz üniversite" />
            </div>
            <div>
              <label className={labelClass}>Bölüm <span className="text-red-400">*</span></label>
              <input type="text" value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className={inputClass} placeholder="Mezun olduğunuz bölüm" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Profesyonel Branşlarınız <span className="text-red-400">*</span></label>
            <p className="text-xs text-gray-400 mb-2">Eğitmenlik yaptığınız ana branşları seçin</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allSports.map((sport) => {
                const selected = form.trainerBranches.includes(sport.id);
                return (
                  <button key={sport.id} type="button"
                    onClick={() => {
                      if (selected) { setForm({ ...form, trainerBranches: form.trainerBranches.filter(id => id !== sport.id) }); }
                      else { setForm({ ...form, trainerBranches: [...form.trainerBranches, sport.id] }); }
                    }}
                    className={`p-2.5 rounded-xl border-2 text-left text-sm transition ${selected ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium" : "border-gray-100 dark:border-gray-700 hover:border-blue-300"}`}>
                    <span className="mr-1">{sport.icon || "🏅"}</span>
                    {sport.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={labelClass}>Verdiğiniz Ders Türleri <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {LESSON_TYPES.map((lt) => {
                const sel = form.lessonTypes.includes(lt.id);
                return (
                  <button key={lt.id} type="button" 
                    onClick={() => setForm(p => ({ ...p, lessonTypes: sel ? p.lessonTypes.filter(t => t !== lt.id) : [...p.lessonTypes, lt.id] }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition text-center ${sel ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300" : "border-gray-100 dark:border-gray-700 hover:border-blue-300 text-gray-500"}`}>
                    <span className="text-xl">{lt.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{lt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 cursor-pointer group p-4 rounded-xl border-2 border-gray-100 dark:border-gray-800 hover:border-blue-500 transition-colors bg-gray-50/50 dark:bg-gray-900/20">
              <input type="checkbox" checked={form.providesEquipment}
                onChange={(e) => setForm({ ...form, providesEquipment: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <div>
                <span className={labelClass + " !mb-0"}>Öğrencilere Ekipman Sağlıyorum</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Dersler için gerekli ekipmanı tarafımdan karşılanacaktır.</p>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Çalıştığınız Salon / Spor Merkezi</label>
              <input type="text" value={form.gymName}
                onChange={(e) => setForm({ ...form, gymName: e.target.value })}
                className={inputClass} placeholder="Kurum veya kulüp adı" />
            </div>
            <div>
              <label className={labelClass}>Deneyim (yıl)</label>
              <input type="number" value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
                className={inputClass} placeholder="Deneyim süreniz" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Eğitim & Sertifika Bilgisi</label>
            <textarea value={form.certNote}
              onChange={(e) => setForm({ ...form, certNote: e.target.value })}
              className={`${inputClass} resize-none`} rows={3}
              placeholder="Sahip olduğunuz uzmanlık belgeleri, lisanslar vb." />
          </div>
        </div>
      )}

      {/* Kaydet */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} loading={saving} className="min-w-[160px]">
          Tümünü Kaydet
        </Button>
      </div>
    </div>
  );
}
