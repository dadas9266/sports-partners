"use client";

import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import type { ProfileEditForm } from "@/types";

interface Sport {
  id: string;
  icon: string | null;
  name: string;
}

interface District {
  id: string;
  name: string;
}

interface City {
  id: string;
  name: string;
  districts?: District[];
}

interface Country {
  id: string;
  code: string;
  name: string;
  cities?: City[];
}

interface ProfileEditFormProps {
  editForm: ProfileEditForm;
  setEditForm: (form: ProfileEditForm) => void;
  sports: Sport[];
  locations: Country[];
  isTrainer: boolean;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export default function ProfileEditFormPanel({
  editForm,
  setEditForm,
  sports,
  locations,
  isTrainer,
  saving,
  onSave,
  onCancel,
}: ProfileEditFormProps) {
  const inputCls =
    "w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none";

  const selectedCountry = locations.find((l) =>
    l.cities?.some((c) => c.id === editForm.cityId)
  );
  const citiesForCountry = selectedCountry?.cities ?? [];
  const districtsForCity =
    locations
      .flatMap((l) => l.cities ?? [])
      .find((c) => c.id === editForm.cityId)?.districts ?? [];

  const lessonTypeOptions = [
    { id: "birebir", label: "Birebir" },
    { id: "grup", label: "Grup" },
    { id: "cocuk", label: "Çocuk" },
    { id: "performans", label: "Performans" },
  ];

  const visibilityOptions = [
    { value: "EVERYONE", label: "Herkes" },
    { value: "FOLLOWERS", label: "Arkadaşlarım" },
    { value: "NOBODY", label: "Hiçkimse" },
  ] as const;

  const socialPlatforms = [
    {
      key: "instagram",
      placeholder: "Instagram kullanıcı adı",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0z"/></svg>,
      iconClass: "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#FCAF45] text-white",
    },
    {
      key: "tiktok",
      placeholder: "TikTok kullanıcı adı",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.79a8.18 8.18 0 004.78 1.52V6.85a4.85 4.85 0 01-1.01-.16z"/></svg>,
      iconClass: "bg-black text-white",
    },
    {
      key: "facebook",
      placeholder: "Facebook kullanıcı adı",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
      iconClass: "bg-[#1877F2] text-white",
    },
    {
      key: "twitterX",
      placeholder: "X kullanıcı adı",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
      iconClass: "bg-black text-white",
    },
    {
      key: "vk",
      placeholder: "VK kullanıcı adı",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.07 2H8.93C3.33 2 2 3.33 2 8.93v6.14C2 20.67 3.33 22 8.93 22h6.14C20.67 22 22 20.67 22 15.07V8.93C22 3.33 20.67 2 15.07 2zm3.08 13.5h-1.64c-.63 0-.82-.52-1.93-1.63-.96-.96-1.39-.96-1.39 0 0 1.63-.43 1.63-1.08 1.63-1.67 0-3.52-1.04-4.82-2.84-1.96-2.73-2.5-4.72-2.5-5.12 0-.18.15-.35.35-.35h1.64c.26 0 .35.15.44.38.51 1.57 1.39 2.95 1.74 2.95.14 0 .2-.06.2-.38V9.35c-.04-.62-.35-.67-.35-.89 0-.15.12-.3.3-.3h2.57c.22 0 .3.12.3.35v2.74c0 .22.09.3.16.3.14 0 .27-.08.55-.38.87-.99 1.5-2.51 1.5-2.51.09-.2.25-.38.5-.38h1.64c.49 0 .6.25.49.56-.21.64-2.08 2.66-2.08 2.66-.16.24-.22.35 0 .61.16.2.69.74 1.05 1.17.65.73 1.14 1.35 1.27 1.78.14.42-.08.64-.49.64z"/></svg>,
      iconClass: "bg-[#4C75A3] text-white",
    },
    {
      key: "telegram",
      placeholder: "Telegram kullanıcı adı",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
      iconClass: "bg-[#26A5E4] text-white",
    },
    {
      key: "whatsapp",
      placeholder: "WhatsApp numarası (+905551234567)",
      icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>,
      iconClass: "bg-[#25D366] text-white",
    },
  ] as const;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
        Profili Düzenle
      </h2>

      {/* Ad Soyad */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Ad Soyad
        </label>
        <input
          type="text"
          value={editForm.name}
          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          className={inputCls}
        />
      </div>

      {/* Bio */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Hakkımda
        </label>
        <textarea
          value={editForm.bio}
          onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
          maxLength={300}
          rows={3}
          className={`${inputCls} resize-none`}
          placeholder="Kendinizden bahsedin..."
        />
        <p className="text-xs text-gray-400 mt-1">{editForm.bio?.length ?? 0}/300</p>
      </div>

      {/* Konum */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Konum
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Ülke */}
          <select
            value={selectedCountry?.id ?? ""}
            onChange={(e) => {
              const country = locations.find((l) => l.id === e.target.value);
              setEditForm({
                ...editForm,
                cityId: country?.cities?.[0]?.id ?? "",
                districtId: "",
              });
            }}
            className={inputCls}
          >
            <option value="">Ülke Seçin...</option>
            {[...locations]
              .sort((a, b) =>
                a.code === "TR" ? -1 : b.code === "TR" ? 1 : a.name.localeCompare(b.name)
              )
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>

          {/* Şehir */}
          <select
            value={editForm.cityId}
            onChange={(e) =>
              setEditForm({ ...editForm, cityId: e.target.value, districtId: "" })
            }
            className={inputCls}
          >
            <option value="">Şehir Seçin...</option>
            {[...citiesForCountry]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>

          {/* İlçe */}
          <select
            value={editForm.districtId}
            onChange={(e) =>
              setEditForm({ ...editForm, districtId: e.target.value })
            }
            className={inputCls}
            disabled={!editForm.cityId}
          >
            <option value="">İlçe Seçin...</option>
            {[...districtsForCity]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Cinsiyet + Doğum Tarihi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cinsiyet
          </label>
          <select
            value={editForm.gender}
            onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
            className={inputCls}
          >
            <option value="">Belirtilmemiş</option>
            <option value="MALE">Erkek</option>
            <option value="FEMALE">Kadın</option>
            <option value="PREFER_NOT_TO_SAY">Belirtmek İstemiyorum</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Doğum Tarihi
          </label>
          <input
            type="date"
            value={editForm.birthDate}
            onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
            className={inputCls}
          />
        </div>
      </div>

      {/* Sporlar */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Sporlarım (max 5)
        </label>
        <div className="flex flex-wrap gap-2">
          {sports.map((s) => {
            const selected = editForm.sportIds?.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  const cur = editForm.sportIds ?? [];
                  if (selected) {
                    setEditForm({ ...editForm, sportIds: cur.filter((id) => id !== s.id) });
                  } else if (cur.length < 5) {
                    setEditForm({ ...editForm, sportIds: [...cur, s.id] });
                  } else {
                    toast.error("En fazla 5 spor seçebilirsiniz");
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${
                  selected
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-emerald-400"
                }`}
              >
                {s.icon} {s.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Telefon */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Telefon
        </label>
        <input
          type="tel"
          value={editForm.phone}
          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
          className={inputCls}
          placeholder="05551234567"
        />
      </div>

      {/* Şifre */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Mevcut Şifre (değiştirmek için)
        </label>
        <input
          type="password"
          value={editForm.currentPassword}
          onChange={(e) => setEditForm({ ...editForm, currentPassword: e.target.value })}
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Yeni Şifre
        </label>
        <input
          type="password"
          value={editForm.newPassword}
          onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
          className={inputCls}
          placeholder="Min 8 karakter, büyük/küçük harf, rakam, özel karakter"
        />
      </div>

      {/* Sosyal Medya */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          Sosyal Medya Hesapları
        </label>
        <div className="grid grid-cols-1 gap-2">
          {socialPlatforms.map(({ key, placeholder, icon, iconClass }) => (
            <div key={key} className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] gap-2 items-center">
              <span
                className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full ${iconClass}`}
              >
                {icon}
              </span>
              <input
                type="text"
                value={(editForm as any)[key] ?? ""}
                onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                placeholder={placeholder}
              />
              <select
                value={editForm.socialLinksVisibility ?? "EVERYONE"}
                onChange={(e) => setEditForm({ ...editForm, socialLinksVisibility: e.target.value as "EVERYONE" | "FOLLOWERS" | "NOBODY" })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
              >
                {visibilityOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Not: Bu sürümde gizlilik seçimi tüm sosyal platformlar için ortak uygulanır.</p>
      </div>

      {/* Antrenör Bilgileri */}
      {isTrainer && (
        <div className="space-y-4 border border-blue-100 dark:border-blue-900/40 rounded-xl p-4 bg-blue-50/60 dark:bg-blue-950/20">
          <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">Antrenör Profili</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              value={editForm.trainerUniversity ?? ""}
              onChange={(e) => setEditForm({ ...editForm, trainerUniversity: e.target.value })}
              className={inputCls}
              placeholder="Üniversite"
            />
            <input
              type="text"
              value={editForm.trainerDepartment ?? ""}
              onChange={(e) => setEditForm({ ...editForm, trainerDepartment: e.target.value })}
              className={inputCls}
              placeholder="Bölüm"
            />
            <input
              type="text"
              value={editForm.trainerGymName ?? ""}
              onChange={(e) => setEditForm({ ...editForm, trainerGymName: e.target.value })}
              className={inputCls}
              placeholder="Salon / kulüp adı"
            />
            <input
              type="number"
              min={0}
              value={editForm.trainerExperienceYears ?? ""}
              onChange={(e) => setEditForm({ ...editForm, trainerExperienceYears: e.target.value })}
              className={inputCls}
              placeholder="Deneyim yılı"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Ders türleri</label>
            <div className="flex flex-wrap gap-2">
              {lessonTypeOptions.map((opt) => {
                const selected = (editForm.trainerLessonTypes ?? []).includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      const current = editForm.trainerLessonTypes ?? [];
                      setEditForm({
                        ...editForm,
                        trainerLessonTypes: selected ? current.filter((x) => x !== opt.id) : [...current, opt.id],
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${selected ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              value={editForm.trainerProvidesEquipment ?? ""}
              onChange={(e) => setEditForm({ ...editForm, trainerProvidesEquipment: e.target.value as "yes" | "no" | "" })}
              className={inputCls}
            >
              <option value="">Ekipman sağlama: Belirtilmemiş</option>
              <option value="yes">Ekipman sağlıyorum</option>
              <option value="no">Ekipman sağlamıyorum</option>
            </select>
            <input
              type="text"
              value={editForm.trainerCertNote ?? ""}
              onChange={(e) => setEditForm({ ...editForm, trainerCertNote: e.target.value })}
              className={inputCls}
              placeholder="Sertifika notu"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1.5">Branş deneyimi (yıl)</label>
            <div className="space-y-2">
              {(editForm.trainerSpecializations ?? []).map((sp, idx) => (
                <div key={`${sp.sportName}-${idx}`} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                  <input
                    type="text"
                    value={sp.sportName}
                    onChange={(e) => {
                      const next = [...(editForm.trainerSpecializations ?? [])];
                      next[idx] = { ...next[idx], sportName: e.target.value };
                      setEditForm({ ...editForm, trainerSpecializations: next });
                    }}
                    className={inputCls}
                    placeholder="Branş adı"
                  />
                  <input
                    type="number"
                    min={0}
                    value={sp.years}
                    onChange={(e) => {
                      const next = [...(editForm.trainerSpecializations ?? [])];
                      next[idx] = { ...next[idx], years: parseInt(e.target.value || "0", 10) || 0 };
                      setEditForm({ ...editForm, trainerSpecializations: next });
                    }}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...(editForm.trainerSpecializations ?? [])];
                      next.splice(idx, 1);
                      setEditForm({ ...editForm, trainerSpecializations: next });
                    }}
                    className="px-3 py-2 rounded-lg border border-red-300 text-red-600 text-xs font-semibold"
                  >
                    Sil
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setEditForm({
                  ...editForm,
                  trainerSpecializations: [...(editForm.trainerSpecializations ?? []), { sportName: "", years: 0 }],
                })}
                className="text-xs font-semibold text-blue-700 dark:text-blue-300 hover:underline"
              >
                + Branş ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Butonlar */}
      <div className="flex gap-2">
        <Button onClick={onSave} loading={saving}>
          Kaydet
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Vazgeç
        </Button>
      </div>
    </div>
  );
}
