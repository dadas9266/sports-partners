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
  });

  // Kullanıcı verisi yüklenince formu doldur
  useEffect(() => {
    if (!data?.user) return;
    const u = data.user as any;
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

    setSaving(true);
    try {
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

      if (res.success) {
        toast.success("Profil güncellendi ✓");
        refresh();
      } else {
        toast.error((res as any).error || "Güncelleme başarısız");
      }
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
        <label className={labelClass}>Spor Dalları <span className="text-gray-400 font-normal">(maks 5)</span></label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
          {allSports.map((sport) => {
            const selected = form.sportIds.includes(sport.id);
            return (
              <button
                key={sport.id}
                type="button"
                disabled={!selected && form.sportIds.length >= 5}
                onClick={() => {
                  if (selected) {
                    setForm({ ...form, sportIds: form.sportIds.filter((id) => id !== sport.id) });
                  } else if (form.sportIds.length < 5) {
                    setForm({ ...form, sportIds: [...form.sportIds, sport.id] });
                  }
                }}
                className={`p-2.5 rounded-xl border-2 text-left text-sm transition ${
                  selected
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-emerald-300 disabled:opacity-40"
                }`}
              >
                <span className="mr-1">{sport.icon || "🏅"}</span>
                {sport.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Kaydet */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} loading={saving} className="min-w-[140px]">
          Değişiklikleri Kaydet
        </Button>
      </div>
    </div>
  );
}
